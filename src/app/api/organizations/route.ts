import { NextResponse } from 'next/server'
import { listOrganizations } from '@/features/organizations/services/organization-query-service'
import { CACHE_CONTROL } from '@/lib/api/cache-control'
import { parseOptionalInteger } from '@/lib/api/query-parameters'

export async function GET(request: Request) {
  const parsedLimit = parseOptionalInteger(
    'limit',
    new URL(request.url).searchParams.get('limit'),
    {
      min: 1,
      max: 500,
    },
  )
  if (parsedLimit.error) {
    return NextResponse.json({ error: parsedLimit.error }, { status: 400 })
  }
  const limit = parsedLimit.value ?? 150

  try {
    const organizations = await listOrganizations(limit)
    const response = NextResponse.json({
      total_count: organizations.length,
      items: organizations,
    })

    response.headers.set('Cache-Control', CACHE_CONTROL.publicStandard)
    return response
  } catch (error) {
    console.error('Organization query failed', error)
    return NextResponse.json(
      { error: 'Organizations are temporarily unavailable.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}
