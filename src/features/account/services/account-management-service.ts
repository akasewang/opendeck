import { and, desc, eq, gt, inArray, isNotNull, isNull, ne, or, sql } from 'drizzle-orm'
import type { NextRequest } from 'next/server'
import { db } from '@/db/client'
import {
  authSessions,
  authUsers,
  repos,
  userAlerts,
  userCollectionItems,
  userCollections,
  userFollows,
  userPreferences,
  userRecentViews,
  userRepoStates,
} from '@/db/schema'
import {
  ACCOUNT_DIGEST_FREQUENCIES,
  ACCOUNT_PIPELINE_STAGE_IDS,
  type AccountDigestFrequency,
  type AccountPipelineStage,
} from '@/features/account/constants/account-options'
import { ensureAccountDefaults } from '@/features/account/services/account-defaults-service'
import { getAccountFeatureSummary } from '@/features/account/services/account-workspace-service'
import { deleteUserPreservingActiveAdmin } from '@/features/auth/services/admin-role-service'
import {
  hashSessionToken,
  isValidEmail,
  normalizeEmail,
  normalizeName,
  SESSION_COOKIE,
  toPublicUser,
} from '@/features/auth/services/authentication-service'
import type { AuthUser } from '@/features/auth/types/authentication'
import {
  type RepoWithCurated,
  searchRepos,
  toGithubRepository,
} from '@/features/repositories/services/repository-query-service'
import {
  getSetupDifficulty,
  looksLikeResourceCollection,
} from '@/features/repositories/services/contribution-readiness'
import type { RepoSearchParams } from '@/features/repositories/types/repository-query'
import {
  cleanOptionalText,
  cleanStringList,
  cleanText,
  cleanUuid,
  isRecord,
  normalizeNumber,
  parseIntegerValue,
} from '@/lib/api/input-normalization'
import {
  GITHUB_OWNER_PATTERN,
  REPOSITORY_FULL_NAME_PATTERN,
} from '@/features/repositories/constants/repository-validation'

type RepoSort = NonNullable<RepoSearchParams['sort']>

const SORTS: readonly RepoSort[] = [
  'relevance',
  'stars',
  'forks',
  'recent',
  'updated',
  'contribution',
]

type RepoInput = {
  repoId?: unknown
  fullName?: unknown
}

function normalizePipelineStage(value: unknown): AccountPipelineStage {
  const stage = ACCOUNT_PIPELINE_STAGE_IDS.find((candidate) => candidate === value)
  if (!stage) throw new Error('Invalid pipeline stage.')
  return stage
}

function normalizeDigestFrequency(value: unknown): AccountDigestFrequency {
  return ACCOUNT_DIGEST_FREQUENCIES.find((frequency) => frequency === value) ?? 'weekly'
}

function normalizeSort(value: unknown): RepoSort {
  return SORTS.find((sort) => sort === value) ?? 'contribution'
}

function normalizeBoolean(value: unknown, fallback: boolean) {
  return typeof value === 'boolean' ? value : fallback
}

function normalizeDigestDay(value: unknown) {
  const day = normalizeNumber(value, 1, 6)
  return Math.min(Math.max(day, 0), 6)
}

function normalizeTargetType(value: unknown) {
  if (value === undefined || value === null || value === '' || value === 'repo') return 'repo'
  if (value === 'organization') return 'organization'
  throw new Error('Invalid follow target type.')
}

function normalizeTargetKey(value: unknown) {
  return cleanText(value, 180)
}

function validateTargetKey(targetType: 'repo' | 'organization', targetKey: string) {
  const valid =
    targetType === 'repo'
      ? REPOSITORY_FULL_NAME_PATTERN.test(targetKey)
      : GITHUB_OWNER_PATTERN.test(targetKey)
  if (!valid) throw new Error(`Invalid ${targetType} follow target.`)
}

function mapSession(row: typeof authSessions.$inferSelect, currentTokenHash?: string) {
  return {
    id: row.id,
    userAgent: row.userAgent,
    ipAddress: row.ipAddress,
    createdAt: row.createdAt.toISOString(),
    lastSeenAt: row.lastSeenAt.toISOString(),
    expiresAt: row.expiresAt.toISOString(),
    revokedAt: row.revokedAt?.toISOString() ?? null,
    current: currentTokenHash ? row.tokenHash === currentTokenHash : false,
  }
}

