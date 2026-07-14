import type { AuthUser } from '@/features/auth/types/authentication'
import { isRecord } from '@/lib/api/input-normalization'

export function isAuthUser(value: unknown): value is AuthUser {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.email === 'string' &&
    (value.role === 'user' || value.role === 'admin') &&
    (value.status === 'active' || value.status === 'suspended')
  )
}

export function isSessionResponse(value: unknown): value is { user: AuthUser | null } {
  return isRecord(value) && (value.user === null || isAuthUser(value.user))
}
