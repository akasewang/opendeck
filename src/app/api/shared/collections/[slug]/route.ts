import { type NextRequest, NextResponse } from 'next/server'
import { getPublicCollection } from '@/features/collections/services/public-collection-service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type RouteContext = {
  params: Promise<{ slug: string }>
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const { slug } = await context.params
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 120) {
    return NextResponse.json({ error: 'Invalid collection link.' }, { status: 400 })
  }

  try {
    const payload = await getPublicCollection(slug)
    if (!payload) return NextResponse.json({ error: 'Collection not found.' }, { status: 404 })
    return NextResponse.json(payload)
  } catch (error) {
    console.error('Shared collection query failed', error)
    return NextResponse.json(
      { error: 'Shared collection is temporarily unavailable.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}
