'use client'

import { useEffect, useMemo, useState } from 'react'
import { formatNumber } from '@/utils/format-number'

const CACHE_KEY = 'opendeck-github-stars'
const CACHE_TTL = 15 * 60 * 1000

let sharedFetchPromise: Promise<number | null> | null = null

function isFreshCache(value: unknown): value is { count: number; timestamp: number } {
  if (!value || typeof value !== 'object') return false

  const cached = value as { count?: unknown; timestamp?: unknown }
  return (
    typeof cached.count === 'number' &&
    Number.isFinite(cached.count) &&
    typeof cached.timestamp === 'number' &&
    Date.now() - cached.timestamp < CACHE_TTL
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
          const parsed = JSON.parse(cached)
          if (isFreshCache(parsed)) {
            if (isMounted) setStars(parsed.count)
            return
          }
        }
      } catch {}

      if (!sharedFetchPromise) {
        sharedFetchPromise = fetch('/api/github-stars')
          .then((res) => {
            if (!res.ok) throw new Error('Unable to load GitHub stars')
            return res.json()
          })
          .then((data) => {
            const count = data.count
            if (typeof count !== 'number') return null
            try {
              window.localStorage.setItem(
                CACHE_KEY,
                JSON.stringify({ count, timestamp: Date.now() }),
              )
            } catch {}
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
