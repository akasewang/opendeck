import { and, desc, eq, gt, isNotNull, isNull, ne, or, sql } from 'drizzle-orm'
import type { NextRequest } from 'next/server'
import { APP_CONFIG } from '@/config/app'
import { db } from '@/db'
import {
  authEmailAllowlist,
  authInvites,
  authSessions,
  authTokens,
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
import { getAccountFeatureSummary } from '@/lib/account-features'
import {
  cleanOptionalText,
  cleanStringList,
  cleanText,
  isRecord,
  normalizeNumber,
} from '@/lib/api/normalize'
import {
  type AuthRole,
  type AuthUser,
  createOpaqueToken,
  createSession,
  hashOpaqueToken,
  hashSessionToken,
  isValidEmail,
  normalizeEmail,
  normalizeName,
  SESSION_COOKIE,
  toPublicUser,
} from '@/lib/auth'
import { isEmailDeliveryConfigured, sendEmail } from '@/lib/email'
import { renderEmail } from '@/lib/email-templates'
import { type RepoSearchParams, searchRepos, toGithubRepository } from '@/lib/repositories'
import { serverEnv } from '@/lib/server-env'

const PIPELINE_STAGES = ['interested', 'opened_issue', 'submitted_pr', 'done'] as const
const DIGEST_FREQUENCIES = ['off', 'daily', 'weekly', 'monthly'] as const

type PipelineStage = (typeof PIPELINE_STAGES)[number]
type DigestFrequency = (typeof DIGEST_FREQUENCIES)[number]
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

type EmailTokenType = 'email_verification' | 'magic_link'

type InviteAccess = {
  role: AuthRole
  inviteId?: string
}

function normalizeRole(value: unknown): AuthRole {
  return value === 'admin' ? 'admin' : 'user'
}

function isConfiguredAdminEmail(email: string) {
  return serverEnv.authAdminEmails.includes(email)
}

async function countOtherActiveAdmins(userId: string) {
  const [remainingAdmins] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(authUsers)
    .where(
      and(eq(authUsers.role, 'admin'), eq(authUsers.status, 'active'), ne(authUsers.id, userId)),
    )

  return remainingAdmins?.count ?? 0
}

async function assertAnotherActiveAdminRemains(userId: string) {
  if ((await countOtherActiveAdmins(userId)) === 0) {
    throw new Error('At least one active admin must remain.')
  }
}

function normalizePipelineStage(value: unknown): PipelineStage {
  return PIPELINE_STAGES.includes(value as PipelineStage) ? (value as PipelineStage) : 'interested'
}

function normalizeDigestFrequency(value: unknown): DigestFrequency {
  return DIGEST_FREQUENCIES.includes(value as DigestFrequency)
    ? (value as DigestFrequency)
    : 'weekly'
}

function normalizeSort(value: unknown): RepoSort {
  return SORTS.includes(value as RepoSort) ? (value as RepoSort) : 'contribution'
}

function normalizeBoolean(value: unknown, fallback: boolean) {
  return typeof value === 'boolean' ? value : fallback
}

function tokenActionUrl(type: EmailTokenType, token: string) {
  const params = new URLSearchParams({ token })

  if (type === 'magic_link') {
    return `${APP_CONFIG.url}/api/auth/magic-link/callback?${params.toString()}`
  }

  return `${APP_CONFIG.url}/api/auth/email-verification?${params.toString()}`
}

function emailTokenCopy(type: EmailTokenType, actionUrl: string, expiresAt: Date) {
  const expires = expiresAt.toISOString()

  if (type === 'magic_link') {
    return {
      subject: 'Sign in to OpenDeck',
      eyebrow: 'sign in',
      intro: 'Use this link to sign in to OpenDeck.',
      action: 'Sign in',
      outro: 'If you did not request this sign-in link, you can ignore this email.',
      text: [
        'Use this link to sign in to OpenDeck:',
        actionUrl,
        '',
        `This link expires at ${expires}.`,
        'If you did not request this sign-in link, you can ignore this email.',
      ].join('\n'),
    }
  }

  return {
    subject: 'Verify your OpenDeck email',
    eyebrow: 'verify email',
    intro: 'Use this link to verify your OpenDeck email address.',
    action: 'Verify email',
    outro: 'If you did not request this verification, you can ignore this email.',
    text: [
      'Use this link to verify your OpenDeck email address:',
      actionUrl,
      '',
      `This link expires at ${expires}.`,
      'If you did not request this verification, you can ignore this email.',
    ].join('\n'),
  }
}

async function sendEmailToken(
  email: string,
  type: EmailTokenType,
  token: string,
  expiresAt: Date,
  userId?: string,
) {
  const actionUrl = tokenActionUrl(type, token)
  const copy = emailTokenCopy(type, actionUrl, expiresAt)

  return sendEmail({
    userId,
    to: email,
    type,
    subject: copy.subject,
    text: copy.text,
    html: renderEmail({
      preview: copy.subject,
      eyebrow: copy.eyebrow,
      heading: copy.subject,
      paragraphs: [copy.intro],
      button: { label: copy.action, href: actionUrl },
      note: `This link expires at ${expiresAt.toISOString()}.`,
      footer: copy.outro,
    }),
    metadata: { expiresAt: expiresAt.toISOString() },
  })
}

function ensureProductionEmailDelivery() {
  if (serverEnv.nodeEnv === 'production' && !isEmailDeliveryConfigured()) {
    throw new Error('Email delivery is not configured.')
  }
}

function normalizeDigestDay(value: unknown) {
  const day = normalizeNumber(value, 1, 6)
  return Math.min(Math.max(day, 0), 6)
}

function normalizeTargetType(value: unknown) {
  return value === 'organization' ? 'organization' : 'repo'
}

function normalizeTargetKey(value: unknown) {
  return cleanText(value, 180)
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

function matchesPattern(email: string, pattern: string, kind: string) {
  const normalizedPattern = pattern.trim().toLowerCase()
  if (!normalizedPattern) return false

  if (kind === 'domain') {
    return email.endsWith(`@${normalizedPattern.replace(/^@/, '')}`)
  }

  return email === normalizedPattern
}

async function allowlistAllows(email: string) {
  const rows = await db.select().from(authEmailAllowlist)
  if (rows.length === 0) return { enforced: false, allowed: false }

  return {
    enforced: true,
    allowed: rows.some((row) => matchesPattern(email, row.pattern, row.kind)),
  }
}

async function consumeInvite(email: string, token?: unknown) {
  const value = cleanText(token, 300)
  if (!value) return null

  const [invite] = await db
    .select()
    .from(authInvites)
    .where(
      and(
        eq(authInvites.tokenHash, hashOpaqueToken(value)),
        gt(authInvites.expiresAt, new Date()),
        isNull(authInvites.acceptedAt),
      ),
    )
    .limit(1)

  if (!invite) return null
  if (invite.email && normalizeEmail(invite.email) !== email) return null
  return invite
}

async function resolveSignupAccess(emailInput: unknown, inviteToken?: unknown) {
  const email = normalizeEmail(emailInput)
  const adminEmail = serverEnv.authAdminEmails.includes(email)
  const invite = await consumeInvite(email, inviteToken)

  if (adminEmail || invite) {
    return {
      role: adminEmail || invite?.role === 'admin' ? 'admin' : 'user',
      inviteId: invite?.id,
    } satisfies InviteAccess
  }

  const envEmails = serverEnv.authAllowedEmails
  const envDomains = serverEnv.authAllowedDomains
  const envAllowlistEnforced = envEmails.length > 0 || envDomains.length > 0
  const envAllowed =
    envEmails.includes(email) || envDomains.some((domain) => email.endsWith(`@${domain}`))
  const dbAllowlist = await allowlistAllows(email)

  if (serverEnv.authInviteOnly) {
    return { error: 'An invitation is required to create an account.' }
  }

  if (envAllowlistEnforced && !envAllowed) {
    return { error: 'This email is not allowed to create an account.' }
  }

  if (dbAllowlist.enforced && !dbAllowlist.allowed) {
    return { error: 'This email is not on the account allowlist.' }
  }

  return { role: 'user' } satisfies InviteAccess
}

async function markInviteAccepted(inviteId?: string) {
  if (!inviteId) return true
  const [updated] = await db
    .update(authInvites)
    .set({ acceptedAt: new Date() })
    .where(and(eq(authInvites.id, inviteId), isNull(authInvites.acceptedAt)))
    .returning({ id: authInvites.id })
  return Boolean(updated)
}

async function ensureAccountDefaults(userId: string) {
  await Promise.all([
    db.insert(userPreferences).values({ userId }).onConflictDoNothing(),
    db
      .insert(userCollections)
      .values({ userId, name: 'Saved repos', description: 'Repositories worth revisiting.' })
      .onConflictDoNothing(),
    db
      .insert(userCollections)
      .values({
        userId,
        name: 'Contribution pipeline',
        description: 'Repos you are actively evaluating or contributing to.',
      })
      .onConflictDoNothing(),
  ])
}

async function getPreferences(userId: string) {
  await db.insert(userPreferences).values({ userId }).onConflictDoNothing()
  const [prefs] = await db.select().from(userPreferences).where(eq(userPreferences.userId, userId))
  return prefs
}

async function findRepo(input: RepoInput) {
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
    hiddenDismissed,
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
      .where(eq(authSessions.userId, user.id))
      .orderBy(desc(authSessions.lastSeenAt))
      .limit(25),
    db
      .select({
        repoId: userRepoStates.repoId,
      })
      .from(userRepoStates)
      .where(
        and(
          eq(userRepoStates.userId, user.id),
          sql`(${userRepoStates.hiddenAt} is not null or ${userRepoStates.dismissedAt} is not null)`,
        ),
      ),
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

  const blockedRepoIds = new Set(hiddenDismissed.map((row) => row.repoId))
  const recommendations = (
    await searchRepos({
      language: prefs.defaultLanguage ?? prefs.preferredLanguages[0],
      topic: prefs.preferredTopics.join(',') || undefined,
      minStars: prefs.minStars,
      activeOnly: true,
      contributionReadyOnly: true,
      hasGoodFirstIssues: prefs.goodFirstAlertsEnabled ? true : undefined,
      sort: normalizeSort(prefs.defaultSort),
      perPage: 60,
    })
  ).items
    .filter((repo) => {
      if (blockedRepoIds.has(repo.id)) return false
      if (prefs.excludeArchived && repo.isArchived) return false
      if (prefs.excludedLanguages.includes(repo.language ?? '')) return false
      if (repo.topics.some((topic) => prefs.excludedTopics.includes(topic))) return false
      return true
    })
    .slice(0, 12)

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
    recommendations: recommendations.map(toGithubRepository),
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
    await createGoodFirstAlert(userId, repo.id, repo.fullName)
  }

  return getRepoPersonalState(userId, { repoId: repo.id })
}

export async function recordRecentView(userId: string, body: Record<string, unknown>) {
  const targetType = normalizeTargetType(body.targetType)
  const targetKey = normalizeTargetKey(body.targetKey || body.fullName)
  if (!targetKey) throw new Error('Missing recent-view target.')

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
  const collectionId = cleanText(body.id, 80)
  if (name.length < 2) throw new Error('Collection name must be at least 2 characters.')

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
  const collectionId = cleanText(body.collectionId, 80)
  const repo = await findRepo(body)
  const [collection] = await db
    .select()
    .from(userCollections)
    .where(and(eq(userCollections.userId, userId), eq(userCollections.id, collectionId)))
    .limit(1)
  if (!collection) throw new Error('Collection not found.')

  if (body.action === 'remove') {
    await db
      .delete(userCollectionItems)
      .where(
        and(
          eq(userCollectionItems.collectionId, collectionId),
          eq(userCollectionItems.repoId, repo.id),
        ),
      )
  } else {
    await db
      .insert(userCollectionItems)
      .values({ collectionId, repoId: repo.id })
      .onConflictDoNothing()
  }

  await db
    .update(userCollections)
    .set({ updatedAt: new Date() })
    .where(eq(userCollections.id, collectionId))

  return getRepoPersonalState(userId, { repoId: repo.id })
}

export async function deleteCollection(userId: string, collectionId: string) {
  await db
    .delete(userCollections)
    .where(and(eq(userCollections.userId, userId), eq(userCollections.id, collectionId)))
  return { ok: true }
}

export async function getFollowState(userId: string, body: Record<string, unknown>) {
  const targetType = normalizeTargetType(body.targetType)
  const targetKey = normalizeTargetKey(body.targetKey || body.fullName)
  if (!targetKey) throw new Error('Missing follow target.')

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

export async function toggleFollow(userId: string, body: Record<string, unknown>) {
  const targetType = normalizeTargetType(body.targetType)
  const targetKey = normalizeTargetKey(body.targetKey || body.fullName)
  if (!targetKey) throw new Error('Missing follow target.')
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

  await db
    .insert(userFollows)
    .values({
      userId,
      targetType,
      targetKey,
      repoId: repo?.id ?? null,
      alertEnabled: body.alertEnabled !== false,
    })
    .onConflictDoUpdate({
      target: [userFollows.userId, userFollows.targetType, userFollows.targetKey],
      set: { alertEnabled: body.alertEnabled !== false },
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
  const next = {
    defaultLanguage: cleanOptionalText(body.defaultLanguage, 80),
    defaultSort: normalizeSort(body.defaultSort),
    theme: body.theme === 'light' || body.theme === 'dark' ? String(body.theme) : 'system',
    preferredLanguages: cleanStringList(body.preferredLanguages),
    preferredTopics: cleanStringList(body.preferredTopics),
    minStars: normalizeNumber(body.minStars, 0),
    includeLowIssueCount: normalizeBoolean(body.includeLowIssueCount, true),
    emailDigestEnabled: normalizeBoolean(body.emailDigestEnabled, false),
    digestFrequency: normalizeDigestFrequency(body.digestFrequency),
    digestDay: normalizeDigestDay(body.digestDay),
    goodFirstAlertsEnabled: normalizeBoolean(body.goodFirstAlertsEnabled, true),
    privateProfile: normalizeBoolean(body.privateProfile, true),
    excludedLanguages: cleanStringList(body.excludedLanguages),
    excludedTopics: cleanStringList(body.excludedTopics),
    excludeArchived: normalizeBoolean(body.excludeArchived, true),
    excludeResourceLists: normalizeBoolean(body.excludeResourceLists, true),
    excludeLowActivity: normalizeBoolean(body.excludeLowActivity, false),
    setupDifficulty:
      body.setupDifficulty === 'easy' ||
      body.setupDifficulty === 'medium' ||
      body.setupDifficulty === 'advanced'
        ? String(body.setupDifficulty)
        : 'any',
    updatedAt: new Date(),
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

  const emailChanged = current.email !== email
  const shouldDemoteAdmin =
    emailChanged && current.role === 'admin' && !isConfiguredAdminEmail(email)
  if (shouldDemoteAdmin && current.status === 'active') {
    await assertAnotherActiveAdminRemains(userId)
  }

  const [updated] = await db
    .update(authUsers)
    .set({
      name,
      email,
      role: shouldDemoteAdmin ? 'user' : current.role,
      emailVerifiedAt: sql`case when ${authUsers.email} = ${email} then ${authUsers.emailVerifiedAt} else null end`,
      updatedAt: new Date(),
    })
    .where(eq(authUsers.id, userId))
    .returning()

  if (!updated) throw new Error('Account not found.')
  return toPublicUser(updated)
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

  if (user.role === 'admin' && user.status === 'active') {
    await assertAnotherActiveAdminRemains(userId)
  }

  await db.delete(authUsers).where(eq(authUsers.id, userId))
  return { ok: true }
}

export async function createEmailToken(emailInput: unknown, type: EmailTokenType, userId?: string) {
  const email = normalizeEmail(emailInput)
  if (!isValidEmail(email)) throw new Error('Enter a valid email address.')
  ensureProductionEmailDelivery()

  const token = createOpaqueToken()
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000)
  await db.insert(authTokens).values({
    userId,
    email,
    type,
    tokenHash: hashOpaqueToken(token),
    expiresAt,
  })

  const delivery = await sendEmailToken(email, type, token, expiresAt, userId)
  if (serverEnv.nodeEnv === 'production' && delivery.status !== 'sent') {
    throw new Error('Unable to send email right now.')
  }

  return {
    ok: true,
    expiresAt: expiresAt.toISOString(),
    emailDeliveryStatus: delivery.status,
    devToken: serverEnv.nodeEnv === 'production' ? undefined : token,
  }
}

async function verifyEmailToken(tokenInput: unknown, type: EmailTokenType) {
  const token = cleanText(tokenInput, 300)
  if (!token) throw new Error('Missing token.')

  const [row] = await db
    .select()
    .from(authTokens)
    .where(
      and(
        eq(authTokens.tokenHash, hashOpaqueToken(token)),
        eq(authTokens.type, type),
        gt(authTokens.expiresAt, new Date()),
        isNull(authTokens.usedAt),
      ),
    )
    .limit(1)

  if (!row) throw new Error('Token is invalid or expired.')
  return row
}

async function consumeEmailTokenRow(row: typeof authTokens.$inferSelect) {
  const [consumed] = await db
    .update(authTokens)
    .set({ usedAt: new Date() })
    .where(and(eq(authTokens.id, row.id), isNull(authTokens.usedAt)))
    .returning()

  if (!consumed) throw new Error('Token is invalid or expired.')
  return consumed
}

async function consumeEmailToken(tokenInput: unknown, type: EmailTokenType) {
  return consumeEmailTokenRow(await verifyEmailToken(tokenInput, type))
}

async function applyEmailVerification(row: typeof authTokens.$inferSelect) {
  if (!row.userId) throw new Error('Token is not linked to an account.')
  const [updated] = await db
    .update(authUsers)
    .set({ emailVerifiedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(authUsers.id, row.userId), eq(authUsers.email, row.email)))
    .returning()

  if (!updated) throw new Error('Token email no longer matches this account.')
  return updated
}

export async function verifyEmail(userId: string, token: unknown) {
  const row = await verifyEmailToken(token, 'email_verification')
  if (row.userId !== userId) throw new Error('Token does not belong to this account.')
  const consumed = await consumeEmailTokenRow(row)
  await applyEmailVerification(consumed)
  return { ok: true }
}

export async function completeEmailVerification(token: unknown) {
  const row = await consumeEmailToken(token, 'email_verification')
  const user = await applyEmailVerification(row)
  return { ok: true, user: toPublicUser(user) }
}

function safeRelativePath(value: unknown) {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//')
    ? value
    : undefined
}

export async function requestMagicLink(
  emailInput: unknown,
  options: { inviteToken?: unknown; redirect?: unknown } = {},
) {
  const email = normalizeEmail(emailInput)
  if (!isValidEmail(email)) throw new Error('Enter a valid email address.')
  ensureProductionEmailDelivery()

  const [existing] = await db.select().from(authUsers).where(eq(authUsers.email, email)).limit(1)
  const inviteToken = typeof options.inviteToken === 'string' ? options.inviteToken : undefined
  const redirect = safeRelativePath(options.redirect)

  let allowed = Boolean(existing)
  if (!allowed) {
    const access = await resolveSignupAccess(email, inviteToken)
    allowed = !('error' in access)
  }
  if (!allowed) return { ok: true }

  const token = createOpaqueToken()
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000)
  await db.insert(authTokens).values({
    userId: existing?.id,
    email,
    type: 'magic_link',
    tokenHash: hashOpaqueToken(token),
    expiresAt,
    metadata: {
      ...(inviteToken ? { inviteToken } : {}),
      ...(redirect ? { redirect } : {}),
    },
  })

  const delivery = await sendEmailToken(email, 'magic_link', token, expiresAt, existing?.id)
  if (serverEnv.nodeEnv === 'production' && delivery.status !== 'sent') {
    throw new Error('Unable to send email right now.')
  }

  return {
    ok: true,
    emailDeliveryStatus: delivery.status,
    devLink: serverEnv.nodeEnv === 'production' ? undefined : tokenActionUrl('magic_link', token),
  }
}

export async function completeMagicLink(token: unknown, request?: NextRequest) {
  const row = await consumeEmailToken(token, 'magic_link')
  const metadata = (row.metadata ?? {}) as Record<string, unknown>
  const redirect = safeRelativePath(metadata.redirect) ?? '/dashboard/home'
  const inviteToken = typeof metadata.inviteToken === 'string' ? metadata.inviteToken : undefined

  let [user] = await db.select().from(authUsers).where(eq(authUsers.email, row.email)).limit(1)

  if (!user) {
    const access = await resolveSignupAccess(row.email, inviteToken)
    if ('error' in access) throw new Error(access.error)
    const [created] = await db
      .insert(authUsers)
      .values({
        name: normalizeName(row.email.split('@')[0]) || row.email,
        email: row.email,
        emailVerifiedAt: new Date(),
        lastLoginAt: new Date(),
        role: access.role,
      })
      .returning()

    const inviteAccepted = await markInviteAccepted(access.inviteId)
    if (!inviteAccepted) {
      await db.delete(authUsers).where(eq(authUsers.id, created.id))
      throw new Error('This invitation has already been used.')
    }

    user = created
    await ensureAccountDefaults(user.id)
  } else {
    const [updated] = await db
      .update(authUsers)
      .set({
        lastLoginAt: new Date(),
        emailVerifiedAt: user.emailVerifiedAt ?? new Date(),
        updatedAt: new Date(),
      })
      .where(eq(authUsers.id, user.id))
      .returning()
    user = updated
  }

  if (user.status !== 'active') throw new Error('This account is suspended.')

  const session = await createSession(user.id, request)
  return {
    user: toPublicUser(user),
    token: session.token,
    expiresAt: session.expiresAt,
    redirect,
  }
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

export async function listAdminUsers() {
  const rows = await db
    .select({
      user: authUsers,
      sessionCount: sql<number>`count(${authSessions.id})::int`,
    })
    .from(authUsers)
    .leftJoin(authSessions, eq(authSessions.userId, authUsers.id))
    .groupBy(authUsers.id)
    .orderBy(desc(authUsers.createdAt))

  return rows.map((row) => ({
    ...toPublicUser(row.user),
    createdAt: row.user.createdAt.toISOString(),
    lastLoginAt: row.user.lastLoginAt?.toISOString() ?? null,
    sessionCount: row.sessionCount,
  }))
}

export async function updateAdminUser(adminId: string, body: Record<string, unknown>) {
  const userId = cleanText(body.userId, 80)
  const role = normalizeRole(body.role)
  const status = body.status === 'suspended' ? 'suspended' : 'active'
  if (!userId) throw new Error('Missing user.')
  if (userId === adminId && status === 'suspended') {
    throw new Error('You cannot suspend your own account.')
  }

  const [target] = await db
    .select({ id: authUsers.id })
    .from(authUsers)
    .where(eq(authUsers.id, userId))
    .limit(1)
  if (!target) throw new Error('User not found.')

  if (role !== 'admin' || status !== 'active') {
    await assertAnotherActiveAdminRemains(userId)
  }

  const [updated] = await db
    .update(authUsers)
    .set({ role, status, updatedAt: new Date() })
    .where(eq(authUsers.id, userId))
    .returning()

  if (status === 'suspended') {
    await db
      .update(authSessions)
      .set({ revokedAt: new Date() })
      .where(eq(authSessions.userId, userId))
  }

  if (!updated) throw new Error('User not found.')
  return toPublicUser(updated)
}

export async function deleteUserAsAdmin(adminId: string, body: Record<string, unknown>) {
  const userId = cleanText(body.userId, 80)
  if (!userId) throw new Error('Missing user.')
  if (userId === adminId) throw new Error('You cannot delete your own account here.')

  const [target] = await db
    .select({ id: authUsers.id, role: authUsers.role, status: authUsers.status })
    .from(authUsers)
    .where(eq(authUsers.id, userId))
    .limit(1)
  if (!target) throw new Error('User not found.')

  if (target.role === 'admin' && target.status === 'active') {
    await assertAnotherActiveAdminRemains(userId)
  }

  await db.delete(authUsers).where(eq(authUsers.id, userId))
  return { ok: true, id: userId }
}

export async function createInvite(adminId: string, body: Record<string, unknown>) {
  const email = cleanOptionalText(normalizeEmail(body.email), 254)
  if (email && (!email.includes('@') || email.length > 254)) {
    throw new Error('Enter a valid invite email, or leave it blank.')
  }
  const token = createOpaqueToken()
  const days = normalizeNumber(body.days, 14, 365)
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000)
  const [invite] = await db
    .insert(authInvites)
    .values({
      email,
      tokenHash: hashOpaqueToken(token),
      role: normalizeRole(body.role),
      invitedBy: adminId,
      expiresAt,
    })
    .returning()

  return {
    id: invite.id,
    email: invite.email,
    role: invite.role,
    expiresAt: invite.expiresAt.toISOString(),
    token,
  }
}

export async function listAdminSecurity() {
  const [invites, allowlist] = await Promise.all([
    db.select().from(authInvites).orderBy(desc(authInvites.createdAt)).limit(50),
    db.select().from(authEmailAllowlist).orderBy(desc(authEmailAllowlist.createdAt)),
  ])

  return {
    invites: invites.map((invite) => ({
      id: invite.id,
      email: invite.email,
      role: invite.role,
      expiresAt: invite.expiresAt.toISOString(),
      acceptedAt: invite.acceptedAt?.toISOString() ?? null,
      createdAt: invite.createdAt.toISOString(),
    })),
    allowlist: allowlist.map((row) => ({
      id: row.id,
      pattern: row.pattern,
      kind: row.kind,
      note: row.note,
      createdAt: row.createdAt.toISOString(),
    })),
  }
}

export async function saveAllowlistRule(adminId: string, body: Record<string, unknown>) {
  const pattern = cleanText(body.pattern, 254).toLowerCase().replace(/^@/, '')
  const kind = body.kind === 'domain' ? 'domain' : 'email'
  if (!pattern) throw new Error('Allowlist pattern is required.')

  const [row] = await db
    .insert(authEmailAllowlist)
    .values({
      pattern,
      kind,
      note: cleanOptionalText(body.note, 300),
      createdBy: adminId,
    })
    .onConflictDoUpdate({
      target: authEmailAllowlist.pattern,
      set: { kind, note: cleanOptionalText(body.note, 300), createdBy: adminId },
    })
    .returning()

  return row
}

export async function deleteAllowlistRule(id: string) {
  await db.delete(authEmailAllowlist).where(eq(authEmailAllowlist.id, id))
  return { ok: true }
}

export async function computeGoodFirstIssueAlerts(limit = 500) {
  const candidates = await db
    .select({
      userId: userRepoStates.userId,
      repoId: repos.id,
      fullName: repos.fullName,
    })
    .from(userRepoStates)
    .innerJoin(repos, eq(userRepoStates.repoId, repos.id))
    .leftJoin(userPreferences, eq(userPreferences.userId, userRepoStates.userId))
    .where(
      and(
        isNotNull(userRepoStates.savedAt),
        eq(userRepoStates.alertEnabled, true),
        eq(repos.hasGoodFirstIssues, true),
        sql`coalesce(${userPreferences.goodFirstAlertsEnabled}, true) = true`,
      ),
    )
    .limit(limit)

  let created = 0

  for (const candidate of candidates) {
    const [existing] = await db
      .select({ id: userAlerts.id })
      .from(userAlerts)
      .where(
        and(
          eq(userAlerts.userId, candidate.userId),
          eq(userAlerts.repoId, candidate.repoId),
          eq(userAlerts.type, 'good_first_issue'),
        ),
      )
      .limit(1)

    if (existing) continue

    await db.insert(userAlerts).values({
      userId: candidate.userId,
      repoId: candidate.repoId,
      type: 'good_first_issue',
      message: `${candidate.fullName} has good-first-issue signals enabled.`,
      metadata: { fullName: candidate.fullName },
    })
    created += 1
  }

  return { scanned: candidates.length, created }
}

export function sessionTokenFromRequest(request: NextRequest) {
  return request.cookies.get(SESSION_COOKIE)?.value
}
