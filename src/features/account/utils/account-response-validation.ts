import type {
  AccountHubCollectionDetail,
  AccountHubSearchPreview,
  AccountOverview,
} from '@/features/account/types/account-hub'
import {
  ACCOUNT_DIGEST_FREQUENCIES,
  ACCOUNT_PIPELINE_STAGE_IDS,
} from '@/features/account/constants/account-options'
import { REPOSITORY_SEARCH_SORTS } from '@/features/repositories/constants/repository-options'
import { isRepositoryApiItem } from '@/features/repositories/utils/repository-response-validation'
import { isRecord } from '@/lib/api/input-normalization'

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

function isOptionalString(value: unknown): value is string | null {
  return value === null || typeof value === 'string'
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
}

function isCollection(value: unknown): value is AccountOverview['collections'][number] {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    isOptionalString(value.description) &&
    (value.visibility === 'private' || value.visibility === 'shared') &&
    isNonNegativeInteger(value.itemCount) &&
    isOptionalString(value.shareSlug) &&
    isOptionalString(value.templateKey) &&
    isOptionalString(value.publishedAt)
  )
}

function isRepoWithState(value: unknown): value is AccountOverview['savedRepos'][number] {
  if (!isRecord(value) || !isRepositoryApiItem(value.repo) || !isRecord(value.state)) {
    return false
  }
  const state = value.state
  return (
    isOptionalString(state.savedAt) &&
    isOptionalString(state.hiddenAt) &&
    isOptionalString(state.dismissedAt) &&
    isOptionalString(state.reviewedAt) &&
    ACCOUNT_PIPELINE_STAGE_IDS.some((stage) => stage === state.pipelineStage) &&
    isOptionalString(state.note) &&
    typeof state.alertEnabled === 'boolean'
  )
}

function hasValidPreferences(value: unknown): value is AccountOverview['preferences'] {
  if (!isRecord(value)) return false
  return (
    isOptionalString(value.defaultLanguage) &&
    REPOSITORY_SEARCH_SORTS.some((sort) => sort === value.defaultSort) &&
    (value.theme === 'light' || value.theme === 'dark' || value.theme === 'system') &&
    isStringArray(value.preferredLanguages) &&
    isStringArray(value.preferredTopics) &&
    isNonNegativeInteger(value.minStars) &&
    typeof value.includeLowIssueCount === 'boolean' &&
    typeof value.emailDigestEnabled === 'boolean' &&
    ACCOUNT_DIGEST_FREQUENCIES.some((frequency) => frequency === value.digestFrequency) &&
    isNonNegativeInteger(value.digestDay) &&
    value.digestDay <= 6 &&
    typeof value.goodFirstAlertsEnabled === 'boolean' &&
    typeof value.privateProfile === 'boolean' &&
    isStringArray(value.excludedLanguages) &&
    isStringArray(value.excludedTopics) &&
    typeof value.excludeArchived === 'boolean' &&
    typeof value.excludeResourceLists === 'boolean' &&
    typeof value.excludeLowActivity === 'boolean' &&
    (value.setupDifficulty === 'any' ||
      value.setupDifficulty === 'easy' ||
      value.setupDifficulty === 'medium' ||
      value.setupDifficulty === 'advanced')
  )
}

function isIssue(value: unknown): value is NonNullable<AccountOverview['issues']>[number] {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    (value.fullName === undefined || typeof value.fullName === 'string') &&
    isNonNegativeInteger(value.number) &&
    typeof value.title === 'string' &&
    typeof value.htmlUrl === 'string' &&
    isStringArray(value.labels) &&
    isNonNegativeInteger(value.comments) &&
    isOptionalString(value.updatedAt) &&
    typeof value.score === 'number' &&
    Number.isFinite(value.score)
  )
}

