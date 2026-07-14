import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { getUserFromRequest } from '@/features/auth/services/authentication-service'
import { REPOSITORY_FULL_NAME_PATTERN } from '@/features/repositories/constants/repository-validation'
import { getRepositoryContributors } from '@/features/repositories/services/repository-contributor-service'
import { CACHE_CONTROL } from '@/lib/api/cache-control'
import { rateLimit } from '@/lib/security/rate-limit'

export const dynamic = 'force-dynamic'

const CONTRIBUTOR_RATE_LIMIT = 30
const CONTRIBUTOR_RATE_LIMIT_WINDOW_MS = 5 * 60_000

function json(payload: unknown, init?: ResponseInit) {
  const response = NextResponse.json(payload, init)
  response.headers.set(
    'Cache-Control',
    init?.status && init.status >= 400 ? CACHE_CONTROL.noStore : CACHE_CONTROL.privateRevalidate,
  )
  return response
}

export async function GET(request: NextRequest) {
  const repo = new URL(request.url).searchParams.get('repo')?.trim()

  if (!repo || !REPOSITORY_FULL_NAME_PATTERN.test(repo)) {
    return json({ contributors: [] }, { status: 400 })
  }

  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401, headers: { 'Cache-Control': CACHE_CONTROL.noStore } },
    )
  }

  try {
    const limited = await rateLimit(
      `repository-contributors:${user.id}`,
      CONTRIBUTOR_RATE_LIMIT,
      CONTRIBUTOR_RATE_LIMIT_WINDOW_MS,
    )
    if (!limited.allowed) {
      return NextResponse.json(
        { error: 'Too many contributor requests.', retryAfterSeconds: limited.retryAfterSeconds },
        {
          status: 429,
          headers: {
            'Cache-Control': CACHE_CONTROL.noStore,
            'Retry-After': String(limited.retryAfterSeconds),
          },
        },
      )
    }

    const result = await getRepositoryContributors(repo)
    if (!result) return json({ error: 'Repository not found.' }, { status: 404 })

    return json(result)
  } catch (error) {
    console.error('Contributor query failed', error)
    return json({ error: 'Contributor data is temporarily unavailable.' }, { status: 503 })
  }
}