function mapRepoState(state?: typeof userRepoStates.$inferSelect | null) {
  return state
    ? {
        savedAt: state.savedAt?.toISOString() ?? null,
        hiddenAt: state.hiddenAt?.toISOString() ?? null,
        dismissedAt: state.dismissedAt?.toISOString() ?? null,
        reviewedAt: state.reviewedAt?.toISOString() ?? null,
        pipelineStage: state.pipelineStage,
        note: state.note,
        alertEnabled: state.alertEnabled,
        updatedAt: state.updatedAt.toISOString(),
      }
    : {
        savedAt: null,
        hiddenAt: null,
        dismissedAt: null,
        reviewedAt: null,
        pipelineStage: 'interested',
        note: null,
        alertEnabled: true,
        updatedAt: null,
      }
}

function mapCollection(row: typeof userCollections.$inferSelect, itemCount = 0) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    visibility: row.visibility,
    shareSlug: row.shareSlug,
    templateKey: row.templateKey,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    itemCount,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

function mapFollow(row: typeof userFollows.$inferSelect) {
  return {
    id: row.id,
    targetType: row.targetType,
    targetKey: row.targetKey,
    alertEnabled: row.alertEnabled,
    createdAt: row.createdAt.toISOString(),
  }
}

function mapAlert(row: typeof userAlerts.$inferSelect) {
  return {
    id: row.id,
    type: row.type,
    message: row.message,
    readAt: row.readAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    metadata: row.metadata,
  }
}

async function getPreferences(userId: string) {
  await db.insert(userPreferences).values({ userId }).onConflictDoNothing()
  const [prefs] = await db.select().from(userPreferences).where(eq(userPreferences.userId, userId))
  return prefs
}

type AccountPreferences = Awaited<ReturnType<typeof getPreferences>>

const RECOMMENDATIONS_PAGE_SIZE = 24

async function getBlockedRepoIds(userId: string) {
  const hiddenDismissed = await db
    .select({ repoId: userRepoStates.repoId })
    .from(userRepoStates)
    .where(
      and(
        eq(userRepoStates.userId, userId),
        sql`(${userRepoStates.hiddenAt} is not null or ${userRepoStates.dismissedAt} is not null)`,
      ),
    )

  return new Set(hiddenDismissed.map((row) => row.repoId))
}

function filterRecommendations(
  items: RepoWithCurated[],
  prefs: AccountPreferences,
  blockedRepoIds: Set<string>,
) {
  return items.filter((repo) => {
    if (blockedRepoIds.has(repo.id)) return false
    if (prefs.excludeArchived && repo.isArchived) return false
    if (prefs.excludedLanguages.includes(repo.language ?? '')) return false
    if (repo.topics.some((topic) => prefs.excludedTopics.includes(topic))) return false
    if (!prefs.includeLowIssueCount && repo.openIssues < 5) return false
    if (prefs.excludeResourceLists && looksLikeResourceCollection(repo)) return false
    if (
      prefs.excludeLowActivity &&
      (!repo.pushedAt || Date.now() - repo.pushedAt.getTime() > 90 * 24 * 60 * 60 * 1000)
    ) {
      return false
    }
    if (prefs.setupDifficulty !== 'any' && getSetupDifficulty(repo) !== prefs.setupDifficulty) {
      return false
    }
    return true
  })
}

async function fetchRecommendationsPage(
  prefs: AccountPreferences,
  blockedRepoIds: Set<string>,
  page: number,
) {
  const result = await searchRepos({
    language: prefs.defaultLanguage ?? prefs.preferredLanguages[0],
    topic: prefs.preferredTopics.join(',') || undefined,
    minStars: prefs.minStars,
    activeOnly: true,
    contributionReadyOnly: true,
    hasGoodFirstIssues: prefs.goodFirstAlertsEnabled ? true : undefined,
    sort: normalizeSort(prefs.defaultSort),
    page,
    perPage: RECOMMENDATIONS_PAGE_SIZE,
  })

  return {
    items: filterRecommendations(result.items, prefs, blockedRepoIds).map(toGithubRepository),
    hasMore: page * RECOMMENDATIONS_PAGE_SIZE < result.totalCount,
  }
}

export async function getRecommendationsPage(userId: string, page: number) {
  const prefs = await getPreferences(userId)
  const blockedRepoIds = await getBlockedRepoIds(userId)
  return fetchRecommendationsPage(prefs, blockedRepoIds, page)
}

async function findRepo(input: RepoInput) {
  const repoId = cleanUuid(input.repoId)
  const fullName = cleanText(input.fullName, 180)
  if (input.repoId && !repoId) throw new Error('Invalid repository id.')
  if (!repoId && !REPOSITORY_FULL_NAME_PATTERN.test(fullName)) {
    throw new Error('Invalid repository name.')
  }

  const [repo] = await db
    .select()
    .from(repos)
    .where(repoId ? eq(repos.id, repoId) : eq(repos.fullName, fullName))
    .limit(1)

  if (!repo) throw new Error('Repository is not in the OpenDeck mirror.')
  return repo
}

