import { type NextRequest, NextResponse } from 'next/server'
import { compareRepos } from '@/lib/account-features'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const names = (request.nextUrl.searchParams.get('repos') ?? '')
    .split(',')
    .map((name) => name.trim())
    .filter((name) => /^[\w.-]+\/[\w.-]+$/.test(name))
    .slice(0, 4)

  if (names.length === 0) {
    return NextResponse.json({ error: 'Add one to four repositories to compare.' }, { status: 400 })
  }

  try {
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
