import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    return NextResponse.json({ user })
  } catch (error) {
    console.error('Session lookup failed', error)
    return NextResponse.json(
      { error: 'Session is temporarily unavailable.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}
