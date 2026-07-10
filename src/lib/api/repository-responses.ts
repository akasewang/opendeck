import { NextResponse } from 'next/server'
import type { RepoWithCurated } from '@/lib/repositories'
import { toGithubRepository } from '@/lib/repositories'

export type RepositoryApiItem = ReturnType<typeof toGithubRepository>

export function mapRepositoryItems(items: RepoWithCurated[]) {
  return items.map(toGithubRepository)
}

export function repositoryListResponse(
  payload: {
    totalCount: number
    page: number
    perPage: number
    items: RepositoryApiItem[]
  },
  cacheControl: string,
) {
  const response = NextResponse.json({
    total_count: payload.totalCount,
    page: payload.page,
    per_page: payload.perPage,
    items: payload.items,
  })

  response.headers.set('Cache-Control', cacheControl)
  return response
}

export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 })
}

export function repositoryServiceUnavailable(
  message = 'Repository data is temporarily unavailable.',
) {
  return NextResponse.json(
    { error: message },
    { status: 503, headers: { 'Cache-Control': 'no-store' } },
  )
}
