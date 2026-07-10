import { and, desc, eq, gt, inArray, isNotNull, isNull, ne, sql } from 'drizzle-orm'
import { APP_CONFIG } from '@/config/app'
import { db } from '@/db'
import {
  adminAuditLogs,
  authUsers,
  emailDeliveries,
  ingestRuns,
  repoIssues,
  repoMetricSnapshots,
  repos,
  userAlerts,
  userCollectionItems,
  userCollections,
  userOnboardingProfiles,
  userPreferences,
  userRepoJournalEntries,
  userRepoStates,
  userSavedSearches,
} from '@/db/schema'
import {
  cleanOptionalText,
  cleanStringList,
  cleanText,
  normalizeNumber,
  normalizeSlugPart,
  parseNullableDate,
} from '@/lib/api/normalize'
import { createOpaqueToken } from '@/lib/auth'
import { sendEmail } from '@/lib/email'
import { renderEmail } from '@/lib/email-templates'
import { githubFetchJson } from '@/lib/github/client'
import { type RepoSearchParams, searchRepos, toGithubRepository } from '@/lib/repositories'
import { getContributionReadiness, NON_PROJECT_TOPICS } from '@/lib/repositories/contribution'

const COLLECTION_TEMPLATES = [
  {
    key: 'weekend',
    name: 'Weekend contributions',
    description: 'Small, approachable repositories for focused weekend work.',
    filters: { starterFriendlyOnly: true, activeOnly: true, minStars: 25 },
  },
  {
    key: 'first-pr',
    name: 'First PR targets',
    description: 'Beginner-friendly repositories with good-first-issue signals.',
    filters: { hasGoodFirstIssues: true, contributionReadyOnly: true },
  },
  {
    key: 'high-impact',
    name: 'High-impact OSS',
    description: 'Larger active projects with strong contribution readiness.',
    filters: { contributionReadyOnly: true, minStars: 1000, sort: 'contribution' },
  },
  {
    key: 'learning',
    name: 'Learning track',
    description: 'Repos that match your preferred languages and topics.',
    filters: { starterFriendlyOnly: true, sort: 'contribution' },
  },
] as const

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

function mapCollection(row: typeof userCollections.$inferSelect, itemCount = 0) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    visibility: row.visibility,
    itemCount,
    shareSlug: row.shareSlug,
    templateKey: row.templateKey,
    publishedAt: row.publishedAt?.toISOString() ?? null,
  }
}

function mapOnboarding(row?: typeof userOnboardingProfiles.$inferSelect | null) {
  return row
    ? {
        skillLevel: row.skillLevel,
        weeklyHours: row.weeklyHours,
        goals: row.goals,
        languages: row.languages,
        topics: row.topics,
        completedAt: row.completedAt?.toISOString() ?? null,
        updatedAt: row.updatedAt.toISOString(),
      }
    : {
        skillLevel: 'intermediate',
        weeklyHours: 4,
        goals: [],
        languages: [],
        topics: [],
        completedAt: null,
        updatedAt: null,
      }
}

