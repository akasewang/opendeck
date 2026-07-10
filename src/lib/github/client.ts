import {
  getNextGithubToken,
  parkGithubToken,
  updateGithubTokenRateLimit,
} from '@/lib/github/tokens'

type GithubFetchOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  headers?: HeadersInit
  body?: unknown
  etag?: string | null
  retries?: number
  timeoutMs?: number
}

type GithubFetchResult<T> = {
  status: number
  data: T | null
  etag: string | null
  rateLimitRemaining: number | null
}

class GithubClientError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'GithubClientError'
    this.status = status
  }
}

const GITHUB_API_URL = 'https://api.github.com'

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

function getBackoffMs(attempt: number, response: Response, bodyText: string) {
  const retryAfter = response.headers.get('retry-after')
  if (retryAfter) {
    const seconds = Number.parseInt(retryAfter, 10)
    if (Number.isFinite(seconds)) return seconds * 1000

    const retryAt = Date.parse(retryAfter)
    if (Number.isFinite(retryAt)) return Math.max(retryAt - Date.now(), 1000)
  }

  const reset = response.headers.get('x-ratelimit-reset')
  const isRateLimit =
    response.status === 429 ||
    bodyText.toLowerCase().includes('rate limit') ||
    bodyText.toLowerCase().includes('secondary')

  if (isRateLimit && reset) {
    const resetAt = Number.parseInt(reset, 10) * 1000
    if (Number.isFinite(resetAt)) return Math.max(resetAt - Date.now(), 1000)
  }

  const jitter = Math.floor(Math.random() * 250)
  return Math.min(1000 * 2 ** attempt + jitter, 30_000)
}

type GithubRawFetchOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  headers?: HeadersInit
  body?: BodyInit
  accept?: string
  cache?: RequestCache
  next?: { revalidate?: number | false; tags?: string[] }
  timeoutMs?: number
}

export async function githubFetch(
  pathOrUrl: string,
  options: GithubRawFetchOptions = {},
): Promise<Response> {
  const url = pathOrUrl.startsWith('http') ? pathOrUrl : `${GITHUB_API_URL}${pathOrUrl}`
  const token = getNextGithubToken()
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 10_000)

  const headers = new Headers(options.headers)
  headers.set('Accept', options.accept || headers.get('Accept') || 'application/vnd.github+json')
  if (token) headers.set('Authorization', `Bearer ${token}`)
  headers.set('User-Agent', 'OpenDeck/1.0')
  headers.set('X-GitHub-Api-Version', '2022-11-28')

  try {
    const response = await fetch(url, {
      method: options.method,
      headers,
      body: options.body,
      signal: controller.signal,
      ...(options.cache ? { cache: options.cache } : {}),
      ...(options.next ? { next: options.next } : {}),
    })

    if (token) updateGithubTokenRateLimit(token, response.headers)
    return response
  } finally {
    clearTimeout(timeout)
  }
}

export async function githubFetchJson<T>(
  pathOrUrl: string,
  options: GithubFetchOptions = {},
): Promise<GithubFetchResult<T>> {
  const retries = options.retries ?? 3
  const url = pathOrUrl.startsWith('http') ? pathOrUrl : `${GITHUB_API_URL}${pathOrUrl}`
  let lastError: Error | undefined

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const token = getNextGithubToken()
    if (!token) {
      throw new GithubClientError('No GitHub token is configured or the token is rate limited', 503)
    }

    const headers = new Headers(options.headers)
    headers.set('Accept', headers.get('Accept') || 'application/vnd.github+json')
    headers.set('Authorization', `Bearer ${token}`)
    headers.set('User-Agent', 'OpenDeck-Ingest/1.0')
    headers.set('X-GitHub-Api-Version', '2022-11-28')

    if (options.etag) {
      headers.set('If-None-Match', options.etag)
    }

    const body =
      typeof options.body === 'string' || options.body === undefined
        ? options.body
        : JSON.stringify(options.body)

    if (body && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json')
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 10_000)
    let response: Response

    try {
      response = await fetch(url, {
        method: options.method || (body ? 'POST' : 'GET'),
        headers,
        body,
        signal: controller.signal,
      })
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('GitHub request failed')
      if (attempt < retries) {
        await sleep(getBackoffMs(attempt, new Response(null, { status: 503 }), ''))
        continue
      }
      throw lastError
    } finally {
      clearTimeout(timeout)
    }

    updateGithubTokenRateLimit(token, response.headers)

    const rateLimitRemaining = response.headers.get('x-ratelimit-remaining')
    const remaining = rateLimitRemaining ? Number.parseInt(rateLimitRemaining, 10) : null

    if (response.status === 304) {
      return {
        status: response.status,
        data: null,
        etag: response.headers.get('etag'),
        rateLimitRemaining: remaining,
      }
    }

    if (response.status === 403 || response.status === 429) {
      const bodyText = await response.text()
      const backoffMs = getBackoffMs(attempt, response, bodyText)
      parkGithubToken(token, Date.now() + backoffMs, bodyText.slice(0, 160) || 'rate limited')

      if (attempt < retries) {
        await sleep(Math.min(backoffMs, 30_000))
        continue
      }

      throw new GithubClientError(bodyText || 'GitHub rate limit reached', response.status)
    }

    if (!response.ok) {
      const bodyText = await response.text()
      lastError = new GithubClientError(bodyText || response.statusText, response.status)

      if (attempt < retries && response.status >= 500) {
        await sleep(getBackoffMs(attempt, response, bodyText))
        continue
      }

      throw lastError
    }

    const data = (await response.json()) as T
    return {
      status: response.status,
      data,
      etag: response.headers.get('etag'),
      rateLimitRemaining: remaining,
    }
  }

  throw lastError || new GithubClientError('GitHub request failed', 500)
}

export async function githubGraphql<T>(query: string, variables: Record<string, unknown> = {}) {
  const result = await githubFetchJson<{ data?: T; errors?: unknown[] }>('/graphql', {
    method: 'POST',
    body: { query, variables },
  })

  if (result.data?.errors?.length) {
    throw new GithubClientError(JSON.stringify(result.data.errors), result.status)
  }

  return {
    ...result,
    data: result.data?.data ?? null,
  }
}
