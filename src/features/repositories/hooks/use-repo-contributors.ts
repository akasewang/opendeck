'use client'

import { useEffect, useState } from 'react'
import type { Contributor } from '@/features/repositories/types'

type ContributorPayload = {
  contributors: Contributor[]
  totalCount: number
}

const cache = new Map<string, ContributorPayload>()
const requests = new Map<string, Promise<ContributorPayload>>()

function loadContributors(fullName: string) {
  const cached = cache.get(fullName)
  if (cached) return Promise.resolve(cached)

  const pending = requests.get(fullName)
  if (pending) return pending

  const request = fetch(`/api/repos/contributors?repo=${encodeURIComponent(fullName)}`)
    .then(async (res) => {
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error || 'Unable to load contributors')
      return data
    })
    .then((data) => {
      const contributors: Contributor[] = Array.isArray(data?.contributors) ? data.contributors : []
      const payload = {
        contributors,
        totalCount: typeof data?.totalCount === 'number' ? data.totalCount : contributors.length,
      }
      cache.set(fullName, payload)
      return payload
    })
    .finally(() => {
      requests.delete(fullName)
    })

  requests.set(fullName, request)
  return request
}

export function useRepoContributors(fullName?: string | null) {
  const [contributors, setContributors] = useState<Contributor[]>(() =>
    fullName ? (cache.get(fullName)?.contributors ?? []) : [],
  )
  const [totalCount, setTotalCount] = useState(() =>
    fullName ? (cache.get(fullName)?.totalCount ?? 0) : 0,
  )
  const [isLoading, setIsLoading] = useState(
    () => Boolean(fullName) && !cache.has(fullName as string),
  )
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!fullName) {
      setContributors([])
      setTotalCount(0)
      setIsLoading(false)
      setError(null)
      return
    }

    const cached = cache.get(fullName)
    if (cached) {
      setContributors(cached.contributors)
      setTotalCount(cached.totalCount)
      setIsLoading(false)
      setError(null)
      return
    }

    let cancelled = false
    setIsLoading(true)
    setError(null)

    loadContributors(fullName)
      .then((payload) => {
        if (cancelled) return
        setContributors(payload.contributors)
        setTotalCount(payload.totalCount)
      })
      .catch((loadError) => {
        if (cancelled) return
        setContributors([])
        setTotalCount(0)
        setError(loadError instanceof Error ? loadError.message : 'Unable to load contributors')
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [fullName])

  return { contributors, totalCount, isLoading, error }
}
