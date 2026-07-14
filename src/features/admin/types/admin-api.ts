export type AdminUser = {
  id: string
  name: string
  email: string
  role: 'user' | 'admin'
  status: 'active' | 'suspended'
  createdAt: string
  sessionCount: number
}

export type AdminInvite = {
  id: string
  email: string | null
  role: string
  expiresAt: string
  acceptedAt: string | null
}

export type AdminAllowlistRule = {
  id: string
  pattern: string
  kind: string
  note: string | null
}

export type AdminIngestionDashboard = {
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

export type AdminUsersResponse = {
  users: AdminUser[]
}

export type AdminSecurityResponse = {
  invites: AdminInvite[]
  allowlist: AdminAllowlistRule[]
}

export type AdminInviteResponse = {
  invite: AdminInvite & { token: string }
}
