import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { clearSessionCookie, deleteSession, SESSION_COOKIE } from '@/lib/auth'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value
  if (token) await deleteSession(token).catch(() => {})

  const response = NextResponse.json({ ok: true })
  clearSessionCookie(response)
  return response
}
