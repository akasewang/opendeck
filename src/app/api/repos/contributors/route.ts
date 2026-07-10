import { eq } from 'drizzle-orm'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { db } from '@/db'
import { repos } from '@/db/schema'
import type { Contributor } from '@/features/repositories/types'
import { getUserFromRequest } from '@/lib/auth'
import { githubFetch } from '@/lib/github/client'

export const dynamic = 'force-dynamic'

const FULL_NAME_PATTERN = /^[\w.-]+\/[\w.-]+$/
const CONTRIBUTORS_PER_PAGE = 100
const GITHUB_REVALIDATE_SECONDS = 3600
const PRIVATE_CACHE_CONTROL = 'private, max-age=0, must-revalidate'

function json(payload: unknown, init?: ResponseInit) {
  const response = NextResponse.json(payload, init)
  response.headers.set('Cache-Control', PRIVATE_CACHE_CONTROL)
  return response
}

type GithubContributor = {
  login?: string | null
  name?: string | null
  avatar_url?: string | null
  html_url?: string | null
  contributions?: number | null
}

function nextContributorPage(link: string | null) {
  if (!link) return null

  for (const part of link.split(',')) {
    const [urlPart, ...params] = part.split(';').map((value) => value.trim())
    if (!params.some((param) => param === 'rel="next"')) continue

    const href = urlPart.match(/^<(.+)>$/)?.[1]
    if (!href) return null

    try {
      const page = new URL(href).searchParams.get('page')
      return page ? Number.parseInt(page, 10) : null
    } catch {
      return null
    }
  }

  return null
}

async function fetchContributorPages(repo: string) {
  const contributors: GithubContributor[] = []
  let page = 1

  while (page > 0) {
    const response = await githubFetch(
      `/repos/${repo}/contributors?per_page=${CONTRIBUTORS_PER_PAGE}&page=${page}&anonymous=true`,
      { next: { revalidate: GITHUB_REVALIDATE_SECONDS } },
    )

    if (response.status === 204) return contributors
    if (!response.ok) throw new Error('Contributor data is temporarily unavailable.')

    const data = (await response.json().catch(() => null)) as GithubContributor[] | null
    if (Array.isArray(data)) contributors.push(...data)

    const nextPage = nextContributorPage(response.headers.get('link'))
    if (!nextPage || nextPage <= page) break
    page = nextPage
  }

  return contributors
}

async function backfillContributorCount(repo: string, count: number) {
  try {
    await db.update(repos).set({ contributors: count }).where(eq(repos.fullName, repo))
  } catch {}
}

export async function GET(request: NextRequest) {
  const repo = new URL(request.url).searchParams.get('repo')?.trim()

  if (!repo || !FULL_NAME_PATTERN.test(repo)) {
    return json({ contributors: [] }, { status: 400 })
  }

  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401, headers: { 'Cache-Control': 'no-store' } },
    )
  }

  try {
    const data = await fetchContributorPages(repo)
    const contributors: Contributor[] = data
      .map((item) => ({
        login: item.login?.trim() || item.name?.trim() || 'Anonymous contributor',
        avatarUrl: item.avatar_url ?? null,
        htmlUrl:
          item.html_url ??
          (item.login
            ? `https://github.com/${item.login}`
            : `https://github.com/${repo}/graphs/contributors`),
        contributions: item.contributions ?? 0,
        isAnonymous: !item.login,
      }))
      .filter((item) => item.login)

    const resolvedCount = contributors.length
    if (resolvedCount > 0) await backfillContributorCount(repo, resolvedCount)

    return json({ contributors, totalCount: resolvedCount })
  } catch (error) {
    console.error('Contributor query failed', error)
    return json({ error: 'Contributor data is temporarily unavailable.' }, { status: 503 })
  }
}
