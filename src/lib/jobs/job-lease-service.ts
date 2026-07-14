import { randomUUID } from 'node:crypto'
import { and, eq, lte } from 'drizzle-orm'
import { db } from '@/db/client'
import { automationJobLeases } from '@/db/schema'

const MINIMUM_LEASE_MS = 30_000

type JobLease = {
  key: string
  holderToken: string
  ttlMs: number
}

export type JobLeaseResult<T> =
  | { acquired: true; value: T }
  | { acquired: false; reason: 'already_running' }

function boundedTtl(ttlMs: number) {
  if (!Number.isSafeInteger(ttlMs) || ttlMs < MINIMUM_LEASE_MS) {
    throw new Error(`Job leases must last at least ${MINIMUM_LEASE_MS} milliseconds.`)
  }
  return ttlMs
}

async function acquireJobLease(key: string, ttlMs: number): Promise<JobLease | null> {
  if (!key || key.length > 200)
    throw new Error('Job lease keys must be between 1 and 200 characters.')

  const now = new Date()
  const holderToken = randomUUID()
  const boundedLeaseTtl = boundedTtl(ttlMs)
  const expiresAt = new Date(now.getTime() + boundedLeaseTtl)
  const [lease] = await db
    .insert(automationJobLeases)
    .values({ key, holderToken, expiresAt, updatedAt: now })
    .onConflictDoUpdate({
      target: automationJobLeases.key,
      set: { holderToken, expiresAt, updatedAt: now },
      setWhere: lte(automationJobLeases.expiresAt, now),
    })
    .returning({ holderToken: automationJobLeases.holderToken })

  return lease?.holderToken === holderToken ? { key, holderToken, ttlMs: boundedLeaseTtl } : null
}

async function renewJobLease(lease: JobLease) {
  const now = new Date()
  const [renewed] = await db
    .update(automationJobLeases)
    .set({ expiresAt: new Date(now.getTime() + lease.ttlMs), updatedAt: now })
    .where(
      and(
        eq(automationJobLeases.key, lease.key),
        eq(automationJobLeases.holderToken, lease.holderToken),
      ),
    )
    .returning({ key: automationJobLeases.key })
  return Boolean(renewed)
}

async function releaseJobLease(lease: JobLease) {
  await db
    .delete(automationJobLeases)
    .where(
      and(
        eq(automationJobLeases.key, lease.key),
        eq(automationJobLeases.holderToken, lease.holderToken),
      ),
    )
}

export async function withJobLease<T>(key: string, ttlMs: number, work: () => Promise<T>) {
  const lease = await acquireJobLease(key, ttlMs)
  if (!lease) return { acquired: false, reason: 'already_running' } as const

  let renewalInFlight = false
  const renewalTimer = setInterval(
    () => {
      if (renewalInFlight) return
      renewalInFlight = true
      void renewJobLease(lease)
        .then((renewed) => {
          if (!renewed) console.error(`Lost the database lease for job "${key}".`)
        })
        .catch((error) => {
          console.error(`Unable to renew the database lease for job "${key}".`, error)
        })
        .finally(() => {
          renewalInFlight = false
        })
    },
    Math.max(MINIMUM_LEASE_MS, Math.floor(lease.ttlMs / 3)),
  )
  renewalTimer.unref()

  try {
    return { acquired: true, value: await work() } as const
  } finally {
    clearInterval(renewalTimer)
    try {
      await releaseJobLease(lease)
    } catch (error) {
      console.error(`Unable to release the database lease for job "${key}".`, error)
    }
  }
}