async function collectionCounts(userId: string) {
  const rows = await db
    .select({
      collectionId: userCollections.id,
      count: sql<number>`count(${userCollectionItems.id})::int`,
    })
    .from(userCollections)
    .leftJoin(userCollectionItems, eq(userCollectionItems.collectionId, userCollections.id))
    .where(eq(userCollections.userId, userId))
    .groupBy(userCollections.id)

  return new Map(rows.map((row) => [row.collectionId, row.count]))
}

async function createGoodFirstAlert(userId: string, repoId: string, fullName: string) {
  const [existing] = await db
    .select({ id: userAlerts.id })
    .from(userAlerts)
    .where(
      and(
        eq(userAlerts.userId, userId),
        eq(userAlerts.repoId, repoId),
        eq(userAlerts.type, 'good_first_issue'),
      ),
    )
    .limit(1)

  if (existing) return

  await db.insert(userAlerts).values({
    userId,
    repoId,
    type: 'good_first_issue',
    message: `${fullName} has good-first-issue signals enabled.`,
    metadata: { fullName },
  })
}

async function savedRows(userId: string, limit = 40) {
  return db
    .select({ state: userRepoStates, repo: repos })
    .from(userRepoStates)
    .innerJoin(repos, eq(userRepoStates.repoId, repos.id))
    .where(and(eq(userRepoStates.userId, userId), isNotNull(userRepoStates.savedAt)))
    .orderBy(desc(userRepoStates.savedAt))
    .limit(limit)
}

function activePipelineCondition(userId: string) {
  return and(
    eq(userRepoStates.userId, userId),
    isNull(userRepoStates.hiddenAt),
    isNull(userRepoStates.dismissedAt),
    or(
      isNotNull(userRepoStates.savedAt),
      isNotNull(userRepoStates.reviewedAt),
      isNotNull(userRepoStates.note),
      sql`${userRepoStates.pipelineStage} <> 'interested'`,
    ),
  )
}

export async function getAccountOverview(user: AuthUser, currentToken?: string) {
  await ensureAccountDefaults(user.id)
  const prefs = await getPreferences(user.id)
  const counts = await collectionCounts(user.id)
  const currentTokenHash = currentToken ? hashSessionToken(currentToken) : undefined

  const [
    collections,
    saved,
    pipeline,
    follows,
    recent,
    alerts,
    sessions,
    blockedRepoIds,
    savedCount,
    pipelineCount,
    followCount,
    unreadAlertCount,
    featureSummary,
  ] = await Promise.all([
    db
      .select()
      .from(userCollections)
      .where(eq(userCollections.userId, user.id))
      .orderBy(desc(userCollections.updatedAt)),
    savedRows(user.id),
    db
      .select({ state: userRepoStates, repo: repos })
      .from(userRepoStates)
      .innerJoin(repos, eq(userRepoStates.repoId, repos.id))
      .where(activePipelineCondition(user.id))
      .orderBy(desc(userRepoStates.updatedAt))
      .limit(60),
    db
      .select()
      .from(userFollows)
      .where(eq(userFollows.userId, user.id))
      .orderBy(desc(userFollows.createdAt))
      .limit(80),
    db
      .select({ view: userRecentViews, repo: repos })
      .from(userRecentViews)
      .leftJoin(repos, eq(userRecentViews.repoId, repos.id))
      .where(eq(userRecentViews.userId, user.id))
      .orderBy(desc(userRecentViews.viewedAt))
      .limit(20),
    db
      .select()
      .from(userAlerts)
      .where(eq(userAlerts.userId, user.id))
      .orderBy(desc(userAlerts.createdAt))
      .limit(20),
    db
      .select()
      .from(authSessions)
      .where(
        and(
          eq(authSessions.userId, user.id),
          gt(authSessions.expiresAt, new Date()),
          isNull(authSessions.revokedAt),
        ),
      )
      .orderBy(desc(authSessions.lastSeenAt))
      .limit(25),
    getBlockedRepoIds(user.id),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(userRepoStates)
      .where(and(eq(userRepoStates.userId, user.id), isNotNull(userRepoStates.savedAt))),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(userRepoStates)
      .where(activePipelineCondition(user.id)),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(userFollows)
      .where(eq(userFollows.userId, user.id)),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(userAlerts)
      .where(and(eq(userAlerts.userId, user.id), isNull(userAlerts.readAt))),
    getAccountFeatureSummary(user.id),
  ])

  const recommendations = await fetchRecommendationsPage(prefs, blockedRepoIds, 1)

  return {
    user,
    preferences: prefs,
    stats: {
      saved: savedCount[0]?.count ?? 0,
      collections: collections.length,
      follows: followCount[0]?.count ?? 0,
      unreadAlerts: unreadAlertCount[0]?.count ?? 0,
      pipeline: pipelineCount[0]?.count ?? 0,
    },
    collections: collections.map((row) => mapCollection(row, counts.get(row.id) ?? 0)),
    savedRepos: saved.map((row) => ({
      repo: toGithubRepository(row.repo),
      state: mapRepoState(row.state),
    })),
    pipelineRepos: pipeline.map((row) => ({
      repo: toGithubRepository(row.repo),
      state: mapRepoState(row.state),
    })),
    follows: follows.map(mapFollow),
    recentViews: recent.map((row) => ({
      id: row.view.id,
      targetType: row.view.targetType,
      targetKey: row.view.targetKey,
      viewedAt: row.view.viewedAt.toISOString(),
      repo: row.repo ? toGithubRepository(row.repo) : null,
      metadata: row.view.metadata,
    })),
    alerts: alerts.map(mapAlert),
    sessions: sessions.map((row) => mapSession(row, currentTokenHash)),
    recommendations: recommendations.items,
    recommendationsHasMore: recommendations.hasMore,
    ...featureSummary,
  }
}

