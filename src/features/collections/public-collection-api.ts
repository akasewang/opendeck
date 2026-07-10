import { NextResponse } from 'next/server'
import { getPublicCollection } from '@/lib/account-features'

export async function getPublicCollectionResponse(slug: string) {
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
