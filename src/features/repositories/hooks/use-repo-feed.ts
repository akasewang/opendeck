'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useDebounce } from 'use-debounce'
import type { GithubRepoApiItem, Repo } from '@/features/repositories/types'
import { mapApiRepo, mergeUniqueRepos } from '@/features/repositories/utils'

const REPO_FEED_PAGE_SIZE = 25

export function useRepoFeed(endpoint: string, descriptionFallback?: string) {
  const [results, setResults] = useState<Repo[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [query, setQuery] = useState('')
  const [debouncedQuery] = useDebounce(query, 250)
  const [language, setLanguage] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [refreshKey, setRefreshKey] = useState(0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    const run = async () => {
      const isFirstPage = page === 1

      if (isFirstPage) {
        setIsLoading(true)
        setIsLoadingMore(false)
      } else {
        setIsLoading(false)
        setIsLoadingMore(true)
      }

      try {
        const params = new URLSearchParams()
        params.append('page', page.toString())
        params.append('per_page', REPO_FEED_PAGE_SIZE.toString())
        if (debouncedQuery.trim()) params.append('q', debouncedQuery.trim())
        if (language) params.append('language', language)

        const fetchUrl = `${endpoint}${endpoint.includes('?') ? '&' : '?'}${params.toString()}`

        const res = await fetch(fetchUrl, {
          signal: controller.signal,
          cache: refreshKey > 0 ? 'no-store' : 'default',
        })
        if (!res.ok) throw new Error('Failed to fetch')

        const data = await res.json()
        const items = Array.isArray(data?.items) ? data.items : []
        const mapped = items.map((repo: GithubRepoApiItem) => mapApiRepo(repo, descriptionFallback))
        if (controller.signal.aborted) return

        setResults((current) => (isFirstPage ? mapped : mergeUniqueRepos(current, mapped)))
        setTotal(data?.total_count || 0)
        setError(null)
      } catch {
        if (controller.signal.aborted) return

        setError('Unable to load repositories right now.')
        if (page === 1) {
          setResults([])
          setTotal(0)
        }
      } finally {
        if (!controller.signal.aborted) {
          if (page === 1) setIsLoading(false)
          else setIsLoadingMore(false)
        }
      }
    }

    run()

    return () => controller.abort()
  }, [page, debouncedQuery, language, endpoint, descriptionFallback, refreshKey])

  const languageOptions = useMemo(() => {
    const languages = results
      .map((repo) => repo.language)
      .filter((lang): lang is string => Boolean(lang))

    return Array.from(new Set(languages)).map((lang) => ({
      value: lang.toLowerCase(),
      label: lang,
    }))
  }, [results])

  const hasMore = results.length < total

  const loadMore = useCallback(() => {
    if (!isLoading && !isLoadingMore && hasMore) setPage((current) => current + 1)
  }, [hasMore, isLoading, isLoadingMore])

  const refresh = useCallback(() => {
    setPage(1)
    setRefreshKey((key) => key + 1)
  }, [])

  return {
    filtered: results,
    isLoading,
    isLoadingMore,
    total,
    hasMore,
    error,
    loadMore,
    refresh,
    query,
    setQuery: (value: string) => {
      setPage(1)
      setQuery(value)
    },
    language,
    setLanguage: (value: string) => {
      setPage(1)
      setLanguage(value)
    },
    languageOptions,
  }
}
