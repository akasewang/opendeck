import type { NextRequest } from 'next/server'
import { REPOSITORY_CURATED_SOURCES } from '@/features/repositories/constants/repository-options'
import {
  listCuratedRepos,
  searchRepos,
} from '@/features/repositories/services/repository-query-service'
import {
  badRequest,
  mapRepositoryItems,
  type RepositoryApiItem,
  repositoryListResponse,
  repositoryServiceUnavailable,
} from '@/features/repositories/services/repository-response'
import { CACHE_CONTROL } from '@/lib/api/cache-control'
import {
  invalidEnumMessage,
  parseEnum,
  parseOptionalInteger,
  parseOptionalTextParameter,
} from '@/lib/api/query-parameters'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const requestedSource = searchParams.get('source')
  const parsedSource = parseEnum(requestedSource, REPOSITORY_CURATED_SOURCES)

  if (requestedSource && !parsedSource) {
    return badRequest(invalidEnumMessage('source', requestedSource, REPOSITORY_CURATED_SOURCES))
  }

  const source = parsedSource ?? 'github'
  const parsedPage = parseOptionalInteger('page', searchParams.get('page'), { min: 1 })
  const parsedPerPage = parseOptionalInteger('per_page', searchParams.get('per_page'), {
    min: 1,
    max: 100,
  })
  if (parsedPage.error || parsedPerPage.error) {
    return badRequest(parsedPage.error ?? parsedPerPage.error ?? 'Invalid pagination.')
  }
  const parsedQuery = parseOptionalTextParameter(
    'q',
    searchParams.get('q') ?? searchParams.get('query'),
    200,
  )
  const parsedLanguage = parseOptionalTextParameter('language', searchParams.get('language'), 80)
  if (parsedQuery.error || parsedLanguage.error) {
    return badRequest(parsedQuery.error ?? parsedLanguage.error ?? 'Invalid filter.')
  }
  const requestedPage = parsedPage.value
  const requestedPerPage = parsedPerPage.value
  let items: RepositoryApiItem[] = []
  let totalCount = 0
  let page = requestedPage || 1
  let perPage = requestedPerPage || 20

  try {
    const result = await listCuratedRepos(source, {
      query: parsedQuery.value,
      language: parsedLanguage.value,
      page: requestedPage,
      perPage: requestedPerPage,
    })

    totalCount = result.totalCount
    page = result.page
    perPage = result.perPage
    items = mapRepositoryItems(result.items)

    if (source === 'github' && items.length === 0) {
      const mirrorResults = await searchRepos({
        sort: 'contribution',
        contributionReadyOnly: true,
        page,
        perPage,
      })
      totalCount = mirrorResults.totalCount
      page = mirrorResults.page
      perPage = mirrorResults.perPage
      items = mapRepositoryItems(mirrorResults.items)
    }
  } catch (error) {
    console.error('Curated repository query failed', error)
    return repositoryServiceUnavailable('Curated repositories are temporarily unavailable.')
  }

  return repositoryListResponse(
    {
      totalCount,
      page,
      perPage,
      items,
    },
    CACHE_CONTROL.publicStandard,
  )
}
