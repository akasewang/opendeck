import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { repos } from '@/db/schema'
import type { RepositoryContributor } from '@/features/repositories/types/repository'
import { isRecord } from '@/lib/api/input-normalization'
import { githubFetch } from '@/lib/github/client'

const CONTRIBUTORS_PER_PAGE = 100
const MAX_CONTRIBUTOR_PAGES = 20
const GITHUB_REVALIDATE_SECONDS = 3600

type GithubContributor = {
  login?: string | null
  name?: string | null
  avatar_url?: string | null
  html_url?: string | null
  contributions?: number | null
}

function parseGithubContributor(value: unknown): GithubContributor | null {
  if (!isRecord(value)) return null
  const login = typeof value.login === 'string' ? value.login : null
  const name = typeof value.name === 'string' ? value.name : null
  const avatarUrl = typeof value.avatar_url === 'string' ? value.avatar_url : null
  const htmlUrl = typeof value.html_url === 'string' ? value.html_url : null
  const contributions =
    typeof value.contributions === 'number' &&
    Number.isSafeInteger(value.contributions) &&
    value.contributions >= 0
      ? value.contributions
      : 0

  if (!login && !name) return null
  return {
    login,
    name,
    avatar_url: avatarUrl,
    html_url: htmlUrl?.startsWith('https://github.com/') ? htmlUrl : null,
    contributions,
  }
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
      if (!page || !/^\d+$/.test(page)) return null
      const parsed = Number(page)
      return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null
    } catch {
      return null
    }
  }

  return null
}

async function fetchContributorPages(repo: string) {
  const contributors: GithubContributor[] = []
  let page = 1
  let truncated = false

  while (page > 0 && page <= MAX_CONTRIBUTOR_PAGES) {
    const response = await githubFetch(
      `/repos/${repo}/contributors?per_page=${CONTRIBUTORS_PER_PAGE}&page=${page}&anonymous=true`,
      { next: { revalidate: GITHUB_REVALIDATE_SECONDS } },
    )

    if (response.status === 204) return { contributors, truncated: false }
    if (!response.ok) throw new Error('Contributor data is temporarily unavailable.')

    const data: unknown = await response.json().catch(() => null)
    if (!Array.isArray(data)) throw new Error('GitHub returned an invalid contributor payload.')
    const pageContributors = data.map(parseGithubContributor)
    if (pageContributors.some((item) => item === null)) {
      throw new Error('GitHub returned an invalid contributor record.')
    }
    contributors.push(
      ...pageContributors.filter((item): item is GithubContributor => item !== null),
    )

    const nextPage = nextContributorPage(response.headers.get('link'))
    if (!nextPage || nextPage <= page) break
    if (nextPage > MAX_CONTRIBUTOR_PAGES) {
      truncated = true
      break
    }
    page = nextPage
  }

  return { contributors, truncated }
}

async function backfillContributorCount(repo: string, count: number) {
  try {
    await db.update(repos).set({ contributors: count }).where(eq(repos.fullName, repo))
  } catch (error) {
    console.error('Unable to backfill repository contributor count', error)
  }
}

export async function getRepositoryContributors(repo: string) {
  const [mirrored] = await db
    .select({ id: repos.id })
    .from(repos)
    .where(eq(repos.fullName, repo))
    .limit(1)
  if (!mirrored) return null

  const result = await fetchContributorPages(repo)
  const contributors: RepositoryContributor[] = result.contributors
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

  const totalCount = contributors.length
  if (totalCount > 0 && !result.truncated) {
    await backfillContributorCount(repo, totalCount)
  }

  return { contributors, totalCount, truncated: result.truncated }
}
