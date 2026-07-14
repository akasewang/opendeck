import { isRecord } from '@/lib/api/input-normalization'

export const API_ERROR_MESSAGES = {
  requestFailed: 'Request failed.',
} as const

export function apiErrorMessage(payload: unknown, fallback: string) {
  return isRecord(payload) && typeof payload.error === 'string' && payload.error.trim()
    ? payload.error
    : fallback
}

function safeErrorCode(value: unknown) {
  if (typeof value !== 'string' && typeof value !== 'number') return undefined
  const code = String(value).slice(0, 64)
  return /^[A-Za-z0-9_.-]+$/.test(code) ? code : undefined
}

export function safeErrorContext(error: unknown) {
  if (!isRecord(error) && !(error instanceof Error)) {
    return { type: typeof error }
  }

  const record = error as Record<string, unknown>
  const cause = isRecord(record.cause) ? record.cause : undefined
  return {
    name: error instanceof Error ? error.name : 'Error',
    ...(safeErrorCode(record.code) ? { code: safeErrorCode(record.code) } : {}),
    ...(cause && safeErrorCode(cause.code) ? { causeCode: safeErrorCode(cause.code) } : {}),
  }
}

export class ApiError extends Error {
  readonly status: number
  readonly payload: unknown

  constructor(message: string, status: number, payload: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.payload = payload
  }
}
