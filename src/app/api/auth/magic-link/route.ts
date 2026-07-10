import { type NextRequest, NextResponse } from 'next/server'
import { requestMagicLink } from '@/lib/account'
import { rateLimit, requestIp, tooManyRequestsMessage } from '@/lib/rate-limit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function readBody(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  return typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {}
}

export async function POST(request: NextRequest) {
  const limited = rateLimit(`magic-link:${requestIp(request)}`, 5, 60_000)
  if (!limited.allowed) {
    return NextResponse.json(
      { error: tooManyRequestsMessage(limited.retryAfterSeconds) },
      { status: 429, headers: { 'Retry-After': String(limited.retryAfterSeconds) } },
    )
  }

  try {
    const body = await readBody(request)
    const result = await requestMagicLink(body.email, {
      inviteToken: body.inviteToken,
      redirect: body.redirect,
    })
    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to send a sign-in link.'
    const serviceUnavailable =
      message === 'Email delivery is not configured.' ||
      message === 'Unable to send email right now.'
    return NextResponse.json({ error: message }, { status: serviceUnavailable ? 503 : 400 })
  }
}
