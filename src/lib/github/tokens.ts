import { serverEnv } from '@/lib/server-env'

type GithubTokenState = {
  token: string
  remaining?: number
  resetAt?: number
  parkedUntil?: number
  lastUsedAt?: number
  lastReason?: string
}

let state: GithubTokenState | null = null

function getState() {
  const token = serverEnv.githubToken
  if (!token) {
    state = null
    return null
  }

  if (!state || state.token !== token) {
    state = { token }
  }

  return state
}

function isAvailable(state: GithubTokenState, now = Date.now()) {
  return !state.parkedUntil || state.parkedUntil <= now
}

function maskToken(token: string) {
  if (token.length <= 4) return '****'
  if (token.length <= 8) return `${token.slice(0, 2)}...${token.slice(-2)}`
  return `${token.slice(0, 4)}...${token.slice(-4)}`
}

export function getGithubTokenSnapshot() {
  const tokenState = getState()
  if (!tokenState) return null

  return {
    token: maskToken(tokenState.token),
    remaining: tokenState.remaining,
    resetAt: tokenState.resetAt ? new Date(tokenState.resetAt).toISOString() : undefined,
    parkedUntil: tokenState.parkedUntil
      ? new Date(tokenState.parkedUntil).toISOString()
      : undefined,
    lastUsedAt: tokenState.lastUsedAt ? new Date(tokenState.lastUsedAt).toISOString() : undefined,
    lastReason: tokenState.lastReason,
  }
}

export function parkGithubToken(token: string, parkedUntil: number, reason: string) {
  const tokenState = getState()
  if (!tokenState || tokenState.token !== token) return

  tokenState.parkedUntil = parkedUntil
  tokenState.lastReason = reason
}

export function updateGithubTokenRateLimit(token: string, headers: Headers) {
  const tokenState = getState()
  if (!tokenState || tokenState.token !== token) return

  const remaining = headers.get('x-ratelimit-remaining')
  const reset = headers.get('x-ratelimit-reset')

  if (remaining !== null) {
    tokenState.remaining = Number.parseInt(remaining, 10)
  }

  if (reset !== null) {
    tokenState.resetAt = Number.parseInt(reset, 10) * 1000
  }

  if (tokenState.remaining !== undefined && tokenState.remaining <= 0 && tokenState.resetAt) {
    parkGithubToken(token, tokenState.resetAt + 1000, 'primary rate limit exhausted')
  }
}

export function getNextGithubToken() {
  const tokenState = getState()
  if (!tokenState) return undefined

  const now = Date.now()
  if (!isAvailable(tokenState, now)) return undefined

  tokenState.lastUsedAt = now
  return tokenState.token
}
