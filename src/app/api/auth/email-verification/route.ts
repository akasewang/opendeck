import { type NextRequest, NextResponse } from 'next/server'
import { completeEmailVerification } from '@/lib/account'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function authRedirect(request: NextRequest, params: Record<string, string>) {
  const url = new URL('/auth', request.url)
  url.searchParams.set('redirect', '/dashboard/home')

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value)
  }

  return NextResponse.redirect(url)
}

export async function GET(request: NextRequest) {
  try {
    await completeEmailVerification(request.nextUrl.searchParams.get('token'))
    return authRedirect(request, { message: 'Email verified. Sign in to continue.' })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to verify email.'
    return authRedirect(request, { error: message })
  }
}
