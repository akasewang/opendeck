import { and, desc, eq, inArray, isNotNull, ne } from 'drizzle-orm'
import { db } from '@/db/client'
import {
  emailDeliveries,
  repoIssues,
  repos,
  userCollectionItems,
  userCollections,
  userOnboardingProfiles,
  userPreferences,
  userRepoJournalEntries,
  userRepoStates,
  userSavedSearches,
} from '@/db/schema'
import { ACCOUNT_COLLECTION_TEMPLATES } from '@/features/account/constants/account-options'
import { savedSearchFilters, savedSearchParams } from '@/features/account/utils/saved-search-params'
import { createOpaqueToken } from '@/features/auth/services/authentication-service'
import {
  mapRepositoryIssue,
  syncRepositoryIssues,
} from '@/features/repositories/services/repository-issue-service'
import {
  searchRepos,
  toGithubRepository,
} from '@/features/repositories/services/repository-query-service'
import {
  cleanOptionalText,
  cleanStringList,
  cleanText,
  cleanUuid,
  isRecord,
  normalizeSlugPart,
  parseIntegerValue,
} from '@/lib/api/input-normalization'
import { REPOSITORY_FULL_NAME_PATTERN } from '@/features/repositories/constants/repository-validation'

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
    type: row.type,
    subject: row.subject,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
  }
}

async function findRepo(input: Record<string, unknown>) {
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
    collectionTemplates: ACCOUNT_COLLECTION_TEMPLATES,
  }
}

export async function saveOnboarding(userId: string, body: Record<string, unknown>) {
  if (
    body.skillLevel !== 'beginner' &&
    body.skillLevel !== 'intermediate' &&
    body.skillLevel !== 'advanced'
  ) {
    throw new Error('Invalid skill level.')
  }
  const skillLevel = body.skillLevel
  const weeklyHours = parseIntegerValue(body.weeklyHours)
  if (weeklyHours === undefined || weeklyHours < 1 || weeklyHours > 80) {
    throw new Error('Weekly hours must be an integer between 1 and 80.')
  }
  const goals = cleanStringList(body.goals, 8)
  const languages = cleanStringList(body.languages, 12)
  const topics = cleanStringList(body.topics, 16)
  const now = new Date()

  await db.batch([
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
  const id = body.id === undefined ? '' : cleanUuid(body.id)
  if (body.id !== undefined && !id) throw new Error('Invalid saved search id.')
  const name = cleanText(body.name, 80)
  if (name.length < 2) throw new Error('Saved search name must be at least 2 characters.')

  const [duplicate] = await db
    .select({ id: userSavedSearches.id })
    .from(userSavedSearches)
    .where(
      id
        ? and(
            eq(userSavedSearches.userId, userId),
            eq(userSavedSearches.name, name),
            ne(userSavedSearches.id, id),
          )
        : and(eq(userSavedSearches.userId, userId), eq(userSavedSearches.name, name)),
    )
    .limit(1)
  if (duplicate) throw new Error('A saved search with this name already exists.')

  const filters = isRecord(body.filters) ? body.filters : body
  if ('alertEnabled' in body && typeof body.alertEnabled !== 'boolean') {
    throw new Error('alertEnabled must be true or false.')
  }
  const next = {
    name,
    query: cleanOptionalText(body.query, 180),
    filters: savedSearchFilters(filters),
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
  const savedSearchId = cleanUuid(id)
  if (!savedSearchId) throw new Error('A valid saved search id is required.')
  await db
    .delete(userSavedSearches)
    .where(and(eq(userSavedSearches.userId, userId), eq(userSavedSearches.id, savedSearchId)))
  return { ok: true }
}

export async function previewSavedSearch(body: Record<string, unknown>) {
  const filters = isRecord(body.filters) ? body.filters : body
  const result = await searchRepos(
    savedSearchParams(savedSearchFilters(filters), cleanText(body.query, 180)),
  )
  return { items: result.items.map(toGithubRepository), totalCount: result.totalCount }
}

export async function shareCollection(userId: string, body: Record<string, unknown>) {
  const id = cleanUuid(body.id)
  if (!id) throw new Error('A valid collection id is required.')
  if (typeof body.enabled !== 'boolean') throw new Error('Share state must be true or false.')
  const enabled = body.enabled
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
  const template = ACCOUNT_COLLECTION_TEMPLATES.find((item) => item.key === key)
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
  const id = cleanUuid(collectionId)
  if (!id) throw new Error('A valid collection id is required.')
  const [collection] = await db
    .select()
    .from(userCollections)
    .where(and(eq(userCollections.userId, userId), eq(userCollections.id, id)))
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

  if (sourceRepos.length === 0) return []

  await Promise.all(sourceRepos.map((repo) => syncRepositoryIssues(repo.id, repo.fullName)))

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
    .map((row) => mapRepositoryIssue(row.issue, row.repo.fullName))
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
  const id = body.id === undefined ? '' : cleanUuid(body.id)
  if (body.id !== undefined && !id) throw new Error('Invalid journal entry id.')
  const issueNumber =
    body.issueNumber === undefined || body.issueNumber === null || body.issueNumber === ''
      ? null
      : parseIntegerValue(body.issueNumber)
  if (
    issueNumber !== null &&
    (issueNumber === undefined || issueNumber < 1 || issueNumber > 1_000_000)
  ) {
    throw new Error('Issue number must be an integer between 1 and 1000000.')
  }
  const entry = {
    issueNumber,
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
  const id = cleanUuid(body.id)
  if (!id) throw new Error('A valid journal entry id is required.')
  await db
    .delete(userRepoJournalEntries)
    .where(and(eq(userRepoJournalEntries.userId, userId), eq(userRepoJournalEntries.id, id)))
  return { ok: true }
}
