import { type NextRequest, NextResponse } from 'next/server'
import { completeMagicLink } from '@/features/auth/services/magic-link-service'
import { setSessionCookie } from '@/features/auth/services/authentication-service'
import { callbackErrorCode } from '@/features/auth/utils/auth-error-messages'
import { safeErrorContext } from '@/lib/api/errors'

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
    const code = callbackErrorCode(error instanceof Error ? error.message : '')
    if (code === 'unknown') {
      console.error('Magic-link callback failed unexpectedly', safeErrorContext(error))
    }
    return NextResponse.redirect(new URL(`/?error=${code}`, request.nextUrl.origin))
  }
}
