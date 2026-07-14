import { API_ERROR_MESSAGES, ApiError, apiErrorMessage } from '@/lib/api/errors'

export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs: number,
) {
  const controller = new AbortController()
  const upstreamSignal = init.signal
  const abortFromUpstream = () => controller.abort(upstreamSignal?.reason)
  if (upstreamSignal?.aborted) abortFromUpstream()
  else upstreamSignal?.addEventListener('abort', abortFromUpstream, { once: true })
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await fetch(input, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timeout)
    upstreamSignal?.removeEventListener('abort', abortFromUpstream)
  }
}

export async function requestJson(input: RequestInfo | URL, init: RequestInit = {}) {
  const response = await fetch(input, init)
  const payload: unknown = await response.json().catch(() => null)

  if (!response.ok) {
    const message = apiErrorMessage(payload, API_ERROR_MESSAGES.requestFailed)
    throw new ApiError(message, response.status, payload)
  }

  return payload
}

export function getJson(path: string) {
  return requestJson(path, { credentials: 'include', cache: 'no-store' })
}

export function postJson(path: string, body: Record<string, unknown>) {
  return requestJson(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  })
}
