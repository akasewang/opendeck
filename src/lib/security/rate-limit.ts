import { createHmac } from 'node:crypto'
import { lte, sql } from 'drizzle-orm'
import type { NextRequest } from 'next/server'
import { serverEnv } from '@/config/server-env'
import { db } from '@/db/client'
import { rateLimitBuckets } from '@/db/schema'

function hashRateLimitKey(key: string) {
  return createHmac('sha256', serverEnv.authSecret).update(`rate-limit:${key}`).digest('hex')
}

export async function rateLimit(key: string, limit: number, windowMs: number) {
  if (!key || !Number.isSafeInteger(limit) || limit < 1) {
    throw new Error('Rate limits require a non-empty key and a positive integer limit.')
  }
  if (!Number.isSafeInteger(windowMs) || windowMs < 1_000) {
    throw new Error('Rate-limit windows must be at least one second.')
  }

  const now = new Date()
  const nextResetAt = new Date(now.getTime() + windowMs)
  const [bucket] = await db
    .insert(rateLimitBuckets)
    .values({ key: hashRateLimitKey(key), count: 1, resetAt: nextResetAt, updatedAt: now })
    .onConflictDoUpdate({
      target: rateLimitBuckets.key,
      set: {
        count: sql<number>`case
          when ${rateLimitBuckets.resetAt} <= ${now} then 1
          else ${rateLimitBuckets.count} + 1
        end`,
        resetAt: sql<Date>`case
          when ${rateLimitBuckets.resetAt} <= ${now} then ${nextResetAt}
          else ${rateLimitBuckets.resetAt}
        end`,
        updatedAt: now,
      },
    })
    .returning({ count: rateLimitBuckets.count, resetAt: rateLimitBuckets.resetAt })

  if (!bucket) throw new Error('Unable to update the rate-limit bucket.')
  const allowed = bucket.count <= limit
  return {
    allowed,
    retryAfterSeconds: allowed
      ? 0
      : Math.max(Math.ceil((bucket.resetAt.getTime() - now.getTime()) / 1000), 1),
  }
}

export async function cleanupExpiredRateLimits(before = new Date()) {
  await db.delete(rateLimitBuckets).where(lte(rateLimitBuckets.resetAt, before))
}

export function requestIp(request: NextRequest) {
  const value =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  return value.replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 128) || 'unknown'
}
