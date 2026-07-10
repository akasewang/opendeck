import type { GithubRepoApiItem } from '@/features/repositories/types'

type RepoState = {
  savedAt: string | null
  hiddenAt: string | null
  dismissedAt: string | null
  reviewedAt: string | null
  pipelineStage: string
  note: string | null
  alertEnabled: boolean
}

export type RepoWithState = {
  repo: GithubRepoApiItem
  state: RepoState
}

export type AccountOverview = {
  user: {
    id: string
    name: string
    email: string
    role: 'user' | 'admin'
    emailVerifiedAt: string | null
  }
  preferences: {
    defaultLanguage: string | null
    defaultSort: string
    theme: string
    preferredLanguages: string[]
    preferredTopics: string[]
    minStars: number
    includeLowIssueCount: boolean
    emailDigestEnabled: boolean
    digestFrequency: string
    digestDay: number
    goodFirstAlertsEnabled: boolean
    privateProfile: boolean
    excludedLanguages: string[]
    excludedTopics: string[]
    excludeArchived: boolean
    excludeResourceLists: boolean
    excludeLowActivity: boolean
    setupDifficulty: string
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
    visibility: string
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
    provider: string | null
    status: string
    sentAt: string | null
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
  savedRepos: RepoWithState[]
  pipelineRepos: RepoWithState[]
  follows: Array<{
    id: string
    targetType: string
    targetKey: string
    alertEnabled: boolean
    createdAt: string
  }>
  recentViews: Array<{
    id: string
    targetType: string
    targetKey: string
    viewedAt: string
    repo: GithubRepoApiItem | null
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
  recommendations: GithubRepoApiItem[]
}

export type AdminUser = {
  id: string
  name: string
  email: string
  role: 'user' | 'admin'
  status: 'active' | 'suspended'
  createdAt: string
  sessionCount: number
}

export type Invite = {
  id: string
  email: string | null
  role: string
  expiresAt: string
  acceptedAt: string | null
}

export type AllowlistRule = {
  id: string
  pattern: string
  kind: string
  note: string | null
}

export type IngestionDashboard = {
  stats: {
    repos: number
    users: number
    savedSearches: number
    sharedCollections: number
    emailDeliveries: Record<string, number>
  }
  latestRuns: Array<{
    id: string
    kind: string
    status: string
    tokensUsed: number
    rateLimitRemaining: number | null
    startedAt: string
    finishedAt: string | null
    error: string | null
  }>
  auditLogs: Array<{
    id: string
    adminId: string | null
    action: string
    targetType: string
    targetId: string | null
    metadata: Record<string, unknown>
    createdAt: string
  }>
}
