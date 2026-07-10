import type { NextRequest } from 'next/server'
import { parseNumber } from '@/lib/api/query'
import {
  mapRepositoryItems,
  type RepositoryApiItem,
  repositoryListResponse,
  repositoryServiceUnavailable,
} from '@/lib/api/repository-responses'
import { listTrendingRepos } from '@/lib/repositories'

const CACHE_CONTROL = 'public, s-maxage=60, stale-while-revalidate=300'

export async function GET(req: NextRequest) {
  let items: RepositoryApiItem[] = []
  let totalCount = 0
  let page = 1
  let perPage = 20

  try {
    const result = await listTrendingRepos({
      query:
        req.nextUrl.searchParams.get('q') || req.nextUrl.searchParams.get('query') || undefined,
      language: req.nextUrl.searchParams.get('language') || undefined,
      page: parseNumber(req.nextUrl.searchParams.get('page')),
      perPage: parseNumber(req.nextUrl.searchParams.get('per_page')),
    })

    totalCount = result.totalCount
    page = result.page
    perPage = result.perPage
    items = mapRepositoryItems(result.items)
  } catch (error) {
    console.error('GitHub trending query failed', error)
    return repositoryServiceUnavailable('Trending repositories are temporarily unavailable.')
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
