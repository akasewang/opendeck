import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { getUserFromRequest } from '@/features/auth/services/authentication-service'
import { getOrganizationProfile } from '@/features/organizations/services/organization-profile-service'
import { GITHUB_OWNER_PATTERN } from '@/features/repositories/constants/repository-validation'
import { CACHE_CONTROL } from '@/lib/api/cache-control'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const owner = new URL(request.url).searchParams.get('owner')?.trim()

  if (!owner || !GITHUB_OWNER_PATTERN.test(owner)) {
    return NextResponse.json({ error: 'Invalid organization owner.' }, { status: 400 })
  }

  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401, headers: { 'Cache-Control': 'no-store' } },
    )
  }

  try {
    const response = NextResponse.json(await getOrganizationProfile(owner))

    response.headers.set('Cache-Control', CACHE_CONTROL.privateRevalidate)
    return response
  } catch (error) {
    console.error('Organization profile query failed', error)
    return NextResponse.json(
      { error: 'Organization profile is temporarily unavailable.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}
