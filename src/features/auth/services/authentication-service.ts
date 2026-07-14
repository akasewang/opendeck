import { createHmac, randomBytes } from 'node:crypto'
import { and, eq, gt, isNull } from 'drizzle-orm'
import type { NextRequest, NextResponse } from 'next/server'
import { serverEnv } from '@/config/server-env'
import { db } from '@/db/client'
import { authSessions, authUsers } from '@/db/schema'
import type { AuthUser } from '@/features/auth/types/authentication'
import { safeErrorContext } from '@/lib/api/errors'

export const SESSION_COOKIE = 'opendeck_session'
const SESSION_DAYS = 30
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type AuthUserRow = typeof authUsers.$inferSelect
type AuthPublicSource = Pick<AuthUserRow, 'id' | 'name' | 'email' | 'role' | 'status'>

export function normalizeEmail(value: unknown) {
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

export function isValidEmail(email: string) {
  return EMAIL_PATTERN.test(email) && email.length <= 254
}

export function normalizeName(value: unknown) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : ''
}

export function toPublicUser(user: AuthPublicSource): AuthUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role === 'admin' ? 'admin' : 'user',
    status: user.status === 'suspended' ? 'suspended' : 'active',
  }
}

export function hashSessionToken(token: string) {
  return createHmac('sha256', serverEnv.authSecret).update(token).digest('hex')
}

export function hashOpaqueToken(token: string) {
  return createHmac('sha256', serverEnv.authSecret).update(`opaque:${token}`).digest('hex')
}

export function createOpaqueToken(bytes = 32) {
  return randomBytes(bytes).toString('base64url')
}

function clientIp(request?: NextRequest) {
  const value =
    request?.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request?.headers.get('x-real-ip')?.trim() ||
    null
  return value?.slice(0, 200) ?? null
}

function sessionExpiresAt() {
  return new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000)
}

export function prepareSession(request?: NextRequest) {
  const token = randomBytes(32).toString('base64url')
  const expiresAt = sessionExpiresAt()

  return {
    token,
    expiresAt,
    record: {
      tokenHash: hashSessionToken(token),
      userAgent: request?.headers.get('user-agent')?.slice(0, 500) ?? null,
      ipAddress: clientIp(request),
      expiresAt,
    },
  }
}

export async function createSession(userId: string, request?: NextRequest) {
  const session = prepareSession(request)

  await db.insert(authSessions).values({
    userId,
    ...session.record,
  })

  return { token: session.token, expiresAt: session.expiresAt }
}

export async function deleteSession(token: string) {
  await db.delete(authSessions).where(eq(authSessions.tokenHash, hashSessionToken(token)))
}

export async function getUserFromRequest(request: NextRequest): Promise<AuthUser | null> {
  return getUserFromSessionToken(request.cookies.get(SESSION_COOKIE)?.value)
}

export async function getUserFromSessionToken(
  token: string | undefined | null,
): Promise<AuthUser | null> {
  if (!token) return null

  const tokenHash = hashSessionToken(token)
  const [row] = await db
    .select({
      id: authUsers.id,
      name: authUsers.name,
      email: authUsers.email,
      role: authUsers.role,
      status: authUsers.status,
    })
    .from(authSessions)
    .innerJoin(authUsers, eq(authSessions.userId, authUsers.id))
    .where(
      and(
        eq(authSessions.tokenHash, tokenHash),
        gt(authSessions.expiresAt, new Date()),
        isNull(authSessions.revokedAt),
        eq(authUsers.status, 'active'),
      ),
    )
    .limit(1)

  if (!row) return null

  try {
    await db
      .update(authSessions)
      .set({ lastSeenAt: new Date() })
      .where(eq(authSessions.tokenHash, tokenHash))
  } catch (error) {
    console.error('Unable to update session activity timestamp', safeErrorContext(error))
  }

  return toPublicUser(row)
}

export function setSessionCookie(response: NextResponse, token: string, expiresAt: Date) {
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: serverEnv.nodeEnv === 'production',
    path: '/',
    expires: expiresAt,
  })
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: serverEnv.nodeEnv === 'production',
    path: '/',
    maxAge: 0,
  })
}