export async function getRepoPersonalState(userId: string, input: RepoInput) {
  await ensureAccountDefaults(userId)
  const repo = await findRepo(input)
  const [state] = await db
    .select()
    .from(userRepoStates)
    .where(and(eq(userRepoStates.userId, userId), eq(userRepoStates.repoId, repo.id)))
    .limit(1)
  const collections = await db
    .select()
    .from(userCollections)
    .where(eq(userCollections.userId, userId))
    .orderBy(desc(userCollections.updatedAt))
  const collectionItems = await db
    .select({ collectionId: userCollectionItems.collectionId })
    .from(userCollectionItems)
    .innerJoin(userCollections, eq(userCollectionItems.collectionId, userCollections.id))
    .where(and(eq(userCollections.userId, userId), eq(userCollectionItems.repoId, repo.id)))
  const [follow] = await db
    .select()
    .from(userFollows)
    .where(
      and(
        eq(userFollows.userId, userId),
        eq(userFollows.targetType, 'repo'),
        eq(userFollows.targetKey, repo.fullName),
      ),
    )
    .limit(1)

  return {
    repo: toGithubRepository(repo),
    state: mapRepoState(state),
    following: Boolean(follow),
    collections: collections.map((row) => ({
      ...mapCollection(row),
      containsRepo: collectionItems.some((item) => item.collectionId === row.id),
    })),
  }
}

export async function getRepoPersonalStates(userId: string, fullNames: unknown) {
  const names = Array.isArray(fullNames)
    ? Array.from(
        new Set(
          fullNames
            .filter((name): name is string => typeof name === 'string')
            .map((name) => name.trim())
            .filter((name) => REPOSITORY_FULL_NAME_PATTERN.test(name)),
        ),
      ).slice(0, 100)
    : []
  if (names.length === 0) return {}

  await ensureAccountDefaults(userId)

  const repoRows = await db.select().from(repos).where(inArray(repos.fullName, names))
  if (repoRows.length === 0) return {}

  const repoIds = repoRows.map((row) => row.id)

  const [states, collections, collectionItems, follows] = await Promise.all([
    db
      .select()
      .from(userRepoStates)
      .where(and(eq(userRepoStates.userId, userId), inArray(userRepoStates.repoId, repoIds))),
    db
      .select()
      .from(userCollections)
      .where(eq(userCollections.userId, userId))
      .orderBy(desc(userCollections.updatedAt)),
    db
      .select({
        collectionId: userCollectionItems.collectionId,
        repoId: userCollectionItems.repoId,
      })
      .from(userCollectionItems)
      .innerJoin(userCollections, eq(userCollectionItems.collectionId, userCollections.id))
      .where(and(eq(userCollections.userId, userId), inArray(userCollectionItems.repoId, repoIds))),
    db
      .select()
      .from(userFollows)
      .where(
        and(
          eq(userFollows.userId, userId),
          eq(userFollows.targetType, 'repo'),
          inArray(userFollows.targetKey, names),
        ),
      ),
  ])

  const stateByRepoId = new Map(states.map((row) => [row.repoId, row]))
  const followedNames = new Set(follows.map((row) => row.targetKey))
  const collectionIdsByRepoId = new Map<string, Set<string>>()
  for (const item of collectionItems) {
    const set = collectionIdsByRepoId.get(item.repoId) ?? new Set<string>()
    set.add(item.collectionId)
    collectionIdsByRepoId.set(item.repoId, set)
  }

  const result: Record<
    string,
    {
      repo: ReturnType<typeof toGithubRepository>
      state: ReturnType<typeof mapRepoState>
      following: boolean
      collections: Array<ReturnType<typeof mapCollection> & { containsRepo: boolean }>
    }
  > = {}

  for (const repo of repoRows) {
    const containingIds = collectionIdsByRepoId.get(repo.id) ?? new Set<string>()
    result[repo.fullName] = {
      repo: toGithubRepository(repo),
      state: mapRepoState(stateByRepoId.get(repo.id)),
      following: followedNames.has(repo.fullName),
      collections: collections.map((row) => ({
        ...mapCollection(row),
        containsRepo: containingIds.has(row.id),
      })),
    }
  }

  return result
}

