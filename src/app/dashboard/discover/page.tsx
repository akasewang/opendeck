'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { CheckboxRow } from '@/components/ui/checkbox-row'
import { Input } from '@/components/ui/input'
import Select from '@/components/ui/select'
import PageHeader from '@/features/dashboard/components/page-header'
import PageShell from '@/features/dashboard/components/page-shell'
import RepoTable from '@/features/repositories/components/repo-table'
import { REPOSITORY_DISCOVER_LANGUAGES } from '@/features/repositories/constants/repository-options'
import type {
  RepositoryApiItem,
  RepositoryListItem,
} from '@/features/repositories/types/repository'
import {
  mapRepositoryApiItem,
  mergeUniqueRepositories,
} from '@/features/repositories/utils/repository-list'
import { parseRepositoryListPayload } from '@/features/repositories/utils/repository-response-validation'

const DISCOVER_PAGE_SIZE = 25

export default function DiscoverRepos() {
  const [repos, setRepos] = useState<RepositoryListItem[]>([])
  const [language, setLanguage] = useState('')
  const [topic, setTopic] = useState('')
  const [license, setLicense] = useState('')
  const [minStars, setMinStars] = useState('')
  const [activeOnly, setActiveOnly] = useState(false)
  const [goodFirstIssues, setGoodFirstIssues] = useState(false)
  const [sort, setSort] = useState('contribution')
  const [page, setPage] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [query, setQuery] = useState('')
  const [total, setTotal] = useState(0)
  const [refreshKey, setRefreshKey] = useState(0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const repoParam = new URLSearchParams(window.location.search).get('repo')
    if (repoParam) setQuery(repoParam)
  }, [])

  const updateFilter = <T,>(setter: (value: T) => void, value: T) => {
    setPage(1)
    setter(value)
  }

  useEffect(() => {
    const controller = new AbortController()
    const timeout = window.setTimeout(async () => {
      const isFirstPage = page === 1

      if (isFirstPage) {
        setIsLoading(true)
        setIsLoadingMore(false)
      } else {
        setIsLoading(false)
        setIsLoadingMore(true)
      }

      try {
        const params = new URLSearchParams({
          page: String(page),
          per_page: String(DISCOVER_PAGE_SIZE),
          sort,
          contributionReadyOnly: 'true',
        })

        if (query.trim()) params.set('q', query.trim())
        if (language) params.set('language', language)
        if (topic.trim()) params.set('topic', topic.trim())
        if (license.trim()) params.set('license', license.trim())
        if (minStars.trim()) params.set('minStars', minStars.trim())
        if (activeOnly) params.set('activeOnly', 'true')
        if (goodFirstIssues) params.set('hasGoodFirstIssues', 'true')

        const res = await fetch(`/api/search?${params.toString()}`, {
          signal: controller.signal,
          cache: refreshKey > 0 ? 'no-store' : 'default',
        })
        if (!res.ok) throw new Error('Failed to fetch')

        const payload: unknown = await res.json().catch(() => null)
        const data = parseRepositoryListPayload(payload)
        if (!data) throw new Error('Repository API returned an invalid response')
        const mapped = data.items.map((repository: RepositoryApiItem) =>
          mapRepositoryApiItem(repository),
        )

        setRepos((current) => (isFirstPage ? mapped : mergeUniqueRepositories(current, mapped)))
        setTotal(data.totalCount)
        setError(null)
      } catch {
        if (!controller.signal.aborted) {
          setError('Unable to load repositories right now.')
          if (page === 1) {
            setRepos([])
            setTotal(0)
          }
        }
      } finally {
        if (!controller.signal.aborted) {
          if (page === 1) setIsLoading(false)
          else setIsLoadingMore(false)
        }
      }
    }, 350)

    return () => {
      window.clearTimeout(timeout)
      controller.abort()
    }
  }, [
    activeOnly,
    goodFirstIssues,
    language,
    license,
    minStars,
    page,
    query,
    sort,
    topic,
    refreshKey,
  ])

  const hasMore = repos.length < total
  const languageOptions = useMemo(
    () => REPOSITORY_DISCOVER_LANGUAGES.map((lang) => ({ value: lang.toLowerCase(), label: lang })),
    [],
  )

  const loadMore = useCallback(() => {
    if (isLoading || isLoadingMore || !hasMore) return
    if (error) {
      setRefreshKey((key) => key + 1)
      return
    }
    setPage((current) => current + 1)
  }, [error, hasMore, isLoading, isLoadingMore])

  return (
    <PageShell className="flex h-full min-h-0 flex-col gap-5">
      <PageHeader
        title="Discover"
        description="Explore and filter the complete index of mirrored open source repositories."
        count={total}
      />

      <div className="grid shrink-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-7">
        <Select
          value={language}
          onChange={(e) => updateFilter(setLanguage, e.target.value)}
          options={languageOptions}
          placeholder="Language"
          ariaLabel="Filter discover results by language"
        />
        <Input
          value={topic}
          onChange={(e) => updateFilter(setTopic, e.target.value)}
          placeholder="Topic"
          aria-label="Filter discover results by topic"
        />
        <Input
          value={license}
          onChange={(e) => updateFilter(setLicense, e.target.value)}
          placeholder="License"
          aria-label="Filter discover results by license"
        />
        <Input
          value={minStars}
          onChange={(e) => updateFilter(setMinStars, e.target.value.replace(/[^0-9]/g, ''))}
          placeholder="Min stars"
          aria-label="Filter discover results by minimum stars"
          inputMode="numeric"
        />
        <Select
          value={sort}
          onChange={(e) => updateFilter(setSort, e.target.value)}
          options={[
            { value: 'relevance', label: 'Relevance' },
            { value: 'contribution', label: 'Fit' },
            { value: 'stars', label: 'Stars' },
            { value: 'forks', label: 'Forks' },
            { value: 'updated', label: 'Updated' },
            { value: 'recent', label: 'New' },
          ]}
          placeholder="Sort"
          clearable={false}
          ariaLabel="Sort discover results"
        />
        <CheckboxRow
          checked={activeOnly}
          onChange={(checked) => updateFilter(setActiveOnly, checked)}
        >
          Active
        </CheckboxRow>
        <CheckboxRow
          checked={goodFirstIssues}
          onChange={(checked) => updateFilter(setGoodFirstIssues, checked)}
        >
          Good first
        </CheckboxRow>
      </div>

      <RepoTable
        data={repos}
        isLoading={isLoading}
        error={error}
        query={query}
        onQueryChange={(value) => updateFilter(setQuery, value)}
        searchPlaceholder="lightweight React state manager with good TS types"
        onRefresh={() => {
          setPage(1)
          setRefreshKey((key) => key + 1)
        }}
        hasMore={hasMore}
        isLoadingMore={isLoadingMore}
        onLoadMore={loadMore}
        className="min-h-0 flex-1"
      />
    </PageShell>
  )
}
