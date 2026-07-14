'use client'

import { useEffect, useState } from 'react'
import {
  getCachedOrganizationProfile,
  loadOrganizationProfile,
} from '@/features/organizations/api/organization-api-client'
import type { OrganizationDetailsResponse } from '@/features/organizations/types/organization'

const PROFILE_LOAD_ERROR = 'Unable to load organization profile details.'

export function useOrganizationProfile(owner: string) {
  const [payload, setPayload] = useState<OrganizationDetailsResponse | null>(() =>
    getCachedOrganizationProfile(owner),
  )
  const [isLoading, setIsLoading] = useState(() => !getCachedOrganizationProfile(owner))
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const cached = getCachedOrganizationProfile(owner)
    if (cached) {
      setPayload(cached)
      setError(null)
      setIsLoading(false)
      return
    }

    let cancelled = false
    setPayload(null)
    setError(null)
    setIsLoading(true)

    loadOrganizationProfile(owner)
      .then((nextPayload) => {
        if (!cancelled) setPayload(nextPayload)
      })
      .catch((nextError) => {
        if (!cancelled) {
          setPayload(null)
          setError(nextError instanceof Error ? nextError.message : PROFILE_LOAD_ERROR)
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [owner])

  return {
    profile: payload?.profile ?? null,
    mirror: payload?.mirror ?? null,
    isLoading,
    error,
  }
}