export async function updateRepoPersonalState(userId: string, input: Record<string, unknown>) {
  const repo = await findRepo(input)
  const now = new Date()
  const values = {
    userId,
    repoId: repo.id,
    savedAt: input.saved === true ? now : input.saved === false ? null : undefined,
    hiddenAt: input.hidden === true ? now : input.hidden === false ? null : undefined,
    dismissedAt: input.dismissed === true ? now : input.dismissed === false ? null : undefined,
    reviewedAt: input.reviewed === true ? now : input.reviewed === false ? null : undefined,
    pipelineStage: input.pipelineStage ? normalizePipelineStage(input.pipelineStage) : undefined,
    note: 'note' in input ? cleanOptionalText(input.note, 4000) : undefined,
    alertEnabled:
      typeof input.alertEnabled === 'boolean'
        ? normalizeBoolean(input.alertEnabled, true)
        : undefined,
    updatedAt: now,
  }
  const update = Object.fromEntries(
    Object.entries(values).filter(([, value]) => value !== undefined),
  ) as Partial<typeof values>

  await db
    .insert(userRepoStates)
    .values({
      userId,
      repoId: repo.id,
      savedAt: values.savedAt === undefined ? null : values.savedAt,
      hiddenAt: values.hiddenAt === undefined ? null : values.hiddenAt,
      dismissedAt: values.dismissedAt === undefined ? null : values.dismissedAt,
      reviewedAt: values.reviewedAt === undefined ? null : values.reviewedAt,
      pipelineStage: values.pipelineStage ?? 'interested',
      note: values.note,
      alertEnabled: values.alertEnabled ?? true,
    })
    .onConflictDoUpdate({
      target: [userRepoStates.userId, userRepoStates.repoId],
      set: update,
    })

  if (input.saved === true && repo.hasGoodFirstIssues) {
    try {
      await createGoodFirstAlert(userId, repo.id, repo.fullName)
    } catch (error) {
      console.error('Repository state saved but its good-first-issue alert could not be created', {
        error,
        userId,
        repoId: repo.id,
      })
    }
  }

  return getRepoPersonalState(userId, { repoId: repo.id })
}

export async function recordRecentView(userId: string, body: Record<string, unknown>) {
  const targetType = normalizeTargetType(body.targetType)
  const targetKey = normalizeTargetKey(body.targetKey || body.fullName)
  if (!targetKey) throw new Error('Missing recent-view target.')
  validateTargetKey(targetType, targetKey)

  const repo =
    targetType === 'repo'
      ? await findRepo({ repoId: body.repoId, fullName: body.fullName || targetKey })
      : null
  const now = new Date()

  await db
    .insert(userRecentViews)
    .values({
      userId,
      targetType,
      targetKey,
      repoId: repo?.id ?? null,
      metadata: isRecord(body.metadata) ? body.metadata : {},
      viewedAt: now,
    })
    .onConflictDoUpdate({
      target: [userRecentViews.userId, userRecentViews.targetType, userRecentViews.targetKey],
      set: {
        repoId: repo?.id ?? null,
        metadata: isRecord(body.metadata) ? body.metadata : {},
        viewedAt: now,
      },
    })

  return { ok: true }
}

export async function saveCollection(userId: string, body: Record<string, unknown>) {
  const name = cleanText(body.name, 80)
  const collectionId = body.id === undefined ? '' : cleanUuid(body.id)
  if (body.id !== undefined && !collectionId) throw new Error('Invalid collection id.')
  if (name.length < 2) throw new Error('Collection name must be at least 2 characters.')
  if (
    body.visibility !== undefined &&
    body.visibility !== 'private' &&
    body.visibility !== 'shared'
  ) {
    throw new Error('Invalid collection visibility.')
  }

  const [duplicate] = await db
    .select({ id: userCollections.id })
    .from(userCollections)
    .where(
      collectionId
        ? and(
            eq(userCollections.userId, userId),
            eq(userCollections.name, name),
            ne(userCollections.id, collectionId),
          )
        : and(eq(userCollections.userId, userId), eq(userCollections.name, name)),
    )
    .limit(1)
  if (duplicate) throw new Error('A collection with this name already exists.')

  if (body.id) {
    const [updated] = await db
      .update(userCollections)
      .set({
        name,
        description: cleanOptionalText(body.description, 500),
        visibility: body.visibility === 'shared' ? 'shared' : 'private',
        updatedAt: new Date(),
      })
      .where(and(eq(userCollections.userId, userId), eq(userCollections.id, collectionId)))
      .returning()
    if (!updated) throw new Error('Collection not found.')
    return mapCollection(updated)
  }

  const [created] = await db
    .insert(userCollections)
    .values({
      userId,
      name,
      description: cleanOptionalText(body.description, 500),
      visibility: body.visibility === 'shared' ? 'shared' : 'private',
    })
    .returning()
  return mapCollection(created)
}

