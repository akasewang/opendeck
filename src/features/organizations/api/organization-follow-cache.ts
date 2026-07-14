'use client'

import { API_ROUTES } from '@/config/routes'
import { isRecord } from '@/lib/api/input-normalization'

export const organizationFollowCache = new Map<string, boolean>()

const inFlightBatches = new Set<string>()

export async function prefetchOrganizationFollowStates(owners: Array<string | undefined>) {
  const names = Array.from(
    new Set(
      owners.filter(
        (owner): owner is string =>
          typeof owner === 'string' && owner.length > 0 && !organizationFollowCache.has(owner),
      ),
    ),
  ).filter((owner) => !inFlightBatches.has(owner))
  if (names.length === 0) return

  for (const name of names) inFlightBatches.add(name)
  try {
    const response = await fetch(API_ROUTES.account.followsBatch, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      credentials: 'include',
      cache: 'no-store',
      body: JSON.stringify({ targetType: 'organization', targetKeys: names }),
    })
    if (!response.ok) return
    const payload: unknown = await response.json().catch(() => null)
    if (!isRecord(payload) || !isRecord(payload.items)) return
    const items = payload.items
    for (const [owner, following] of Object.entries(items)) {
      if (typeof following === 'boolean') organizationFollowCache.set(owner, following)
    }
  } catch {
    // Best-effort warm-up; the panel falls back to its own fetch if this fails.
  } finally {
    for (const name of names) inFlightBatches.delete(name)
  }
}
