'use client'

import { useEffect, useState } from 'react'
import { API_ROUTES, withQuery } from '@/config/routes'
import type { RepositoryContributor } from '@/features/repositories/types/repository'
import { isRecord } from '@/lib/api/input-normalization'
import { apiErrorMessage } from '@/lib/api/errors'

type ContributorPayload = {
  contributors: RepositoryContributor[]
  totalCount: number
}

const cache = new Map<string, ContributorPayload>()
const requests = new Map<string, Promise<ContributorPayload>>()

function isContributor(value: unknown): value is RepositoryContributor {
  return (
    isRecord(value) &&
    typeof value.login === 'string' &&
    typeof value.htmlUrl === 'string' &&
    typeof value.contributions === 'number' &&
    Number.isSafeInteger(value.contributions) &&
    value.contributions >= 0
  )
}

function loadContributors(fullName: string) {
  const cached = cache.get(fullName)
  if (cached) return Promise.resolve(cached)

  const pending = requests.get(fullName)
  if (pending) return pending

  const request = fetch(withQuery(API_ROUTES.repositories.contributors, { repo: fullName }))
    .then(async (res) => {
      const data: unknown = await res.json().catch(() => null)
      if (!res.ok) throw new Error(apiErrorMessage(data, 'Unable to load contributors'))
      return data
    })
    .then((data) => {
      if (!isRecord(data) || !Array.isArray(data.contributors)) {
        throw new Error('Contributor API returned an invalid response')
      }
      const contributors = data.contributors.filter(isContributor)
      if (contributors.length !== data.contributors.length) {
        throw new Error('Contributor API returned an invalid response')
      }
      const payload = {
        contributors,
        totalCount:
          typeof data.totalCount === 'number' && Number.isSafeInteger(data.totalCount)
            ? Math.max(data.totalCount, contributors.length)
            : contributors.length,
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
  const [contributors, setContributors] = useState<RepositoryContributor[]>(() =>
    fullName ? (cache.get(fullName)?.contributors ?? []) : [],
  )
  const [totalCount, setTotalCount] = useState(() =>
    fullName ? (cache.get(fullName)?.totalCount ?? 0) : 0,
  )
  const [isLoading, setIsLoading] = useState(() => Boolean(fullName && !cache.has(fullName)))
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
