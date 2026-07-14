'use client'

import { API_ROUTES, withQuery } from '@/config/routes'
import type { OrganizationDetailsResponse } from '@/features/organizations/types/organization'
import { isOrganizationDetailsResponse } from '@/features/organizations/utils/organization-response-validation'
import { getJson } from '@/lib/api/http-client'

const profileCache = new Map<string, OrganizationDetailsResponse>()
const profileRequests = new Map<string, Promise<OrganizationDetailsResponse>>()

export function getCachedOrganizationProfile(owner: string) {
  return profileCache.get(owner) ?? null
}

export function loadOrganizationProfile(owner: string) {
  const cached = profileCache.get(owner)
  if (cached) return Promise.resolve(cached)

  const pending = profileRequests.get(owner)
  if (pending) return pending

  const request = getJson(withQuery(API_ROUTES.organizationProfile, { owner }))
    .then((payload) => {
      if (!isOrganizationDetailsResponse(payload)) {
        throw new Error('Organization API returned an invalid profile response.')
      }
      const normalized = {
        profile: payload.profile,
        mirror: payload.mirror,
      }
      profileCache.set(owner, normalized)
      return normalized
    })
    .finally(() => profileRequests.delete(owner))

  profileRequests.set(owner, request)
  return request
}