export async function updateCollectionItem(userId: string, body: Record<string, unknown>) {
  const collectionId = cleanUuid(body.collectionId)
  if (!collectionId) throw new Error('A valid collection id is required.')
  if (body.action !== 'add' && body.action !== 'remove') {
    throw new Error('Collection action must be add or remove.')
  }
  const repo = await findRepo(body)
  const [collection] = await db
    .select()
    .from(userCollections)
    .where(and(eq(userCollections.userId, userId), eq(userCollections.id, collectionId)))
    .limit(1)
  if (!collection) throw new Error('Collection not found.')

  if (body.action === 'remove') {
    await db.batch([
      db
        .delete(userCollectionItems)
        .where(
          and(
            eq(userCollectionItems.collectionId, collectionId),
            eq(userCollectionItems.repoId, repo.id),
          ),
        ),
      db
        .update(userCollections)
        .set({ updatedAt: new Date() })
        .where(eq(userCollections.id, collectionId)),
    ])
  } else {
    await db.batch([
      db
        .insert(userCollectionItems)
        .values({ collectionId, repoId: repo.id })
        .onConflictDoNothing(),
      db
        .update(userCollections)
        .set({ updatedAt: new Date() })
        .where(eq(userCollections.id, collectionId)),
    ])
  }

  return getRepoPersonalState(userId, { repoId: repo.id })
}

export async function deleteCollection(userId: string, collectionId: string) {
  const id = cleanUuid(collectionId)
  if (!id) throw new Error('A valid collection id is required.')
  await db
    .delete(userCollections)
    .where(and(eq(userCollections.userId, userId), eq(userCollections.id, id)))
  return { ok: true }
}

export async function getFollowState(userId: string, body: Record<string, unknown>) {
  const targetType = normalizeTargetType(body.targetType)
  const targetKey = normalizeTargetKey(body.targetKey || body.fullName)
  if (!targetKey) throw new Error('Missing follow target.')
  validateTargetKey(targetType, targetKey)

  const [follow] = await db
    .select()
    .from(userFollows)
    .where(
      and(
        eq(userFollows.userId, userId),
        eq(userFollows.targetType, targetType),
        eq(userFollows.targetKey, targetKey),
      ),
    )
    .limit(1)

  return { following: Boolean(follow), follow: follow ? mapFollow(follow) : null }
}

export async function getFollowStates(userId: string, body: Record<string, unknown>) {
  const targetType = normalizeTargetType(body.targetType)
  if (!Array.isArray(body.targetKeys) || body.targetKeys.length > 100) {
    throw new Error('Follow targets must be an array of at most 100 items.')
  }
  const targetKeys = Array.from(new Set(body.targetKeys.map((key) => normalizeTargetKey(key))))
  for (const targetKey of targetKeys) validateTargetKey(targetType, targetKey)
  if (targetKeys.length === 0) return {}

  const follows = await db
    .select({ targetKey: userFollows.targetKey })
    .from(userFollows)
    .where(
      and(
        eq(userFollows.userId, userId),
        eq(userFollows.targetType, targetType),
        inArray(userFollows.targetKey, targetKeys),
      ),
    )

  const followedKeys = new Set(follows.map((row) => row.targetKey))
  return Object.fromEntries(targetKeys.map((key) => [key, followedKeys.has(key)]))
}

