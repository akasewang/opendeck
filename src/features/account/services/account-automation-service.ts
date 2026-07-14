import { and, desc, eq, gt, isNotNull, isNull, ne, sql } from 'drizzle-orm'
import { APP_CONFIG } from '@/config/application'
import { db } from '@/db/client'
import {
  authUsers,
  emailDeliveries,
  repos,
  userAlerts,
  userPreferences,
  userRepoStates,
  userSavedSearches,
} from '@/db/schema'
import { savedSearchParams } from '@/features/account/utils/saved-search-params'
import { REPOSITORY_SEARCH_SORTS } from '@/features/repositories/constants/repository-options'
import { searchRepos } from '@/features/repositories/services/repository-query-service'
import { isEmailDeliveryConfigured, sendEmail } from '@/lib/email/email-client'
import { renderEmail } from '@/lib/email/email-templates'

function addUtcMonth(date: Date) {
  const originalDay = date.getUTCDate()
  date.setUTCDate(1)
  date.setUTCMonth(date.getUTCMonth() + 1)
  const daysInTargetMonth = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0),
  ).getUTCDate()
  date.setUTCDate(Math.min(originalDay, daysInTargetMonth))
}

function digestIdempotencyKey(
  userId: string,
  frequency: 'daily' | 'weekly' | 'monthly',
  date: Date,
) {
  const period =
    frequency === 'monthly' ? date.toISOString().slice(0, 7) : date.toISOString().slice(0, 10)
  return `digest/${userId}/${frequency}/${period}`
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
    const updateSearch = db
      .update(userSavedSearches)
      .set({ lastCheckedAt: new Date(), lastMatchedRepoId: match?.id ?? search.lastMatchedRepoId })
      .where(eq(userSavedSearches.id, search.id))

    if (!match || match.id === search.lastMatchedRepoId) {
      await updateSearch
      continue
    }

    await db.batch([
      updateSearch,
      db.insert(userAlerts).values({
        userId: search.userId,
        repoId: match.id,
        type: 'saved_search_match',
        message: `${match.fullName} matches saved search "${search.name}".`,
        metadata: { savedSearchId: search.id, fullName: match.fullName },
      }),
    ])
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
  if (!isEmailDeliveryConfigured()) return { scanned: 0, sent: 0, skipped: 0 }

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
    const digestFrequency = row.prefs.digestFrequency
    if (
      digestFrequency !== 'daily' &&
      digestFrequency !== 'weekly' &&
      digestFrequency !== 'monthly'
    ) {
      skipped += 1
      continue
    }
    const now = new Date()
    if (digestFrequency === 'weekly' && now.getUTCDay() !== row.prefs.digestDay) {
      skipped += 1
      continue
    }

    const [lastDigestAttempt] = await db
      .select()
      .from(emailDeliveries)
      .where(and(eq(emailDeliveries.userId, row.user.id), eq(emailDeliveries.type, 'digest')))
      .orderBy(desc(emailDeliveries.createdAt))
      .limit(1)
    if (lastDigestAttempt) {
      const dueAt = new Date(lastDigestAttempt.createdAt)
      if (lastDigestAttempt.status !== 'sent' && lastDigestAttempt.status !== 'queued') {
        dueAt.setUTCHours(dueAt.getUTCHours() + 1)
      } else if (digestFrequency === 'monthly') {
        addUtcMonth(dueAt)
      } else {
        const minHours = digestFrequency === 'daily' ? 20 : 144
        dueAt.setTime(dueAt.getTime() + minHours * 60 * 60 * 1000)
      }
      if (Date.now() < dueAt.getTime()) {
        skipped += 1
        continue
      }
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
        sort:
          REPOSITORY_SEARCH_SORTS.find((sort) => sort === row.prefs.defaultSort) ?? 'contribution',
      }),
    ])

    const savedNames = saved.map((item) => item.repo.fullName).join(', ') || 'None yet'
    const recommendedNames =
      recommendations.items.map((repo) => repo.fullName).join(', ') || 'None yet'
    const alertCount = alerts.length
    const recommendedCount = recommendations.items.length
    const digestPreview = `${alertCount} unread ${alertCount === 1 ? 'alert' : 'alerts'} and ${recommendedCount} new ${recommendedCount === 1 ? 'repo' : 'repos'} matched your filters.`

    const dashboardUrl = `${APP_CONFIG.url}/dashboard`
    const lines = [
      `Hi ${row.user.name},`,
      '',
      digestPreview,
      '',
      `Unread alerts: ${alertCount}`,
      `Saved repos: ${savedNames}`,
      `Recommended: ${recommendedNames}`,
      '',
      `Open OpenDeck: ${dashboardUrl}`,
      '',
      `${digestFrequency} digest · automated notification`,
    ]

    const result = await sendEmail({
      userId: row.user.id,
      to: row.user.email,
      type: 'digest',
      idempotencyKey: digestIdempotencyKey(row.user.id, digestFrequency, now),
      subject: 'Your OpenDeck contribution digest',
      text: lines.join('\n'),
      html: renderEmail({
        preview: digestPreview,
        eyebrow: 'contribution digest',
        heading: `Your digest is ready, ${row.user.name}.`,
        paragraphs: ['A quick snapshot of what is waiting for you on OpenDeck.'],
        rowsLabel: 'this week',
        rows: [
          { label: 'unread alerts', value: String(alertCount) },
          { label: 'saved repos', value: savedNames },
          { label: 'recommended', value: recommendedNames },
        ],
        button: { label: 'open opendeck', href: dashboardUrl },
        footer: `${digestFrequency} digest · automated notification`,
      }),
      metadata: { frequency: digestFrequency },
    })

    if (result.status === 'sent') sent += 1
    else skipped += 1
  }

  return { scanned: rows.length, sent, skipped }
}
