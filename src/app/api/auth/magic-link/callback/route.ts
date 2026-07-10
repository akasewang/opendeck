import { type NextRequest, NextResponse } from 'next/server'
import { completeMagicLink } from '@/lib/account'
import { setSessionCookie } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token') ?? ''
    const result = await completeMagicLink(token, request)
    const response = NextResponse.redirect(new URL(result.redirect, request.nextUrl.origin))
    setSessionCookie(response, result.token, result.expiresAt)
    return response
  } catch (error) {
    const message = encodeURIComponent(
      error instanceof Error ? error.message : 'Sign-in link is invalid or expired.',
    )
    return NextResponse.redirect(new URL(`/auth?error=${message}`, request.nextUrl.origin))
  }
}