export async function toggleFollow(userId: string, body: Record<string, unknown>) {
  const targetType = normalizeTargetType(body.targetType)
  const targetKey = normalizeTargetKey(body.targetKey || body.fullName)
  if (!targetKey) throw new Error('Missing follow target.')
  validateTargetKey(targetType, targetKey)
  if (typeof body.following !== 'boolean') throw new Error('Follow state must be true or false.')
  if (body.alertEnabled !== undefined && typeof body.alertEnabled !== 'boolean') {
    throw new Error('Alert state must be true or false.')
  }
  const repo =
    targetType === 'repo'
      ? await findRepo({ repoId: body.repoId, fullName: body.fullName || targetKey })
      : null

  if (body.following === false) {
    await db
      .delete(userFollows)
      .where(
        and(
          eq(userFollows.userId, userId),
          eq(userFollows.targetType, targetType),
          eq(userFollows.targetKey, targetKey),
        ),
      )
    return { following: false }
  }

  if (targetType === 'organization') {
    const [organizationRepo] = await db
      .select({ id: repos.id })
      .from(repos)
      .where(eq(repos.owner, targetKey))
      .limit(1)
    if (!organizationRepo) throw new Error('Organization is not in the OpenDeck mirror.')
  }

  const alertEnabled = body.alertEnabled ?? true
  await db
    .insert(userFollows)
    .values({
      userId,
      targetType,
      targetKey,
      repoId: repo?.id ?? null,
      alertEnabled,
    })
    .onConflictDoUpdate({
      target: [userFollows.userId, userFollows.targetType, userFollows.targetKey],
      set: { alertEnabled },
    })

  return { following: true }
}

export async function markAlertsRead(userId: string) {
  await db
    .update(userAlerts)
    .set({ readAt: new Date() })
    .where(and(eq(userAlerts.userId, userId), isNull(userAlerts.readAt)))
  return { ok: true }
}

export async function updatePreferences(userId: string, body: Record<string, unknown>) {
  const next: Partial<typeof userPreferences.$inferInsert> = { updatedAt: new Date() }
  const assignBoolean = (key: keyof typeof body, fallback: boolean) => {
    if (!(key in body)) return undefined
    if (typeof body[key] !== 'boolean') throw new Error(`${String(key)} must be true or false.`)
    return normalizeBoolean(body[key], fallback)
  }

  if ('defaultLanguage' in body) next.defaultLanguage = cleanOptionalText(body.defaultLanguage, 80)
  if ('defaultSort' in body) {
    if (!SORTS.some((sort) => sort === body.defaultSort)) throw new Error('Invalid default sort.')
    next.defaultSort = normalizeSort(body.defaultSort)
  }
  if ('theme' in body) {
    if (body.theme !== 'light' && body.theme !== 'dark' && body.theme !== 'system') {
      throw new Error('Invalid theme preference.')
    }
    next.theme = body.theme
  }
  if ('preferredLanguages' in body)
    next.preferredLanguages = cleanStringList(body.preferredLanguages)
  if ('preferredTopics' in body) next.preferredTopics = cleanStringList(body.preferredTopics)
  if ('minStars' in body) {
    const minStars = parseIntegerValue(body.minStars)
    if (minStars === undefined || minStars < 0 || minStars > 10_000_000) {
      throw new Error('Minimum stars must be an integer between 0 and 10000000.')
    }
    next.minStars = minStars
  }
  if ('includeLowIssueCount' in body) {
    next.includeLowIssueCount = assignBoolean('includeLowIssueCount', true)
  }
  if ('emailDigestEnabled' in body) {
    next.emailDigestEnabled = assignBoolean('emailDigestEnabled', false)
  }
  if ('digestFrequency' in body) {
    if (!ACCOUNT_DIGEST_FREQUENCIES.some((frequency) => frequency === body.digestFrequency)) {
      throw new Error('Invalid digest frequency.')
    }
    next.digestFrequency = normalizeDigestFrequency(body.digestFrequency)
  }
  if ('digestDay' in body) {
    const digestDay = parseIntegerValue(body.digestDay)
    if (digestDay === undefined || digestDay < 0 || digestDay > 6) {
      throw new Error('Digest day must be an integer between 0 and 6.')
    }
    next.digestDay = normalizeDigestDay(digestDay)
  }
  if ('goodFirstAlertsEnabled' in body) {
    next.goodFirstAlertsEnabled = assignBoolean('goodFirstAlertsEnabled', true)
  }
  if ('privateProfile' in body) next.privateProfile = assignBoolean('privateProfile', true)
  if ('excludedLanguages' in body) next.excludedLanguages = cleanStringList(body.excludedLanguages)
  if ('excludedTopics' in body) next.excludedTopics = cleanStringList(body.excludedTopics)
  if ('excludeArchived' in body) next.excludeArchived = assignBoolean('excludeArchived', true)
  if ('excludeResourceLists' in body) {
    next.excludeResourceLists = assignBoolean('excludeResourceLists', true)
  }
  if ('excludeLowActivity' in body) {
    next.excludeLowActivity = assignBoolean('excludeLowActivity', false)
  }
  if ('setupDifficulty' in body) {
    if (
      body.setupDifficulty !== 'any' &&
      body.setupDifficulty !== 'easy' &&
      body.setupDifficulty !== 'medium' &&
      body.setupDifficulty !== 'advanced'
    ) {
      throw new Error('Invalid setup difficulty.')
    }
    next.setupDifficulty = body.setupDifficulty
  }

  await db
    .insert(userPreferences)
    .values({ userId, ...next })
    .onConflictDoUpdate({ target: userPreferences.userId, set: next })
  return getPreferences(userId)
}

