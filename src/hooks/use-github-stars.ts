'use client'

import { useEffect, useMemo, useState } from 'react'
import { API_ROUTES } from '@/config/routes'
import { isRecord } from '@/lib/api/input-normalization'
import { formatNumber } from '@/utils/format-number'

const CACHE_KEY = 'opendeck-github-stars'
const CACHE_TTL = 15 * 60 * 1000

let sharedFetchPromise: Promise<number | null> | null = null

function isFreshCache(value: unknown): value is { count: number; timestamp: number } {
  if (!isRecord(value)) return false
  return (
    typeof value.count === 'number' &&
    Number.isSafeInteger(value.count) &&
    value.count >= 0 &&
    typeof value.timestamp === 'number' &&
    value.timestamp <= Date.now() &&
    Date.now() - value.timestamp < CACHE_TTL
  )
}

export function useGithubStars() {
  const [stars, setStars] = useState<number | null>(null)

  useEffect(() => {
    let isMounted = true

    const loadStars = async () => {
      try {
        const cached = window.localStorage.getItem(CACHE_KEY)
        if (cached) {
          const parsed: unknown = JSON.parse(cached)
          if (isFreshCache(parsed)) {
            if (isMounted) setStars(parsed.count)
            return
          }
        }
      } catch {
        // Storage can be unavailable in privacy modes; the network path remains usable.
      }

      if (!sharedFetchPromise) {
        sharedFetchPromise = fetch(API_ROUTES.githubStars)
          .then(async (res) => {
            if (!res.ok) throw new Error('Unable to load GitHub stars')
            const payload: unknown = await res.json().catch(() => null)
            return payload
          })
          .then((data) => {
            if (!isRecord(data)) return null
            const count = data.count
            if (typeof count !== 'number' || !Number.isSafeInteger(count) || count < 0) return null
            try {
              window.localStorage.setItem(
                CACHE_KEY,
                JSON.stringify({ count, timestamp: Date.now() }),
              )
            } catch {
              // Cache persistence is optional and must not hide a successful response.
            }
            return count
          })
          .catch(() => null)
          .finally(() => {
            sharedFetchPromise = null
          })
      }

      const count = await sharedFetchPromise
      if (isMounted && count !== null) setStars(count)
    }

    void loadStars()

    return () => {
      isMounted = false
    }
  }, [])

  const shortCount = useMemo(() => (stars !== null ? formatNumber(stars) : null), [stars])

  const fullCount = useMemo(
    () => (stars !== null ? new Intl.NumberFormat('en-US').format(stars) : null),
    [stars],
  )

  return { count: stars, shortCount, fullCount }
}
