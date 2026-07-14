import assert from 'node:assert/strict'
import test from 'node:test'
import { AUTH_ERROR_MESSAGES, CALLBACK_ERROR_CODES } from '@/features/auth/data/auth-error-codes'
import { authErrorMessage, callbackErrorCode } from '@/features/auth/utils/auth-error-messages'

test('every magic-link callback failure maps to a safe user-facing message', () => {
  for (const [message, expectedCode] of Object.entries(CALLBACK_ERROR_CODES)) {
    const code = callbackErrorCode(message)
    assert.equal(code, expectedCode)
    assert.equal(authErrorMessage(code), AUTH_ERROR_MESSAGES[expectedCode])
  }
})

test('unknown and retired authentication links use intentional fallback messages', () => {
  assert.equal(callbackErrorCode('unrecognized callback failure'), 'unknown')
  assert.equal(authErrorMessage('unrecognized-code'), AUTH_ERROR_MESSAGES.unknown)
  assert.match(authErrorMessage('verification_retired'), /no longer supported/i)
})

test('rate-limit messages include a validated retry duration', () => {
  assert.equal(
    authErrorMessage('rate_limited', 2),
    'Too many tries. Please wait 2 seconds before asking for another link.',
  )
  assert.equal(authErrorMessage('rate_limited', 0), AUTH_ERROR_MESSAGES.rate_limited)
})
