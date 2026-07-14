import { type NextRequest, NextResponse } from 'next/server'
import { normalizeEmail } from '@/features/auth/services/authentication-service'
import { requestMagicLink } from '@/features/auth/services/magic-link-service'
import { requestErrorCode } from '@/features/auth/utils/auth-error-messages'
import { safeErrorContext } from '@/lib/api/errors'
import { readJsonObject } from '@/lib/api/request-body'
import { rateLimit, requestIp } from '@/lib/security/rate-limit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const limited = await rateLimit(`magic-link:${requestIp(request)}`, 5, 60_000)
    if (!limited.allowed) {
      return NextResponse.json(
        { error: 'rate_limited', retryAfterSeconds: limited.retryAfterSeconds },
        { status: 429, headers: { 'Retry-After': String(limited.retryAfterSeconds) } },
      )
    }

    const body = await readJsonObject(request)
    const email = normalizeEmail(body.email)
    const emailLimited = await rateLimit(`magic-link-email:${email}`, 3, 10 * 60_000)
    if (!emailLimited.allowed) {
      return NextResponse.json(
        { error: 'rate_limited', retryAfterSeconds: emailLimited.retryAfterSeconds },
        {
          status: 429,
          headers: { 'Retry-After': String(emailLimited.retryAfterSeconds) },
        },
      )
    }
    const result = await requestMagicLink(body.email, {
      inviteToken: body.inviteToken,
      redirect: body.redirect,
    })
    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    const databaseError =
      message.includes('does not exist') ||
      message.startsWith('Failed query') ||
      message === 'Unable to update the rate-limit bucket.'
    if (databaseError) {
      console.error('Magic-link rate limiting failed', safeErrorContext(error))
      return NextResponse.json({ error: 'unreachable' }, { status: 503 })
    }
    const code = requestErrorCode(message)
    return NextResponse.json({ error: code }, { status: code === 'email_unavailable' ? 503 : 400 })
  }
}
