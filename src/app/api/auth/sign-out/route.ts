import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import {
  clearSessionCookie,
  deleteSession,
  SESSION_COOKIE,
} from '@/features/auth/services/authentication-service'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value
  if (token) {
    try {
      await deleteSession(token)
    } catch (error) {
      console.error('Unable to delete server session during sign out', error)
    }
  }

  const response = NextResponse.json({ ok: true })
  clearSessionCookie(response)
  return response
}
