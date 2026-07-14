import {
  AUTH_ERROR_MESSAGES,
  type AuthErrorCode,
  CALLBACK_ERROR_CODES,
  REQUEST_ERROR_CODES,
} from '@/features/auth/data/auth-error-codes'

function isAuthErrorCode(code: unknown): code is AuthErrorCode {
  return typeof code === 'string' && Object.hasOwn(AUTH_ERROR_MESSAGES, code)
}

export function authErrorMessage(code?: string | null, retryAfterSeconds?: number) {
  if (code === 'rate_limited' && retryAfterSeconds && retryAfterSeconds > 0) {
    const unit = retryAfterSeconds === 1 ? 'second' : 'seconds'
    return `Too many tries. Please wait ${retryAfterSeconds} ${unit} before asking for another link.`
  }
  return isAuthErrorCode(code) ? AUTH_ERROR_MESSAGES[code] : AUTH_ERROR_MESSAGES.unknown
}

export function requestErrorCode(message: string): AuthErrorCode {
  return REQUEST_ERROR_CODES[message] ?? 'unknown'
}

export function callbackErrorCode(message: string): AuthErrorCode {
  return CALLBACK_ERROR_CODES[message] ?? 'unknown'
}
