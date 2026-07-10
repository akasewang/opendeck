'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import CountPill from '@/components/ui/count-pill'
import Select from '@/components/ui/select'
import PageShell from '@/features/dashboard/components/page-shell'
import RepoTable from '@/features/repositories/components/repo-table'
import { DISCOVER_LANGUAGES } from '@/features/repositories/constants'
import type { GithubRepoApiItem, Repo } from '@/features/repositories/types'
import { mapApiRepo, mergeUniqueRepos } from '@/features/repositories/utils'

const FILTER_INPUT_CLASS =
  'rounded-md bg-background text-foreground border border-border/30 px-3 py-2 text-sm transition-all duration-300 ease-out hover:border-border/60 focus:border-border/60 focus:outline-none focus:ring-[0.5px] focus:ring-ring/30'
const FILTER_CHECKBOX_CLASS =
  'flex items-center gap-2 rounded-md bg-background text-muted-foreground border border-border/30 px-3 py-2 text-sm transition-colors hover:border-border/60 cursor-pointer'
const DISCOVER_PAGE_SIZE = 25

export default function DiscoverRepos() {
  const [repos, setRepos] = useState<Repo[]>([])
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

        const data = await res.json()
        const items = Array.isArray(data?.items) ? data.items : []
        const mapped = items.map((repo: GithubRepoApiItem) => mapApiRepo(repo))

        setRepos((current) => (isFirstPage ? mapped : mergeUniqueRepos(current, mapped)))
        setTotal(data?.total_count || 0)
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
    () => DISCOVER_LANGUAGES.map((lang) => ({ value: lang.toLowerCase(), label: lang })),
    [],
  )

  const loadMore = useCallback(() => {
    if (!isLoading && !isLoadingMore && hasMore) setPage((current) => current + 1)
  }, [hasMore, isLoading, isLoadingMore])

  return (
    <PageShell>
      <div className="mb-6 flex w-full flex-col gap-5">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
          <div className="flex flex-col w-full gap-5">
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-3">
                <h1 className="text-balance text-lg sm:text-xl font-medium leading-[100%]">
                  <span className="text-primary">Discover</span>
                </h1>
                <CountPill count={total} />
              </div>
              <p className="text-pretty text-[13px] text-muted-foreground max-w-md">
                Explore and filter the complete index of mirrored open source repositories.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-7 gap-3">
          <Select
            value={language}
            onChange={(e) => updateFilter(setLanguage, e.target.value)}
            options={languageOptions}
            placeholder="Language"
            ariaLabel="Filter discover results by language"
          />
          <input
            value={topic}
            onChange={(e) => updateFilter(setTopic, e.target.value)}
            placeholder="Topic"
            aria-label="Filter discover results by topic"
            className={FILTER_INPUT_CLASS}
          />
          <input
            value={license}
            onChange={(e) => updateFilter(setLicense, e.target.value)}
            placeholder="License"
            aria-label="Filter discover results by license"
            className={FILTER_INPUT_CLASS}
          />
          <input
            value={minStars}
            onChange={(e) => updateFilter(setMinStars, e.target.value.replace(/[^0-9]/g, ''))}
            placeholder="Min stars"
            aria-label="Filter discover results by minimum stars"
            inputMode="numeric"
            className={FILTER_INPUT_CLASS}
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
          <label className={FILTER_CHECKBOX_CLASS}>
            <input
              type="checkbox"
              checked={activeOnly}
              onChange={(e) => updateFilter(setActiveOnly, e.target.checked)}
              className="accent-primary"
            />
            Active
          </label>
          <label className={FILTER_CHECKBOX_CLASS}>
            <input
              type="checkbox"
              checked={goodFirstIssues}
              onChange={(e) => updateFilter(setGoodFirstIssues, e.target.checked)}
              className="accent-primary"
            />
            Good first
          </label>
        </div>
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
      />
    </PageShell>
  )
}
