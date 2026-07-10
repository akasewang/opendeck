import type { NextRequest } from 'next/server'
import { getPublicCollectionResponse } from '@/features/collections/public-collection-api'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type RouteContext = {
  params: Promise<{ slug: string }>
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const { slug } = await context.params
  return getPublicCollectionResponse(slug)
}
