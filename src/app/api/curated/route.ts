import type { NextRequest } from 'next/server'
import { CURATED_SOURCES } from '@/features/repositories/constants'
import { invalidEnumMessage, parseEnum, parseNumber } from '@/lib/api/query'
import {
  badRequest,
  mapRepositoryItems,
  type RepositoryApiItem,
  repositoryListResponse,
  repositoryServiceUnavailable,
} from '@/lib/api/repository-responses'
import { listCuratedRepos, searchRepos } from '@/lib/repositories'

const CACHE_CONTROL = 'public, s-maxage=300, stale-while-revalidate=3600'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const requestedSource = searchParams.get('source')
  const parsedSource = parseEnum(requestedSource, CURATED_SOURCES)

  if (requestedSource && !parsedSource) {
    return badRequest(invalidEnumMessage('source', requestedSource, CURATED_SOURCES))
  }

  const source = parsedSource ?? 'github'
  const requestedPage = parseNumber(searchParams.get('page'))
  const requestedPerPage = parseNumber(searchParams.get('per_page'))
  let items: RepositoryApiItem[] = []
  let totalCount = 0
  let page = requestedPage || 1
  let perPage = requestedPerPage || 20

  try {
    const result = await listCuratedRepos(source, {
      query: searchParams.get('q') || searchParams.get('query') || undefined,
      language: searchParams.get('language') || undefined,
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
    CACHE_CONTROL,
  )
}
