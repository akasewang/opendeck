import { NextResponse } from 'next/server'
import { parseBoundedNumber } from '@/lib/api/query'
import { listOrganizations } from '@/lib/repositories'

const CACHE_CONTROL = 'public, s-maxage=300, stale-while-revalidate=3600'

export async function GET(request: Request) {
  const limit = parseBoundedNumber(new URL(request.url).searchParams.get('limit'), {
    min: 1,
    max: 500,
    fallback: 150,
  })

  try {
    const organizations = await listOrganizations(limit)
    const response = NextResponse.json({
      total_count: organizations.length,
      items: organizations,
    })

    response.headers.set('Cache-Control', CACHE_CONTROL)
    return response
  } catch (error) {
    console.error('Organization query failed', error)
    return NextResponse.json(
      { error: 'Organizations are temporarily unavailable.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}
