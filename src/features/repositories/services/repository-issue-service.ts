import { and, asc, eq, lt } from 'drizzle-orm'
import { db } from '@/db/client'
import { repoIssues, repos, repositorySyncStates } from '@/db/schema'
import { safeErrorContext } from '@/lib/api/errors'
import { isRecord, parseNullableDate } from '@/lib/api/input-normalization'
import { githubFetchJson } from '@/lib/github/client'
import { withJobLease } from '@/lib/jobs/job-lease-service'

const REPOSITORY_ISSUE_SYNC_TTL_MS = 15 * 60 * 1000
const REPOSITORY_ISSUE_LEASE_MS = 2 * 60 * 1000
const GITHUB_ISSUE_PAGE_SIZE = 100
const ISSUE_PAGES_PER_BATCH = 5
const ISSUE_PAGE_OVERLAP = 1
const DEFAULT_BACKGROUND_REPOSITORY_LIMIT = 2
const MAX_BACKGROUND_REPOSITORY_LIMIT = 10

type GithubIssue = {
  id: number
  number: number
  title: string
  state: 'open' | 'closed'
  html_url: string
  comments?: number
  user?: { login?: string }
  labels?: Array<{ name?: string } | string>
  created_at?: string
  updated_at?: string
  closed_at?: string | null
  pull_request?: unknown
}

function parseGithubIssue(value: unknown): GithubIssue | null {
  if (!isRecord(value)) return null
  if (
    typeof value.id !== 'number' ||
    !Number.isSafeInteger(value.id) ||
    typeof value.number !== 'number' ||
    !Number.isSafeInteger(value.number) ||
    typeof value.title !== 'string' ||
    (value.state !== 'open' && value.state !== 'closed') ||
    typeof value.html_url !== 'string' ||
    !value.html_url.startsWith('https://github.com/')
  ) {
    return null
  }

  const user =
    isRecord(value.user) && typeof value.user.login === 'string'
      ? { login: value.user.login }
      : undefined
  const labels: Array<string | { name?: string }> = []
  if (Array.isArray(value.labels)) {
    for (const label of value.labels) {
      if (typeof label === 'string') labels.push(label)
      else if (isRecord(label) && typeof label.name === 'string') labels.push({ name: label.name })
    }
  }

  return {
    id: value.id,
    number: value.number,
    title: value.title.slice(0, 1000),
    state: value.state,
    html_url: value.html_url,
    comments:
      typeof value.comments === 'number' && Number.isSafeInteger(value.comments)
        ? Math.max(value.comments, 0)
        : 0,
    user,
    labels,
    created_at: typeof value.created_at === 'string' ? value.created_at : undefined,
    updated_at: typeof value.updated_at === 'string' ? value.updated_at : undefined,
    closed_at:
      typeof value.closed_at === 'string' || value.closed_at === null ? value.closed_at : undefined,
    pull_request: value.pull_request,
  }
}

export function nextRepositoryIssueSyncPage(
  startPage: number,
  pagesFetched: number,
  complete: boolean,
) {
  if (complete) return 1
  if (!Number.isSafeInteger(startPage) || startPage < 1) return 1
  if (!Number.isSafeInteger(pagesFetched) || pagesFetched < 1) return startPage
  return Math.max(startPage + pagesFetched - ISSUE_PAGE_OVERLAP, 1)
}

