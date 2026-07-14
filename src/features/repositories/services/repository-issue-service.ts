import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { repoIssues, repositorySyncStates } from '@/db/schema'
import { isRecord, parseNullableDate } from '@/lib/api/input-normalization'
import { githubFetchJson } from '@/lib/github/client'
import { withJobLease } from '@/lib/jobs/job-lease-service'

const REPOSITORY_ISSUE_SYNC_TTL_MS = 15 * 60 * 1000
const REPOSITORY_ISSUE_LEASE_MS = 2 * 60 * 1000

type GithubIssue = {
  id: number
  number: number
  title: string
  state: string
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
    typeof value.state !== 'string' ||
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

async function performRepositoryIssueSync(repoId: string, fullName: string) {
  const [recentlySynced] = await db
    .select({ issuesFetchedAt: repositorySyncStates.issuesFetchedAt })
    .from(repositorySyncStates)
    .where(eq(repositorySyncStates.repoId, repoId))
    .limit(1)
  if (
    recentlySynced &&
    Date.now() - recentlySynced.issuesFetchedAt.getTime() < REPOSITORY_ISSUE_SYNC_TTL_MS
  ) {
    return []
  }

  const data: GithubIssue[] = []
  let completeOpenIssueList = false
  try {
    for (let page = 1; page <= 5; page += 1) {
      const result = await githubFetchJson(
        `/repos/${fullName}/issues?state=open&per_page=100&sort=updated&direction=desc&page=${page}`,
        { retries: 0, timeoutMs: 5_000 },
      )
      if (!Array.isArray(result.data)) throw new Error('GitHub returned an invalid issue list.')

      const pageIssues: GithubIssue[] = []
      for (const value of result.data) {
        if (isRecord(value) && value.pull_request !== undefined) continue
        const issue = parseGithubIssue(value)
        if (!issue) throw new Error('GitHub returned an invalid issue record.')
        pageIssues.push(issue)
      }
      data.push(...pageIssues)
      if (result.data.length < 100) {
        completeOpenIssueList = true
        break
      }
    }
  } catch (error) {
    console.error('GitHub issue synchronization failed', error)
    return []
  }

  const now = new Date()
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
        lastFetchedAt: now,
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
          lastFetchedAt: now,
        },
      }),
  )
  const syncStateWrite = db
    .insert(repositorySyncStates)
    .values({
      repoId,
      issuesFetchedAt: now,
      issuesComplete: completeOpenIssueList,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: repositorySyncStates.repoId,
      set: {
        issuesFetchedAt: now,
        issuesComplete: completeOpenIssueList,
        updatedAt: now,
      },
    })
  const writes = completeOpenIssueList
    ? [
        db
          .update(repoIssues)
          .set({ state: 'closed', lastFetchedAt: now })
          .where(eq(repoIssues.repoId, repoId)),
        ...issueWrites,
        syncStateWrite,
      ]
    : [...issueWrites, syncStateWrite]
  const [firstWrite, ...remainingWrites] = writes
  await db.batch([firstWrite, ...remainingWrites])

  return data
}

export async function syncRepositoryIssues(repoId: string, fullName: string) {
  const execution = await withJobLease(
    `repository-issues:${repoId}`,
    REPOSITORY_ISSUE_LEASE_MS,
    () => performRepositoryIssueSync(repoId, fullName),
  )
  return execution.acquired ? execution.value : []
}