export async function updateProfile(userId: string, body: Record<string, unknown>) {
  const name = normalizeName(body.name)
  const email = normalizeEmail(body.email)
  if (name.length < 2 || name.length > 80) throw new Error('Enter a valid display name.')
  if (!isValidEmail(email)) throw new Error('Enter a valid email address.')

  const [current, existing] = await Promise.all([
    db
      .select()
      .from(authUsers)
      .where(eq(authUsers.id, userId))
      .limit(1)
      .then(([user]) => user),
    db
      .select({ id: authUsers.id })
      .from(authUsers)
      .where(and(eq(authUsers.email, email), ne(authUsers.id, userId)))
      .limit(1)
      .then(([user]) => user),
  ])
  if (!current) throw new Error('Account not found.')
  if (existing) throw new Error('That email is already used by another account.')
  if (current.email !== email) {
    throw new Error('Email changes require verification and are not available yet.')
  }

  const [updated] = await db
    .update(authUsers)
    .set({
      name,
      email,
      role: current.role,
      updatedAt: new Date(),
    })
    .where(eq(authUsers.id, userId))
    .returning()

  if (!updated) throw new Error('Account not found.')
  return toPublicUser(updated)
}

export async function revokeSession(userId: string, sessionId: unknown, currentToken?: string) {
  const id = cleanUuid(sessionId)
  if (!id) throw new Error('A valid session id is required.')

  const [session] = await db
    .select()
    .from(authSessions)
    .where(and(eq(authSessions.id, id), eq(authSessions.userId, userId)))
    .limit(1)

  if (!session) throw new Error('Session not found.')

  const currentTokenHash = currentToken ? hashSessionToken(currentToken) : undefined
  if (currentTokenHash && session.tokenHash === currentTokenHash) {
    throw new Error('Use sign out to end the current session.')
  }

  await db
    .update(authSessions)
    .set({ revokedAt: new Date() })
    .where(and(eq(authSessions.id, id), eq(authSessions.userId, userId)))
  return { ok: true }
}

export async function signOutOtherSessions(
  userId: string,
  currentToken?: string,
  includeCurrent = false,
) {
  const currentTokenHash = currentToken ? hashSessionToken(currentToken) : undefined
  const where =
    currentTokenHash && !includeCurrent
      ? and(eq(authSessions.userId, userId), ne(authSessions.tokenHash, currentTokenHash))
      : eq(authSessions.userId, userId)

  await db.update(authSessions).set({ revokedAt: new Date() }).where(where)
  return { ok: true, signedOutCurrent: includeCurrent }
}

export async function deleteAccount(userId: string, body: Record<string, unknown>) {
  const [user] = await db.select().from(authUsers).where(eq(authUsers.id, userId)).limit(1)
  if (!user) throw new Error('Account not found.')

  const confirmation = normalizeEmail(body.confirmEmail ?? body.email)
  if (confirmation !== user.email) {
    throw new Error('Type your account email to confirm deletion.')
  }

  if (!(await deleteUserPreservingActiveAdmin(userId))) throw new Error('Account not found.')
  return { ok: true }
}

export async function exportSavedRepos(userId: string, format: string) {
  const rows = await savedRows(userId, 5000)
  const data = rows.map((row) => ({
    fullName: row.repo.fullName,
    language: row.repo.language,
    stars: row.repo.stars,
    openIssues: row.repo.openIssues,
    pipelineStage: row.state.pipelineStage,
    note: row.state.note,
    savedAt: row.state.savedAt?.toISOString() ?? null,
    htmlUrl: row.repo.htmlUrl,
  }))

  if (format === 'csv') {
    const headers = [
      'fullName',
      'language',
      'stars',
      'openIssues',
      'pipelineStage',
      'note',
      'savedAt',
      'htmlUrl',
    ]
    const escape = (value: unknown) => {
      let text = String(value ?? '')
      if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`
      return `"${text.replace(/"/g, '""')}"`
    }
    return {
      contentType: 'text/csv; charset=utf-8',
      body: [
        headers.join(','),
        ...data.map((row) => headers.map((key) => escape(row[key as keyof typeof row])).join(',')),
      ].join('\n'),
    }
  }

  return {
    contentType: 'application/json; charset=utf-8',
    body: JSON.stringify({ items: data }, null, 2),
  }
}

export function sessionTokenFromRequest(request: NextRequest) {
  return request.cookies.get(SESSION_COOKIE)?.value
}