export function isAccountOverview(value: unknown): value is AccountOverview {
  if (
    !isRecord(value) ||
    !isRecord(value.user) ||
    !hasValidPreferences(value.preferences) ||
    !isRecord(value.stats) ||
    !isRecord(value.onboarding)
  ) {
    return false
  }
  const stats = value.stats

  return (
    typeof value.user.id === 'string' &&
    typeof value.user.name === 'string' &&
    typeof value.user.email === 'string' &&
    (value.user.role === 'user' || value.user.role === 'admin') &&
    ['saved', 'collections', 'follows', 'unreadAlerts', 'pipeline'].every((key) =>
      isNonNegativeInteger(stats[key]),
    ) &&
    typeof value.onboarding.skillLevel === 'string' &&
    isNonNegativeInteger(value.onboarding.weeklyHours) &&
    isStringArray(value.onboarding.goals) &&
    isStringArray(value.onboarding.languages) &&
    isStringArray(value.onboarding.topics) &&
    isOptionalString(value.onboarding.completedAt) &&
    Array.isArray(value.collections) &&
    value.collections.every(isCollection) &&
    Array.isArray(value.savedSearches) &&
    value.savedSearches.every(
      (search) =>
        isRecord(search) &&
        typeof search.id === 'string' &&
        typeof search.name === 'string' &&
        isOptionalString(search.query) &&
        isRecord(search.filters) &&
        typeof search.alertEnabled === 'boolean' &&
        isOptionalString(search.lastCheckedAt),
    ) &&
    Array.isArray(value.emailDeliveries) &&
    value.emailDeliveries.every(
      (delivery) =>
        isRecord(delivery) &&
        typeof delivery.id === 'string' &&
        typeof delivery.type === 'string' &&
        typeof delivery.subject === 'string' &&
        typeof delivery.status === 'string' &&
        typeof delivery.createdAt === 'string',
    ) &&
    Array.isArray(value.collectionTemplates) &&
    value.collectionTemplates.every(
      (template) =>
        isRecord(template) &&
        typeof template.key === 'string' &&
        typeof template.name === 'string' &&
        typeof template.description === 'string',
    ) &&
    Array.isArray(value.savedRepos) &&
    value.savedRepos.every(isRepoWithState) &&
    Array.isArray(value.pipelineRepos) &&
    value.pipelineRepos.every(isRepoWithState) &&
    Array.isArray(value.follows) &&
    value.follows.every(
      (follow) =>
        isRecord(follow) &&
        typeof follow.id === 'string' &&
        (follow.targetType === 'repo' || follow.targetType === 'organization') &&
        typeof follow.targetKey === 'string' &&
        typeof follow.alertEnabled === 'boolean' &&
        typeof follow.createdAt === 'string',
    ) &&
    Array.isArray(value.recentViews) &&
    value.recentViews.every(
      (view) =>
        isRecord(view) &&
        typeof view.id === 'string' &&
        typeof view.targetType === 'string' &&
        typeof view.targetKey === 'string' &&
        typeof view.viewedAt === 'string' &&
        (view.repo === null || isRepositoryApiItem(view.repo)),
    ) &&
    Array.isArray(value.alerts) &&
    value.alerts.every(
      (alert) =>
        isRecord(alert) &&
        typeof alert.id === 'string' &&
        typeof alert.type === 'string' &&
        typeof alert.message === 'string' &&
        isOptionalString(alert.readAt) &&
        typeof alert.createdAt === 'string',
    ) &&
    Array.isArray(value.sessions) &&
    value.sessions.every(
      (session) =>
        isRecord(session) &&
        typeof session.id === 'string' &&
        isOptionalString(session.userAgent) &&
        isOptionalString(session.ipAddress) &&
        typeof session.lastSeenAt === 'string' &&
        typeof session.expiresAt === 'string' &&
        isOptionalString(session.revokedAt) &&
        typeof session.current === 'boolean',
    ) &&
    Array.isArray(value.recommendations) &&
    value.recommendations.every(isRepositoryApiItem) &&
    typeof value.recommendationsHasMore === 'boolean' &&
    (value.issues === undefined || (Array.isArray(value.issues) && value.issues.every(isIssue)))
  )
}

export function isAccountCollectionDetail(value: unknown): value is AccountHubCollectionDetail {
  return (
    isRecord(value) &&
    isCollection(value.collection) &&
    Array.isArray(value.items) &&
    value.items.every(isRepositoryApiItem)
  )
}

export function isAccountSearchPreview(value: unknown): value is AccountHubSearchPreview {
  return (
    isRecord(value) &&
    isNonNegativeInteger(value.totalCount) &&
    Array.isArray(value.items) &&
    value.items.every(isRepositoryApiItem)
  )
}

export function isAccountIssueList(
  value: unknown,
): value is NonNullable<AccountOverview['issues']> {
  return Array.isArray(value) && value.every(isIssue)
}

export function isAccountRecommendationPage(
  value: unknown,
): value is { items: AccountOverview['recommendations']; hasMore: boolean } {
  return (
    isRecord(value) &&
    Array.isArray(value.items) &&
    value.items.every(isRepositoryApiItem) &&
    typeof value.hasMore === 'boolean'
  )
}
