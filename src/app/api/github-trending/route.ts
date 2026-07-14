import type { NextRequest } from 'next/server'
import { listTrendingRepos } from '@/features/repositories/services/repository-query-service'
import {
  badRequest,
  mapRepositoryItems,
  type RepositoryApiItem,
  repositoryListResponse,
  repositoryServiceUnavailable,
} from '@/features/repositories/services/repository-response'
import { CACHE_CONTROL } from '@/lib/api/cache-control'
import { parseOptionalInteger, parseOptionalTextParameter } from '@/lib/api/query-parameters'

export async function GET(req: NextRequest) {
  const parsedPage = parseOptionalInteger('page', req.nextUrl.searchParams.get('page'), { min: 1 })
  const parsedPerPage = parseOptionalInteger('per_page', req.nextUrl.searchParams.get('per_page'), {
    min: 1,
    max: 100,
  })
  if (parsedPage.error || parsedPerPage.error) {
    return badRequest(parsedPage.error ?? parsedPerPage.error ?? 'Invalid pagination.')
  }
  const parsedQuery = parseOptionalTextParameter(
    'q',
    req.nextUrl.searchParams.get('q') ?? req.nextUrl.searchParams.get('query'),
    200,
  )
  const parsedLanguage = parseOptionalTextParameter(
    'language',
    req.nextUrl.searchParams.get('language'),
    80,
  )
  if (parsedQuery.error || parsedLanguage.error) {
    return badRequest(parsedQuery.error ?? parsedLanguage.error ?? 'Invalid filter.')
  }
  let items: RepositoryApiItem[] = []
  let totalCount = 0
  let page = 1
  let perPage = 20

  try {
    const result = await listTrendingRepos({
      query: parsedQuery.value,
      language: parsedLanguage.value,
      page: parsedPage.value,
      perPage: parsedPerPage.value,
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
    CACHE_CONTROL.publicShort,
  )
}