function mapSavedSearch(row: typeof userSavedSearches.$inferSelect) {
  return {
    id: row.id,
    name: row.name,
    query: row.query,
    filters: row.filters,
    alertEnabled: row.alertEnabled,
    lastCheckedAt: row.lastCheckedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

function mapEmailDelivery(row: typeof emailDeliveries.$inferSelect) {
  return {
    id: row.id,
    email: row.email,
    type: row.type,
    subject: row.subject,
    provider: row.provider,
    status: row.status,
    error: row.error,
    sentAt: row.sentAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  }
}

function mapIssue(row: typeof repoIssues.$inferSelect, fullName?: string) {
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

async function findRepo(input: Record<string, unknown>) {
  const repoId = cleanText(input.repoId, 80)
  const fullName = cleanText(input.fullName, 180)
  const [repo] = await db
    .select()
    .from(repos)
    .where(repoId ? eq(repos.id, repoId) : eq(repos.fullName, fullName))
    .limit(1)

  if (!repo) throw new Error('Repository is not in the OpenDeck mirror.')
  return repo
}

function savedSearchParams(
  filters: Record<string, unknown>,
  query?: string | null,
): RepoSearchParams {
  return {
    query: query || undefined,
    language: cleanOptionalText(filters.language, 80) ?? undefined,
    topic: cleanOptionalText(filters.topic, 160) ?? undefined,
    minStars: filters.minStars === undefined ? undefined : normalizeNumber(filters.minStars),
    maxStars: filters.maxStars === undefined ? undefined : normalizeNumber(filters.maxStars),
    activeOnly: filters.activeOnly === true,
    contributionReadyOnly: filters.contributionReadyOnly !== false,
    starterFriendlyOnly: filters.starterFriendlyOnly === true,
    hasGoodFirstIssues:
      filters.hasGoodFirstIssues === true ||
      (filters.hasGoodFirstIssues === false && filters.hasGoodFirstIssuesSet === true)
        ? filters.hasGoodFirstIssues
        : undefined,
    sort:
      filters.sort === 'stars' ||
      filters.sort === 'forks' ||
      filters.sort === 'recent' ||
      filters.sort === 'updated' ||
      filters.sort === 'relevance'
        ? filters.sort
        : 'contribution',
    perPage: 12,
  }
}

function savedSearchFilters(filters: Record<string, unknown>) {
  const next: Record<string, unknown> = {
    language: cleanOptionalText(filters.language, 80),
    topic: cleanOptionalText(filters.topic, 160),
    minStars: normalizeNumber(filters.minStars, 0),
    activeOnly: filters.activeOnly === true,
    contributionReadyOnly: filters.contributionReadyOnly !== false,
    starterFriendlyOnly: filters.starterFriendlyOnly === true,
    sort: cleanOptionalText(filters.sort, 40) ?? 'contribution',
  }

  if (filters.maxStars !== undefined) next.maxStars = normalizeNumber(filters.maxStars)
  if (typeof filters.hasGoodFirstIssues === 'boolean') {
    next.hasGoodFirstIssues = filters.hasGoodFirstIssues
    next.hasGoodFirstIssuesSet = true
  }

  return next
}

export async function getAccountFeatureSummary(userId: string) {
  const [onboardingRows, savedSearches, deliveries] = await Promise.all([
    db
      .select()
      .from(userOnboardingProfiles)
      .where(eq(userOnboardingProfiles.userId, userId))
      .limit(1),
    db
      .select()
      .from(userSavedSearches)
      .where(eq(userSavedSearches.userId, userId))
      .orderBy(desc(userSavedSearches.updatedAt))
      .limit(30),
    db
      .select()
      .from(emailDeliveries)
      .where(eq(emailDeliveries.userId, userId))
      .orderBy(desc(emailDeliveries.createdAt))
      .limit(10),
  ])

  return {
    onboarding: mapOnboarding(onboardingRows[0]),
    savedSearches: savedSearches.map(mapSavedSearch),
    emailDeliveries: deliveries.map(mapEmailDelivery),
    collectionTemplates: COLLECTION_TEMPLATES,
  }
}

export async function saveOnboarding(userId: string, body: Record<string, unknown>) {
  const skillLevel =
    body.skillLevel === 'beginner' || body.skillLevel === 'advanced'
      ? body.skillLevel
      : 'intermediate'
  const weeklyHours = normalizeNumber(body.weeklyHours, 4, 80)
  const goals = cleanStringList(body.goals, 8)
  const languages = cleanStringList(body.languages, 12)
  const topics = cleanStringList(body.topics, 16)
  const now = new Date()

  await Promise.all([
    db
      .insert(userOnboardingProfiles)
      .values({
        userId,
        skillLevel,
        weeklyHours,
        goals,
        languages,
        topics,
        completedAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: userOnboardingProfiles.userId,
        set: {
          skillLevel,
          weeklyHours,
          goals,
          languages,
          topics,
          completedAt: now,
          updatedAt: now,
        },
      }),
    db
      .insert(userPreferences)
      .values({
        userId,
        defaultLanguage: languages[0] ?? null,
        preferredLanguages: languages,
        preferredTopics: topics,
        setupDifficulty: skillLevel === 'beginner' ? 'easy' : 'any',
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: userPreferences.userId,
        set: {
          defaultLanguage: languages[0] ?? null,
          preferredLanguages: languages,
          preferredTopics: topics,
          setupDifficulty: skillLevel === 'beginner' ? 'easy' : 'any',
          updatedAt: now,
        },
      }),
  ])

  const [saved] = await db
    .select()
    .from(userOnboardingProfiles)
    .where(eq(userOnboardingProfiles.userId, userId))
    .limit(1)

  return mapOnboarding(saved)
}

export async function saveSavedSearch(userId: string, body: Record<string, unknown>) {
  const id = cleanText(body.id, 80)
  const name = cleanText(body.name, 80)
  if (name.length < 2) throw new Error('Saved search name must be at least 2 characters.')

  const filters = typeof body.filters === 'object' && body.filters !== null ? body.filters : body
  const next = {
    name,
    query: cleanOptionalText(body.query, 180),
    filters: savedSearchFilters(filters as Record<string, unknown>),
    alertEnabled: body.alertEnabled !== false,
    updatedAt: new Date(),
  }

  if (id) {
    const [updated] = await db
      .update(userSavedSearches)
      .set(next)
      .where(and(eq(userSavedSearches.userId, userId), eq(userSavedSearches.id, id)))
      .returning()
    if (!updated) throw new Error('Saved search not found.')
    return mapSavedSearch(updated)
  }

  const [created] = await db
    .insert(userSavedSearches)
    .values({ userId, ...next })
    .returning()
  return mapSavedSearch(created)
}

export async function deleteSavedSearch(userId: string, id: unknown) {
  await db
    .delete(userSavedSearches)
    .where(and(eq(userSavedSearches.userId, userId), eq(userSavedSearches.id, cleanText(id, 80))))
  return { ok: true }
}

export async function previewSavedSearch(body: Record<string, unknown>) {
  const filters = typeof body.filters === 'object' && body.filters !== null ? body.filters : body
  const result = await searchRepos(
    savedSearchParams(
      savedSearchFilters(filters as Record<string, unknown>),
      cleanText(body.query, 180),
    ),
  )
  return { items: result.items.map(toGithubRepository), totalCount: result.totalCount }
}

export async function shareCollection(userId: string, body: Record<string, unknown>) {
  const id = cleanText(body.id, 80)
  const enabled = body.enabled !== false
  const [collection] = await db
    .select()
    .from(userCollections)
    .where(and(eq(userCollections.userId, userId), eq(userCollections.id, id)))
    .limit(1)
  if (!collection) throw new Error('Collection not found.')

  const shareSlug =
    collection.shareSlug ??
    `${normalizeSlugPart(collection.name) || 'collection'}-${createOpaqueToken(6).toLowerCase()}`
  const [updated] = await db
    .update(userCollections)
    .set({
      visibility: enabled ? 'shared' : 'private',
      shareSlug: enabled ? shareSlug : collection.shareSlug,
      publishedAt: enabled ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(and(eq(userCollections.userId, userId), eq(userCollections.id, id)))
    .returning()

  return mapCollection(updated)
}

export async function createCollectionFromTemplate(userId: string, key: unknown) {
  const template = COLLECTION_TEMPLATES.find((item) => item.key === key)
  if (!template) throw new Error('Collection template not found.')

  const [existing] = await db
    .select()
    .from(userCollections)
    .where(and(eq(userCollections.userId, userId), eq(userCollections.templateKey, template.key)))
    .limit(1)
  if (existing) return mapCollection(existing)

  const [created] = await db
    .insert(userCollections)
    .values({
      userId,
      name: template.name,
      description: template.description,
      templateKey: template.key,
    })
    .returning()
  return mapCollection(created)
}

export async function getCollectionDetail(userId: string, collectionId: unknown) {
  const [collection] = await db
    .select()
    .from(userCollections)
    .where(
      and(eq(userCollections.userId, userId), eq(userCollections.id, cleanText(collectionId, 80))),
    )
    .limit(1)
  if (!collection) throw new Error('Collection not found.')

  const items = await db
    .select({ repo: repos })
    .from(userCollectionItems)
    .innerJoin(repos, eq(userCollectionItems.repoId, repos.id))
    .where(eq(userCollectionItems.collectionId, collection.id))
    .orderBy(desc(userCollectionItems.addedAt))

  return {
    collection: mapCollection(collection, items.length),
    items: items.map((item) => toGithubRepository(item.repo)),
  }
}

export async function getPublicCollection(slug: string) {
  const [collection] = await db
    .select()
    .from(userCollections)
    .where(
      and(
        eq(userCollections.shareSlug, slug),
        eq(userCollections.visibility, 'shared'),
        isNotNull(userCollections.publishedAt),
      ),
    )
    .limit(1)
  if (!collection) return null

  const items = await db
    .select({ repo: repos })
    .from(userCollectionItems)
    .innerJoin(repos, eq(userCollectionItems.repoId, repos.id))
    .where(eq(userCollectionItems.collectionId, collection.id))
    .orderBy(desc(userCollectionItems.addedAt))

  return {
    collection: mapCollection(collection, items.length),
    items: items.map((item) => toGithubRepository(item.repo)),
  }
}

async function syncRepoIssues(repoId: string, fullName: string) {
  let data: GithubIssue[] = []
  try {
    const result = await githubFetchJson<GithubIssue[]>(
      `/repos/${fullName}/issues?state=open&per_page=30&sort=updated&direction=desc`,
      { retries: 0, timeoutMs: 5_000 },
    )
    data = Array.isArray(result.data) ? result.data.filter((issue) => !issue.pull_request) : []
  } catch {
    return []
  }

  const now = new Date()
  for (const issue of data) {
    await db
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
      })
  }

  return data
}

export async function getIssueRecommendations(userId: string) {
  const saved = await db
    .select({ repo: repos })
    .from(userRepoStates)
    .innerJoin(repos, eq(userRepoStates.repoId, repos.id))
    .where(and(eq(userRepoStates.userId, userId), isNotNull(userRepoStates.savedAt)))
    .orderBy(desc(userRepoStates.updatedAt))
    .limit(6)

  let sourceRepos = saved.map((row) => row.repo)
  if (sourceRepos.length === 0) {
    const prefs = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, userId))
      .limit(1)
    const recommended = await searchRepos({
      language: prefs[0]?.defaultLanguage ?? prefs[0]?.preferredLanguages[0],
      topic: prefs[0]?.preferredTopics.join(',') || undefined,
      contributionReadyOnly: true,
      hasGoodFirstIssues: true,
      perPage: 6,
      sort: 'contribution',
    })
    sourceRepos = recommended.items
  }

  await Promise.all(sourceRepos.map((repo) => syncRepoIssues(repo.id, repo.fullName)))

  const rows = await db
    .select({ issue: repoIssues, repo: repos })
    .from(repoIssues)
    .innerJoin(repos, eq(repoIssues.repoId, repos.id))
    .where(
      and(
        inArray(
          repoIssues.repoId,
          sourceRepos.map((repo) => repo.id),
        ),
        eq(repoIssues.state, 'open'),
      ),
    )
    .orderBy(desc(repoIssues.updatedAt))
    .limit(40)

  return rows
    .map((row) => mapIssue(row.issue, row.repo.fullName))
    .sort((a, b) => b.score - a.score || (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''))
    .slice(0, 18)
}

export async function getRepoJournal(userId: string, body: Record<string, unknown>) {
  const repo = await findRepo(body)
  const rows = await db
    .select()
    .from(userRepoJournalEntries)
    .where(
      and(eq(userRepoJournalEntries.userId, userId), eq(userRepoJournalEntries.repoId, repo.id)),
    )
    .orderBy(desc(userRepoJournalEntries.updatedAt))
    .limit(50)

  return {
    repo: toGithubRepository(repo),
    entries: rows.map((row) => ({
      id: row.id,
      issueNumber: row.issueNumber,
      status: row.status,
      body: row.body,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    })),
  }
}

export async function saveRepoJournal(userId: string, body: Record<string, unknown>) {
  const repo = await findRepo(body)
  const id = cleanText(body.id, 80)
  const entry = {
    issueNumber: body.issueNumber ? normalizeNumber(body.issueNumber, 0, 1_000_000) : null,
    status: cleanOptionalText(body.status, 80) ?? 'note',
    body: cleanText(body.body, 4000),
    updatedAt: new Date(),
  }
  if (!entry.body) throw new Error('Journal entry is required.')

  if (id) {
    const [updated] = await db
      .update(userRepoJournalEntries)
      .set(entry)
      .where(
        and(
          eq(userRepoJournalEntries.userId, userId),
          eq(userRepoJournalEntries.repoId, repo.id),
          eq(userRepoJournalEntries.id, id),
        ),
      )
      .returning()
    if (!updated) throw new Error('Journal entry not found.')
    return getRepoJournal(userId, { repoId: repo.id })
  }

  await db.insert(userRepoJournalEntries).values({ userId, repoId: repo.id, ...entry })
  return getRepoJournal(userId, { repoId: repo.id })
}

export async function deleteRepoJournal(userId: string, body: Record<string, unknown>) {
  await db
    .delete(userRepoJournalEntries)
    .where(
      and(
        eq(userRepoJournalEntries.userId, userId),
        eq(userRepoJournalEntries.id, cleanText(body.id, 80)),
      ),
    )
  return { ok: true }
}

export async function getRepoInsight(fullName: string) {
  const [repo] = await db.select().from(repos).where(eq(repos.fullName, fullName)).limit(1)
  if (!repo) return null

  const [snapshots, issues] = await Promise.all([
    db
      .select()
      .from(repoMetricSnapshots)
      .where(eq(repoMetricSnapshots.repoId, repo.id))
      .orderBy(desc(repoMetricSnapshots.capturedAt))
      .limit(30),
    db
      .select()
      .from(repoIssues)
      .where(eq(repoIssues.repoId, repo.id))
      .orderBy(desc(repoIssues.updatedAt))
      .limit(30),
  ])

  if (issues.length === 0) await syncRepoIssues(repo.id, repo.fullName)
  const refreshedIssues =
    issues.length > 0
      ? issues
      : await db
          .select()
          .from(repoIssues)
          .where(eq(repoIssues.repoId, repo.id))
          .orderBy(desc(repoIssues.updatedAt))
          .limit(30)

  const readiness = getContributionReadiness(repo)
  const packageSignals = [repo.readmeExcerpt, repo.description, repo.topics.join(' ')]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  const setupDifficulty =
    packageSignals.includes('docker') || packageSignals.includes('monorepo')
      ? 'advanced'
      : packageSignals.includes('quickstart') ||
          packageSignals.includes('getting started') ||
          repo.hasGoodFirstIssues
        ? 'easy'
        : 'medium'
  const activeIssues = refreshedIssues.filter((issue) => issue.state === 'open')
  const lowCommentIssues = activeIssues.filter((issue) => issue.comments <= 5).length
  const responsivenessScore = Math.min(
    100,
    Math.max(
      0,
      (repo.pushedAt && Date.now() - repo.pushedAt.getTime() < 90 * 24 * 60 * 60 * 1000 ? 35 : 10) +
        Math.min(activeIssues.length * 5, 25) +
        Math.min(lowCommentIssues * 6, 24) +
        (repo.contributors > 5 ? 16 : repo.contributors > 1 ? 8 : 0),
    ),
  )

  return {
    repo: toGithubRepository(repo),
    readiness,
    setupDifficulty,
    responsivenessScore,
    qualitySignals: {
      likelyResourceCollection: NON_PROJECT_TOPICS.some((topic) => repo.topics.includes(topic)),
      stale: !repo.pushedAt || Date.now() - repo.pushedAt.getTime() > 365 * 24 * 60 * 60 * 1000,
      archived: repo.isArchived,
      issueQueue: repo.openIssues,
      contributorCount: repo.contributors,
    },
    timeline: snapshots
      .map((snapshot) => ({
        stars: snapshot.stars,
        forks: snapshot.forks,
        openIssues: snapshot.openIssues,
        capturedAt: snapshot.capturedAt.toISOString(),
      }))
      .reverse(),
    issues: refreshedIssues.map((issue) => mapIssue(issue, repo.fullName)),
  }
}

export async function compareRepos(fullNames: string[]) {
  const names = fullNames
    .map((name) => cleanText(name, 180))
    .filter(Boolean)
    .slice(0, 4)
  if (names.length === 0) return []

  const rows = await db.select().from(repos).where(inArray(repos.fullName, names))
  return Promise.all(rows.map((repo) => getRepoInsight(repo.fullName)))
}

export async function checkSavedSearchAlerts(limit = 50) {
  const searches = await db
    .select()
    .from(userSavedSearches)
    .where(eq(userSavedSearches.alertEnabled, true))
    .orderBy(desc(userSavedSearches.updatedAt))
    .limit(limit)
  let created = 0

  for (const search of searches) {
    const result = await searchRepos(savedSearchParams(search.filters, search.query))
    const match = result.items[0]
    await db
      .update(userSavedSearches)
      .set({ lastCheckedAt: new Date(), lastMatchedRepoId: match?.id ?? search.lastMatchedRepoId })
      .where(eq(userSavedSearches.id, search.id))

    if (!match || match.id === search.lastMatchedRepoId) continue

    await db.insert(userAlerts).values({
      userId: search.userId,
      repoId: match.id,
      type: 'saved_search_match',
      message: `${match.fullName} matches saved search "${search.name}".`,
      metadata: { savedSearchId: search.id, fullName: match.fullName },
    })
    created += 1
  }

  return { scanned: searches.length, created }
}

export async function createPipelineReminders(limit = 500) {
  const staleDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const rows = await db
    .select({ state: userRepoStates, repo: repos })
    .from(userRepoStates)
    .innerJoin(repos, eq(userRepoStates.repoId, repos.id))
    .where(
      and(
        isNotNull(userRepoStates.savedAt),
        ne(userRepoStates.pipelineStage, 'interested'),
        ne(userRepoStates.pipelineStage, 'done'),
        sql`${userRepoStates.updatedAt} < ${staleDate}`,
      ),
    )
    .orderBy(desc(userRepoStates.updatedAt))
    .limit(limit)

  let created = 0
  const reminderCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  for (const row of rows) {
    const [existing] = await db
      .select({ id: userAlerts.id })
      .from(userAlerts)
      .where(
        and(
          eq(userAlerts.userId, row.state.userId),
          eq(userAlerts.repoId, row.repo.id),
          eq(userAlerts.type, 'pipeline_reminder'),
          gt(userAlerts.createdAt, reminderCutoff),
        ),
      )
      .limit(1)
    if (existing) continue

    await db.insert(userAlerts).values({
      userId: row.state.userId,
      repoId: row.repo.id,
      type: 'pipeline_reminder',
      message: `${row.repo.fullName} has been in ${row.state.pipelineStage.replaceAll('_', ' ')} for more than a week.`,
      metadata: { fullName: row.repo.fullName, stage: row.state.pipelineStage },
    })
    created += 1
  }

  return { scanned: rows.length, created }
}

export async function sendDueEmailDigests(limit = 100) {
  const rows = await db
    .select({ user: authUsers, prefs: userPreferences })
    .from(userPreferences)
    .innerJoin(authUsers, eq(userPreferences.userId, authUsers.id))
    .where(
      and(
        eq(userPreferences.emailDigestEnabled, true),
        ne(userPreferences.digestFrequency, 'off'),
        eq(authUsers.status, 'active'),
      ),
    )
    .limit(limit)
  let sent = 0
  let skipped = 0

  for (const row of rows) {
    if (row.prefs.digestFrequency === 'weekly' && new Date().getUTCDay() !== row.prefs.digestDay) {
      skipped += 1
      continue
    }

    const [lastDigest] = await db
      .select()
      .from(emailDeliveries)
      .where(and(eq(emailDeliveries.userId, row.user.id), eq(emailDeliveries.type, 'digest')))
      .orderBy(desc(emailDeliveries.createdAt))
      .limit(1)
    const minHours =
      row.prefs.digestFrequency === 'daily'
        ? 20
        : row.prefs.digestFrequency === 'monthly'
          ? 600
          : 144
    if (lastDigest && Date.now() - lastDigest.createdAt.getTime() < minHours * 60 * 60 * 1000) {
      skipped += 1
      continue
    }

    const [saved, alerts, recommendations] = await Promise.all([
      db
        .select({ repo: repos })
        .from(userRepoStates)
        .innerJoin(repos, eq(userRepoStates.repoId, repos.id))
        .where(and(eq(userRepoStates.userId, row.user.id), isNotNull(userRepoStates.savedAt)))
        .orderBy(desc(userRepoStates.savedAt))
        .limit(5),
      db
        .select()
        .from(userAlerts)
        .where(and(eq(userAlerts.userId, row.user.id), isNull(userAlerts.readAt)))
        .orderBy(desc(userAlerts.createdAt))
        .limit(5),
      searchRepos({
        language: row.prefs.defaultLanguage ?? row.prefs.preferredLanguages[0],
        topic: row.prefs.preferredTopics.join(',') || undefined,
        contributionReadyOnly: true,
        hasGoodFirstIssues: row.prefs.goodFirstAlertsEnabled ? true : undefined,
        perPage: 5,
        sort: row.prefs.defaultSort as RepoSearchParams['sort'],
      }),
    ])

    const savedNames = saved.map((item) => item.repo.fullName).join(', ') || 'None yet'
    const recommendedNames =
      recommendations.items.map((repo) => repo.fullName).join(', ') || 'None yet'

    const lines = [
      `Hi ${row.user.name},`,
      '',
      'Your OpenDeck digest is ready.',
      '',
      `Unread alerts: ${alerts.length}`,
      `Saved repos sampled: ${savedNames}`,
      `Recommended: ${recommendedNames}`,
    ]

    const result = await sendEmail({
      userId: row.user.id,
      to: row.user.email,
      type: 'digest',
      subject: 'Your OpenDeck contribution digest',
      text: lines.join('\n'),
      html: renderEmail({
        preview: 'Your OpenDeck contribution digest',
        eyebrow: 'contribution digest',
        heading: `Your digest is ready, ${row.user.name}.`,
        paragraphs: ['A quick snapshot of what is waiting for you on OpenDeck.'],
        rowsLabel: 'this week',
        rows: [
          { label: 'unread alerts', value: String(alerts.length) },
          { label: 'saved repos', value: savedNames },
          { label: 'recommended', value: recommendedNames },
        ],
        button: { label: 'open opendeck', href: `${APP_CONFIG.url}/dashboard` },
        footer: `${row.prefs.digestFrequency} digest · automated notification`,
      }),
      metadata: { frequency: row.prefs.digestFrequency },
    })

    if (result.status === 'sent') sent += 1
    else skipped += 1
  }

  return { scanned: rows.length, sent, skipped }
}

export async function listAdminIngestionDashboard() {
  const [
    repoCount,
    userCount,
    savedSearchCount,
    sharedCollectionCount,
    emailStats,
    latestRuns,
    auditLogs,
  ] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(repos),
    db.select({ count: sql<number>`count(*)::int` }).from(authUsers),
    db.select({ count: sql<number>`count(*)::int` }).from(userSavedSearches),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(userCollections)
      .where(eq(userCollections.visibility, 'shared')),
    db
      .select({ status: emailDeliveries.status, count: sql<number>`count(*)::int` })
      .from(emailDeliveries)
      .groupBy(emailDeliveries.status),
    db.select().from(ingestRuns).orderBy(desc(ingestRuns.startedAt)).limit(12),
    db.select().from(adminAuditLogs).orderBy(desc(adminAuditLogs.createdAt)).limit(20),
  ])

  return {
    stats: {
      repos: repoCount[0]?.count ?? 0,
      users: userCount[0]?.count ?? 0,
      savedSearches: savedSearchCount[0]?.count ?? 0,
      sharedCollections: sharedCollectionCount[0]?.count ?? 0,
      emailDeliveries: Object.fromEntries(emailStats.map((row) => [row.status, row.count])),
    },
    latestRuns: latestRuns.map((run) => ({
      id: run.id,
      kind: run.kind,
      status: run.status,
      tokensUsed: run.tokensUsed,
      rateLimitRemaining: run.rateLimitRemaining,
      startedAt: run.startedAt.toISOString(),
      finishedAt: run.finishedAt?.toISOString() ?? null,
      error: run.error,
      metadata: run.metadata,
    })),
    auditLogs: auditLogs.map((log) => ({
      id: log.id,
      adminId: log.adminId,
      action: log.action,
      targetType: log.targetType,
      targetId: log.targetId,
      metadata: log.metadata,
      createdAt: log.createdAt.toISOString(),
    })),
  }
}

export async function recordAdminAudit(
  adminId: string,
  action: string,
  targetType: string,
  targetId?: string | null,
  metadata: Record<string, unknown> = {},
) {
  await db.insert(adminAuditLogs).values({
    adminId,
    action,
    targetType,
    targetId,
    metadata,
  })

  return { ok: true }
}
