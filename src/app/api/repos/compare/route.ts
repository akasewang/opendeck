import { type NextRequest, NextResponse } from 'next/server'
import { REPOSITORY_FULL_NAME_PATTERN } from '@/features/repositories/constants/repository-validation'
import { compareRepos } from '@/features/repositories/services/repository-insight-service'
import { rateLimit, requestIp } from '@/lib/security/rate-limit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const COMPARE_RATE_LIMIT = 20
const COMPARE_RATE_LIMIT_WINDOW_MS = 5 * 60_000

export async function GET(request: NextRequest) {
  const requestedNames = (request.nextUrl.searchParams.get('repos') ?? '')
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean)

  if (
    requestedNames.length > 4 ||
    requestedNames.some((name) => !REPOSITORY_FULL_NAME_PATTERN.test(name))
  ) {
    return NextResponse.json(
      { error: 'Repositories must contain one to four valid owner/name values.' },
      { status: 400 },
    )
  }

  const names = Array.from(
    new Map(requestedNames.map((name) => [name.toLowerCase(), name])).values(),
  )

  if (names.length === 0) {
    return NextResponse.json({ error: 'Add one to four repositories to compare.' }, { status: 400 })
  }

  try {
    const limited = await rateLimit(
      `repository-compare:${requestIp(request)}`,
      COMPARE_RATE_LIMIT,
      COMPARE_RATE_LIMIT_WINDOW_MS,
    )
    if (!limited.allowed) {
      return NextResponse.json(
        { error: 'Too many comparison requests.', retryAfterSeconds: limited.retryAfterSeconds },
        {
          status: 429,
          headers: {
            'Cache-Control': 'no-store',
            'Retry-After': String(limited.retryAfterSeconds),
          },
        },
      )
    }

    const items = (await compareRepos(names)).filter(Boolean)
    return NextResponse.json({ items })
  } catch (error) {
    console.error('Repository comparison query failed', error)
    return NextResponse.json(
      { error: 'Repository comparison is temporarily unavailable.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}