export function mapRepositoryIssue(row: typeof repoIssues.$inferSelect, fullName?: string) {
  const labels = row.labels ?? []
  const lowerLabels = labels.map((label) => label.toLowerCase())
  const updatedDays =
    row.updatedAt === null
      ? 999
      : Math.floor((Date.now() - row.updatedAt.getTime()) / (24 * 60 * 60 * 1000))
  const score =
    (lowerLabels.some((label) => label.includes('good first')) ? 40 : 0) +
    (lowerLabels.some((label) => label.includes('help wanted')) ? 25 : 0) +
    (row.comments <= 5 ? 15 : 0) +
    (updatedDays <= 14 ? 15 : updatedDays <= 60 ? 8 : 0) +
    (fullName ? 5 : 0)

  return {
    id: row.id,
    repoId: row.repoId,
    fullName,
    number: row.number,
    title: row.title,
    state: row.state,
    htmlUrl: row.htmlUrl,
    labels,
    comments: row.comments,
    author: row.author,
    createdAt: row.createdAt?.toISOString() ?? null,
    updatedAt: row.updatedAt?.toISOString() ?? null,
    score,
  }
}

function issueLabels(labels: GithubIssue['labels']) {
  return (labels ?? [])
    .map((label) => (typeof label === 'string' ? label : label.name))
    .filter((label): label is string => Boolean(label))
}

type RepositoryIssueSyncResult = {
  issues: GithubIssue[]
  advanced: boolean
  complete: boolean
}

async function performRepositoryIssueSync(
  repoId: string,
  fullName: string,
): Promise<RepositoryIssueSyncResult> {
  const [syncState] = await db
    .select({
      issuesFetchedAt: repositorySyncStates.issuesFetchedAt,
      issuesComplete: repositorySyncStates.issuesComplete,
      issuesNextPage: repositorySyncStates.issuesNextPage,
      issuesSyncStartedAt: repositorySyncStates.issuesSyncStartedAt,
    })
    .from(repositorySyncStates)
    .where(eq(repositorySyncStates.repoId, repoId))
    .limit(1)
  if (
    syncState?.issuesComplete &&
    Date.now() - syncState.issuesFetchedAt.getTime() < REPOSITORY_ISSUE_SYNC_TTL_MS
  ) {
    return { issues: [], advanced: false, complete: true }
  }

  const continuing = syncState?.issuesComplete === false && syncState.issuesSyncStartedAt !== null
  const startPage = continuing ? Math.max(syncState.issuesNextPage, 1) : 1
  const syncStartedAt =
    continuing && syncState.issuesSyncStartedAt ? syncState.issuesSyncStartedAt : new Date()
  const data: GithubIssue[] = []
  let completeOpenIssueList = false
  let pagesFetched = 0
  try {
    for (let offset = 0; offset < ISSUE_PAGES_PER_BATCH; offset += 1) {
      const page = startPage + offset
      const result = await githubFetchJson(
        `/repos/${fullName}/issues?state=open&per_page=${GITHUB_ISSUE_PAGE_SIZE}&sort=created&direction=asc&page=${page}`,
        { retries: 0, timeoutMs: 5_000 },
      )
      if (!Array.isArray(result.data)) throw new Error('GitHub returned an invalid issue list.')
      pagesFetched += 1

      const pageIssues: GithubIssue[] = []
      for (const value of result.data) {
        if (isRecord(value) && value.pull_request !== undefined) continue
        const issue = parseGithubIssue(value)
        if (!issue) throw new Error('GitHub returned an invalid issue record.')
        pageIssues.push(issue)
      }
      data.push(...pageIssues)
      if (result.data.length < GITHUB_ISSUE_PAGE_SIZE) {
        completeOpenIssueList = true
        break
      }
    }
  } catch (error) {
    console.error('GitHub issue synchronization failed', safeErrorContext(error))
    return { issues: [], advanced: false, complete: false }
  }

  const now = new Date()
  const nextPage = nextRepositoryIssueSyncPage(startPage, pagesFetched, completeOpenIssueList)
  const issueWrites = data.map((issue) =>
    db
      .insert(repoIssues)
      .values({
        repoId,
        githubIssueId: issue.id,
        number: issue.number,
        title: issue.title,
        state: issue.state,
        htmlUrl: issue.html_url,
        labels: issueLabels(issue.labels),
        comments: issue.comments ?? 0,
        author: issue.user?.login ?? null,
        createdAt: parseNullableDate(issue.created_at),
        updatedAt: parseNullableDate(issue.updated_at),
        closedAt: parseNullableDate(issue.closed_at),
        lastFetchedAt: syncStartedAt,
      })
      .onConflictDoUpdate({
        target: [repoIssues.repoId, repoIssues.number],
        set: {
          title: issue.title,
          state: issue.state,
          htmlUrl: issue.html_url,
          labels: issueLabels(issue.labels),
          comments: issue.comments ?? 0,
          author: issue.user?.login ?? null,
          updatedAt: parseNullableDate(issue.updated_at),
          closedAt: parseNullableDate(issue.closed_at),
          lastFetchedAt: syncStartedAt,
        },
      }),
  )
  const syncStateWrite = db
    .insert(repositorySyncStates)
    .values({
      repoId,
      issuesFetchedAt: now,
      issuesComplete: completeOpenIssueList,
      issuesNextPage: nextPage,
      issuesSyncStartedAt: completeOpenIssueList ? null : syncStartedAt,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: repositorySyncStates.repoId,
      set: {
        issuesFetchedAt: now,
        issuesComplete: completeOpenIssueList,
        issuesNextPage: nextPage,
        issuesSyncStartedAt: completeOpenIssueList ? null : syncStartedAt,
        updatedAt: now,
      },
    })
  const writes = completeOpenIssueList
    ? [
        ...issueWrites,
        db
          .update(repoIssues)
          .set({ state: 'closed' })
          .where(
            and(
              eq(repoIssues.repoId, repoId),
              eq(repoIssues.state, 'open'),
              lt(repoIssues.lastFetchedAt, syncStartedAt),
            ),
          ),
        syncStateWrite,
      ]
    : [...issueWrites, syncStateWrite]
  const [firstWrite, ...remainingWrites] = writes
  await db.batch([firstWrite, ...remainingWrites])

  return { issues: data, advanced: true, complete: completeOpenIssueList }
}

