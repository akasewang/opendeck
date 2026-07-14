import type { NextRequest } from 'next/server'
import { searchRepos } from '@/features/repositories/services/repository-query-service'
import {
  badRequest,
  mapRepositoryItems,
  type RepositoryApiItem,
  repositoryListResponse,
  repositoryServiceUnavailable,
} from '@/features/repositories/services/repository-response'
import { parseRepositorySearchParams } from '@/features/repositories/utils/repository-search-params'
import { CACHE_CONTROL } from '@/lib/api/cache-control'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const parsed = parseRepositorySearchParams(searchParams, {
    sort: 'relevance',
    contributionReadyOnly: false,
  })

  if (!parsed.params) return badRequest(parsed.error)

  let totalCount: number
  let page: number
  let perPage: number
  let items: RepositoryApiItem[] = []

  try {
    const result = await searchRepos(parsed.params)

    totalCount = result.totalCount
    page = result.page
    perPage = result.perPage
    items = mapRepositoryItems(result.items)
  } catch (error) {
    console.error('Repository search failed', error)
    return repositoryServiceUnavailable('Repository search is temporarily unavailable.')
  }

  return repositoryListResponse(
    {
      totalCount,
      page,
      perPage,
      items,
    },
    CACHE_CONTROL.publicBrief,
  )
}
