import type { NextRequest } from 'next/server'
import { REPOSITORY_SORTS } from '@/features/repositories/constants'
import { invalidEnumMessage, parseDate, parseEnum, parseNumber } from '@/lib/api/query'
import {
  badRequest,
  mapRepositoryItems,
  type RepositoryApiItem,
  repositoryListResponse,
  repositoryServiceUnavailable,
} from '@/lib/api/repository-responses'
import { searchRepos } from '@/lib/repositories'

const CACHE_CONTROL = 'public, s-maxage=60, stale-while-revalidate=300'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const sortParam = searchParams.get('sort')
  const sort = parseEnum(sortParam, REPOSITORY_SORTS)

  if (sortParam && !sort) {
    return badRequest(invalidEnumMessage('sort', sortParam, REPOSITORY_SORTS))
  }

  let totalCount: number
  let page: number
  let perPage: number
  let items: RepositoryApiItem[] = []

  try {
    const result = await searchRepos({
      query: searchParams.get('q') || searchParams.get('query') || undefined,
      language: searchParams.get('language') || undefined,
      topic: searchParams.get('topic') || undefined,
      license: searchParams.get('license') || undefined,
      minStars: parseNumber(searchParams.get('minStars')),
      maxStars: parseNumber(searchParams.get('maxStars')),
      minForks: parseNumber(searchParams.get('minForks')),
      maxForks: parseNumber(searchParams.get('maxForks')),
      minContributors: parseNumber(searchParams.get('minContributors')),
      pushedAfter: parseDate(searchParams.get('pushedAfter')),
      createdAfter: parseDate(searchParams.get('createdAfter')),
      updatedAfter: parseDate(searchParams.get('updatedAfter')),
      activeOnly: searchParams.get('activeOnly') === 'true',
      contributionReadyOnly: searchParams.get('contributionReadyOnly') !== 'false',
      starterFriendlyOnly: searchParams.get('starterFriendlyOnly') === 'true',
      hasGoodFirstIssues:
        searchParams.get('hasGoodFirstIssues') === null
          ? undefined
          : searchParams.get('hasGoodFirstIssues') === 'true',
      page: parseNumber(searchParams.get('page')),
      perPage: parseNumber(searchParams.get('per_page')) || 20,
      sort: sort || 'contribution',
    })

    totalCount = result.totalCount
    page = result.page
    perPage = result.perPage
    items = mapRepositoryItems(result.items)
  } catch (error) {
    console.error('GitHub discover search failed', error)
    return repositoryServiceUnavailable('Repository discovery is temporarily unavailable.')
  }

  return repositoryListResponse(
    {
      totalCount,
      page,
      perPage,
      items,
    },
    CACHE_CONTROL,
  )
}