async function runRepositoryIssueSync(repoId: string, fullName: string) {
  return withJobLease(`repository-issues:${repoId}`, REPOSITORY_ISSUE_LEASE_MS, () =>
    performRepositoryIssueSync(repoId, fullName),
  )
}

export async function syncRepositoryIssues(repoId: string, fullName: string) {
  const execution = await runRepositoryIssueSync(repoId, fullName)
  return execution.acquired ? execution.value.issues : []
}

export async function continueIncompleteRepositoryIssueSyncs(
  limit = DEFAULT_BACKGROUND_REPOSITORY_LIMIT,
) {
  const boundedLimit = Math.min(
    Math.max(Number.isSafeInteger(limit) ? limit : DEFAULT_BACKGROUND_REPOSITORY_LIMIT, 1),
    MAX_BACKGROUND_REPOSITORY_LIMIT,
  )
  const pending = await db
    .select({ repoId: repositorySyncStates.repoId, fullName: repos.fullName })
    .from(repositorySyncStates)
    .innerJoin(repos, eq(repos.id, repositorySyncStates.repoId))
    .where(eq(repositorySyncStates.issuesComplete, false))
    .orderBy(asc(repositorySyncStates.updatedAt))
    .limit(boundedLimit)

  let advanced = 0
  let completed = 0
  let failed = 0
  let alreadyRunning = 0
  for (const repository of pending) {
    try {
      const execution = await runRepositoryIssueSync(repository.repoId, repository.fullName)
      if (!execution.acquired) {
        alreadyRunning += 1
        continue
      }
      if (execution.value.advanced) advanced += 1
      else if (!execution.value.complete) failed += 1
      if (execution.value.complete) completed += 1
    } catch (error) {
      failed += 1
      console.error('Background repository issue synchronization failed', safeErrorContext(error))
    }
  }

  return { attempted: pending.length, advanced, completed, failed, alreadyRunning }
}
