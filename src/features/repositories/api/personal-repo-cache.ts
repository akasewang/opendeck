'use client'

import { API_ROUTES } from '@/config/routes'
import {
  ACCOUNT_PIPELINE_STAGE_IDS,
  type AccountPipelineStage,
} from '@/features/account/constants/account-options'
import { isRecord } from '@/lib/api/input-normalization'

export type PersonalRepoPayload = {
  state: {
    savedAt: string | null
    hiddenAt: string | null
    dismissedAt: string | null
    reviewedAt: string | null
    pipelineStage: AccountPipelineStage
    note: string | null
    alertEnabled: boolean
  }
  following: boolean
  collections: Array<{
    id: string
    name: string
    containsRepo: boolean
  }>
}

const personalRepoStateCache = new Map<string, PersonalRepoPayload>()

function personalRepoCacheKey(userId: string, fullName: string) {
  return `${userId}:${fullName.toLowerCase()}`
}

export function getCachedPersonalRepoState(userId: string, fullName: string) {
  return personalRepoStateCache.get(personalRepoCacheKey(userId, fullName))
}

export function hasCachedPersonalRepoState(userId: string, fullName: string) {
  return personalRepoStateCache.has(personalRepoCacheKey(userId, fullName))
}

export function setCachedPersonalRepoState(
  userId: string,
  fullName: string,
  payload: PersonalRepoPayload,
) {
  personalRepoStateCache.set(personalRepoCacheKey(userId, fullName), payload)
}

function isOptionalString(value: unknown): value is string | null {
  return value === null || typeof value === 'string'
}

export function isPersonalRepoPayload(value: unknown): value is PersonalRepoPayload {
  if (
    !isRecord(value) ||
    !isRecord(value.state) ||
    typeof value.following !== 'boolean' ||
    !Array.isArray(value.collections)
  ) {
    return false
  }
  const state = value.state
  if (
    !isOptionalString(state.savedAt) ||
    !isOptionalString(state.hiddenAt) ||
    !isOptionalString(state.dismissedAt) ||
    !isOptionalString(state.reviewedAt) ||
    !ACCOUNT_PIPELINE_STAGE_IDS.some((stage) => stage === state.pipelineStage) ||
    !isOptionalString(state.note) ||
    typeof state.alertEnabled !== 'boolean'
  ) {
    return false
  }
  return value.collections.every(
    (collection) =>
      isRecord(collection) &&
      typeof collection.id === 'string' &&
      typeof collection.name === 'string' &&
      typeof collection.containsRepo === 'boolean',
  )
}

const inFlightBatches = new Set<string>()

export async function prefetchPersonalRepoStates(
  userId: string,
  fullNames: Array<string | undefined>,
) {
  const names = Array.from(
    new Set(
      fullNames.filter(
        (name): name is string =>
          typeof name === 'string' && name.length > 0 && !hasCachedPersonalRepoState(userId, name),
      ),
    ),
  ).filter((name) => !inFlightBatches.has(personalRepoCacheKey(userId, name)))
  if (names.length === 0) return

  for (const name of names) inFlightBatches.add(personalRepoCacheKey(userId, name))
  try {
    const response = await fetch(API_ROUTES.account.repositoryBatch, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      credentials: 'include',
      cache: 'no-store',
      body: JSON.stringify({ fullNames: names }),
    })
    if (!response.ok) return
    const payload: unknown = await response.json().catch(() => null)
    if (!isRecord(payload) || !isRecord(payload.items)) return
    const items = payload.items
    for (const [fullName, item] of Object.entries(items)) {
      if (isPersonalRepoPayload(item)) setCachedPersonalRepoState(userId, fullName, item)
    }
  } catch {
    // Best-effort warm-up; the panel falls back to its own fetch if this fails.
  } finally {
    for (const name of names) inFlightBatches.delete(personalRepoCacheKey(userId, name))
  }
}
