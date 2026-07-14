import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { getUserFromRequest } from '@/features/auth/services/authentication-service'
import { REPOSITORY_FULL_NAME_PATTERN } from '@/features/repositories/constants/repository-validation'
import {
  getRepoByFullName,
  toGithubRepository,
} from '@/features/repositories/services/repository-query-service'
import { CACHE_CONTROL } from '@/lib/api/cache-control'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const repo = searchParams.get('repo')?.trim()

  if (!repo) {
    return NextResponse.json({ error: 'Missing repository name' }, { status: 400 })
  }

  if (!REPOSITORY_FULL_NAME_PATTERN.test(repo)) {
    return NextResponse.json({ error: 'Invalid repository name' }, { status: 400 })
  }

  const user = await getUserFromRequest(req)
  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401, headers: { 'Cache-Control': CACHE_CONTROL.noStore } },
    )
  }

  let record: Awaited<ReturnType<typeof getRepoByFullName>>
  try {
    record = await getRepoByFullName(repo)
  } catch (error) {
    console.error('Repository overview query failed', error)
    return NextResponse.json(
      { error: 'Repository overview is temporarily unavailable.' },
      { status: 503, headers: { 'Cache-Control': CACHE_CONTROL.noStore } },
    )
  }

  if (!record) {
    return NextResponse.json(
      { error: 'Repository is not in the OpenDeck mirror yet', repo },
      { status: 404 },
    )
  }

  const response = NextResponse.json(toGithubRepository(record))
  response.headers.set('Cache-Control', CACHE_CONTROL.privateRevalidate)
  return response
}
