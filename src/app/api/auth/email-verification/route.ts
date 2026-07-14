import { type NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export function GET(request: NextRequest) {
  const response = NextResponse.redirect(
    new URL('/?error=verification_retired', request.nextUrl.origin),
  )
  response.headers.set('Cache-Control', 'no-store')
  return response
}
