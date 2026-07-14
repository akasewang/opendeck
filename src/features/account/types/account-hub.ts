import type { RepositoryApiItem } from '@/features/repositories/types/repository'
import type {
  AccountDigestFrequency,
  AccountPipelineStage,
} from '@/features/account/constants/account-options'
import type { RepoSearchParams } from '@/features/repositories/types/repository-query'

type RepoState = {
  savedAt: string | null
  hiddenAt: string | null
  dismissedAt: string | null
  reviewedAt: string | null
  pipelineStage: AccountPipelineStage
  note: string | null
  alertEnabled: boolean
}

export type AccountHubRepoWithState = {
  repo: RepositoryApiItem
  state: RepoState
}

export type AccountOverview = {
  user: {
    id: string
    name: string
    email: string
    role: 'user' | 'admin'
  }
  preferences: {
    defaultLanguage: string | null
    defaultSort: NonNullable<RepoSearchParams['sort']>
    theme: 'light' | 'dark' | 'system'
    preferredLanguages: string[]
    preferredTopics: string[]
    minStars: number
    includeLowIssueCount: boolean
    emailDigestEnabled: boolean
    digestFrequency: AccountDigestFrequency
    digestDay: number
    goodFirstAlertsEnabled: boolean
    privateProfile: boolean
    excludedLanguages: string[]
    excludedTopics: string[]
    excludeArchived: boolean
    excludeResourceLists: boolean
    excludeLowActivity: boolean
    setupDifficulty: 'any' | 'easy' | 'medium' | 'advanced'
  }
  stats: {
    saved: number
    collections: number
    follows: number
    unreadAlerts: number
    pipeline: number
  }
  collections: Array<{
    id: string
    name: string
    description: string | null
    visibility: 'private' | 'shared'
    itemCount: number
    shareSlug: string | null
    templateKey: string | null
    publishedAt: string | null
  }>
  onboarding: {
    skillLevel: string
    weeklyHours: number
    goals: string[]
    languages: string[]
    topics: string[]
    completedAt: string | null
  }
  savedSearches: Array<{
    id: string
    name: string
    query: string | null
    filters: Record<string, unknown>
    alertEnabled: boolean
    lastCheckedAt: string | null
  }>
  emailDeliveries: Array<{
    id: string
    type: string
    subject: string
    status: string
    createdAt: string
  }>
  collectionTemplates: Array<{
    key: string
    name: string
    description: string
  }>
  issues?: Array<{
    id: string
    fullName?: string
    number: number
    title: string
    htmlUrl: string
    labels: string[]
    comments: number
    updatedAt: string | null
    score: number
  }>
  savedRepos: AccountHubRepoWithState[]
  pipelineRepos: AccountHubRepoWithState[]
  follows: Array<{
    id: string
    targetType: 'repo' | 'organization'
    targetKey: string
    alertEnabled: boolean
    createdAt: string
  }>
  recentViews: Array<{
    id: string
    targetType: string
    targetKey: string
    viewedAt: string
    repo: RepositoryApiItem | null
  }>
  alerts: Array<{
    id: string
    type: string
    message: string
    readAt: string | null
    createdAt: string
  }>
  sessions: Array<{
    id: string
    userAgent: string | null
    ipAddress: string | null
    lastSeenAt: string
    expiresAt: string
    revokedAt: string | null
    current: boolean
  }>
  recommendations: RepositoryApiItem[]
  recommendationsHasMore: boolean
}

export type AccountHubCollectionDetail = {
  collection: AccountOverview['collections'][number]
  items: RepositoryApiItem[]
}

export type AccountHubSearchPreview = {
  totalCount: number
  items: RepositoryApiItem[]
}
