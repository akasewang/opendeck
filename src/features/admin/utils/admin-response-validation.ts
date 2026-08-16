import type {
  AdminAllowlistRule,
  AdminIngestionDashboard,
  AdminInvite,
  AdminInviteResponse,
  AdminSecurityResponse,
  AdminUser,
  AdminUsersResponse,
} from '@/features/admin/types/admin-api'
import { isRecord } from '@/lib/api/input-normalization'

import { isNonNegativeInteger, isNullableString } from '@/lib/api/type-guards'

function isUser(value: unknown): value is AdminUser {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.email === 'string' &&
    (value.role === 'user' || value.role === 'admin') &&
    (value.status === 'active' || value.status === 'suspended') &&
    typeof value.createdAt === 'string' &&
    isNonNegativeInteger(value.sessionCount)
  )
}

function isInvite(value: unknown): value is AdminInvite {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    isNullableString(value.email) &&
    typeof value.role === 'string' &&
    typeof value.expiresAt === 'string' &&
    isNullableString(value.acceptedAt)
  )
}

function isAllowlistRule(value: unknown): value is AdminAllowlistRule {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.pattern === 'string' &&
    typeof value.kind === 'string' &&
    isNullableString(value.note)
  )
}

export function isAdminUsersResponse(value: unknown): value is AdminUsersResponse {
  return isRecord(value) && Array.isArray(value.users) && value.users.every(isUser)
}

export function isAdminSecurityResponse(value: unknown): value is AdminSecurityResponse {
  return (
    isRecord(value) &&
    Array.isArray(value.invites) &&
    value.invites.every(isInvite) &&
    Array.isArray(value.allowlist) &&
    value.allowlist.every(isAllowlistRule)
  )
}

export function isAdminInviteResponse(value: unknown): value is AdminInviteResponse {
  if (!isRecord(value) || !isRecord(value.invite)) return false
  const invite = value.invite
  return typeof invite.token === 'string' && isInvite(invite)
}

export function isAdminIngestionDashboard(value: unknown): value is AdminIngestionDashboard {
  if (!isRecord(value) || !isRecord(value.stats)) return false
  return (
    isNonNegativeInteger(value.stats.repos) &&
    isNonNegativeInteger(value.stats.users) &&
    isNonNegativeInteger(value.stats.savedSearches) &&
    isNonNegativeInteger(value.stats.sharedCollections) &&
    isRecord(value.stats.emailDeliveries) &&
    Object.values(value.stats.emailDeliveries).every(isNonNegativeInteger) &&
    Array.isArray(value.latestRuns) &&
    value.latestRuns.every(
      (run) =>
        isRecord(run) &&
        typeof run.id === 'string' &&
        typeof run.kind === 'string' &&
        typeof run.status === 'string' &&
        isNonNegativeInteger(run.tokensUsed) &&
        (run.rateLimitRemaining === null || isNonNegativeInteger(run.rateLimitRemaining)) &&
        typeof run.startedAt === 'string' &&
        isNullableString(run.finishedAt) &&
        isNullableString(run.error),
    ) &&
    Array.isArray(value.auditLogs) &&
    value.auditLogs.every(
      (log) =>
        isRecord(log) &&
        typeof log.id === 'string' &&
        isNullableString(log.adminId) &&
        typeof log.action === 'string' &&
        typeof log.targetType === 'string' &&
        isNullableString(log.targetId) &&
        isRecord(log.metadata) &&
        typeof log.createdAt === 'string',
    )
  )
}
