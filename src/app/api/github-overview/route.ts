import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { getRepoByFullName, toGithubRepository } from '@/lib/repositories'

export const dynamic = 'force-dynamic'

const FULL_NAME_PATTERN = /^[\w.-]+\/[\w.-]+$/
const CACHE_CONTROL = 'private, max-age=0, must-revalidate'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const repo = searchParams.get('repo')?.trim()

  if (!repo) {
    return NextResponse.json({ error: 'Missing repo name' }, { status: 400 })
  }

  if (!FULL_NAME_PATTERN.test(repo)) {
    return NextResponse.json({ error: 'Invalid repo name' }, { status: 400 })
  }

  const user = await getUserFromRequest(req)
  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401, headers: { 'Cache-Control': 'no-store' } },
    )
  }

  let record: Awaited<ReturnType<typeof getRepoByFullName>>
  try {
    record = await getRepoByFullName(repo)
  } catch (error) {
    console.error('Repository overview query failed', error)
    return NextResponse.json(
      { error: 'Repository overview is temporarily unavailable.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    )
  }

  if (!record) {
    return NextResponse.json(
      { error: 'Repository is not in the OpenDeck mirror yet', repo },
      { status: 404 },
    )
  }

  const response = NextResponse.json(toGithubRepository(record))
  response.headers.set('Cache-Control', CACHE_CONTROL)
  return response
}
