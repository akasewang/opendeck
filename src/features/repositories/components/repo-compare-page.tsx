'use client'

import { Icon } from '@iconify/react'
import { AnimatePresence, motion } from 'framer-motion'
import Image from 'next/image'
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorBanner } from '@/components/ui/error-banner'
import { Skeleton, SkeletonPanel } from '@/components/ui/skeleton'
import { toast } from '@/components/ui/toast'
import { API_ROUTES, APP_ROUTES, appRoute, withQuery } from '@/config/routes'
import { MOTION_SPRING } from '@/config/motion'
import PageHeader from '@/features/dashboard/components/page-header'
import PageShell from '@/features/dashboard/components/page-shell'
import { RepoSearchInput } from '@/features/repositories/components/repo-search-input'
import { formatRelativeTime } from '@/features/repositories/utils/repository-display'
import { isRepositoryInsight } from '@/features/repositories/utils/repository-response-validation'
import { isRecord } from '@/lib/api/input-normalization'
import { apiErrorMessage } from '@/lib/api/errors'
import { cn } from '@/utils/cn'
import { formatNumber } from '@/utils/format-number'

type CompareItem = {
  repo: {
    full_name: string
    name?: string
    description?: string | null
    html_url?: string
    owner?: { login?: string; avatar_url?: string | null } | null
    language?: string | null
    license?: { key?: string | null; name?: string | null } | null
    pushed_at?: string | null
    stargazers_count?: number
    forks_count?: number
    open_issues_count?: number
    contribution_score?: number
    has_good_first_issues?: boolean
    is_archived?: boolean
  }
  setupDifficulty: string
  responsivenessScore: number
  qualitySignals?: {
    contributorCount?: number | null
    stale?: boolean
    archived?: boolean
  }
}

const MAX_REPOS = 4
const SETUP_RANK: Record<string, number> = { easy: 0, any: 1, medium: 1, advanced: 2 }

function overallScore(item: CompareItem) {
  return (item.repo.contribution_score ?? 0) * 0.6 + item.responsivenessScore * 0.4
}

function isCompareItem(value: unknown): value is CompareItem {
  if (!isRecord(value)) return false
  const { setupDifficulty, responsivenessScore } = value
  return (
    isRepositoryInsight(value) &&
    typeof setupDifficulty === 'string' &&
    typeof responsivenessScore === 'number' &&
    Number.isFinite(responsivenessScore)
  )
}

function winnersByMax(values: Array<number | null>) {
  const present = values.filter((value): value is number => value !== null)
  if (present.length < 2) return new Set<number>()
  const max = Math.max(...present)
  const min = Math.min(...present)
  if (max === min) return new Set<number>()
  return new Set(values.flatMap((value, index) => (value === max ? [index] : [])))
}

export default function ComparePage() {
  const [selected, setSelected] = useState<string[]>([])
  const [items, setItems] = useState<CompareItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const compareRequestRef = useRef(0)

  const runCompare = useCallback(async (repos: string[]) => {
    const requestId = compareRequestRef.current + 1
    compareRequestRef.current = requestId
    if (repos.length === 0) {
      setItems([])
      setError(null)
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(
        withQuery(API_ROUTES.repositories.compare, { repos: repos.join(',') }),
        { cache: 'no-store' },
      )
      const payload: unknown = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(apiErrorMessage(payload, 'Unable to compare repositories.'))
      }
      if (
        !isRecord(payload) ||
        !Array.isArray(payload.items) ||
        !payload.items.every(isCompareItem)
      ) {
        throw new Error('Repository API returned an invalid response.')
      }
      if (compareRequestRef.current !== requestId) return
      setItems(payload.items)
      setError(null)
    } catch (nextError) {
      if (compareRequestRef.current !== requestId) return
      setItems([])
      setError(nextError instanceof Error ? nextError.message : 'Unable to compare repositories.')
    } finally {
      if (compareRequestRef.current === requestId) setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    const repos = (new URLSearchParams(window.location.search).get('repos') ?? '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, MAX_REPOS)
    setSelected(repos)
    if (repos.length > 0) void runCompare(repos)
  }, [runCompare])

  const applySelection = (repos: string[]) => {
    setSelected(repos)
    const search = repos.length > 0 ? `?repos=${encodeURIComponent(repos.join(','))}` : ''
    window.history.replaceState(null, '', `${APP_ROUTES.dashboardCompare}${search}`)
    void runCompare(repos)
  }

  const addRepo = (fullName: string) => {
    const normalized = fullName.trim()
    if (!normalized) return
    if (selected.some((item) => item.toLowerCase() === normalized.toLowerCase())) {
      toast('Repository is already in the comparison')
      return
    }
    if (selected.length >= MAX_REPOS) {
      toast(`You can compare up to ${MAX_REPOS} repositories`, { tone: 'error' })
      return
    }
    applySelection([...selected, normalized])
  }

  const removeRepo = (fullName: string) => {
    applySelection(selected.filter((item) => item.toLowerCase() !== fullName.toLowerCase()))
  }

  const comparedNames = useMemo(
    () => new Set(items.map((item) => item.repo.full_name?.toLowerCase()).filter(Boolean)),
    [items],
  )
  const missing = useMemo(
    () =>
      selected.filter(
        (name) =>
          !isLoading && !error && items.length > 0 && !comparedNames.has(name.toLowerCase()),
      ),
    [comparedNames, error, isLoading, items.length, selected],
  )

  const comparing = items.length >= 2

  const metricValues = useMemo(() => {
    const fit = items.map((item) => item.repo.contribution_score ?? 0)
    const response = items.map((item) => item.responsivenessScore)
    const stars = items.map((item) => item.repo.stargazers_count ?? 0)
    const forks = items.map((item) => item.repo.forks_count ?? 0)
    const contributors = items.map((item) => {
      const count = item.qualitySignals?.contributorCount
      return typeof count === 'number' && count > 0 ? count : null
    })
    const pushed = items.map((item) => {
      if (!item.repo.pushed_at) return null
      const timestamp = new Date(item.repo.pushed_at).getTime()
      return Number.isFinite(timestamp) ? timestamp : null
    })
    const setup = items.map((item) => SETUP_RANK[item.setupDifficulty] ?? 1)
    const overall = items.map(overallScore)

    return { fit, response, stars, forks, contributors, pushed, setup, overall }
  }, [items])

  const fitWinners = comparing ? winnersByMax(metricValues.fit) : new Set<number>()
  const responseWinners = comparing ? winnersByMax(metricValues.response) : new Set<number>()
  const starWinners = comparing ? winnersByMax(metricValues.stars) : new Set<number>()
  const forkWinners = comparing ? winnersByMax(metricValues.forks) : new Set<number>()
  const contributorWinners = comparing ? winnersByMax(metricValues.contributors) : new Set<number>()
  const pushedWinners = comparing ? winnersByMax(metricValues.pushed) : new Set<number>()
  const setupWinners = comparing
    ? winnersByMax(metricValues.setup.map((rank) => -rank))
    : new Set<number>()

  const overallWinners = comparing ? winnersByMax(metricValues.overall) : new Set<number>()
  const bestIndex = overallWinners.size > 0 ? [...overallWinners][0] : -1
  const best = bestIndex >= 0 ? items[bestIndex] : null
  const bestHighlights =
    best === null
      ? []
      : [
          fitWinners.has(bestIndex) && 'highest contribution fit',
          responseWinners.has(bestIndex) && 'most responsive maintainers',
          pushedWinners.has(bestIndex) && 'most recently active',
          best.setupDifficulty === 'easy' && 'easy setup',
          best.repo.has_good_first_issues && 'good first issues available',
        ].filter((highlight): highlight is string => Boolean(highlight))

  const numericCell = (value: number | null, winner: boolean): ReactNode => {
    if (value === null) return <span className="text-muted-foreground/70">nope</span>
    return (
      <span
        className={cn(
          'font-mono tabular-nums',
          winner ? 'font-medium text-success' : 'text-foreground',
        )}
      >
        {formatNumber(value)}
      </span>
    )
  }

  const metricRows: Array<{ key: string; label: string; cells: ReactNode[] }> = [
    {
      key: 'fit',
      label: 'Contribution fit',
      cells: items.map((_, index) => numericCell(metricValues.fit[index], fitWinners.has(index))),
    },
    {
      key: 'response',
      label: 'Responsiveness',
      cells: items.map((_, index) =>
        numericCell(metricValues.response[index], responseWinners.has(index)),
      ),
    },
    {
      key: 'stars',
      label: 'Stars',
      cells: items.map((_, index) =>
        numericCell(metricValues.stars[index], starWinners.has(index)),
      ),
    },
    {
      key: 'forks',
      label: 'Forks',
      cells: items.map((_, index) =>
        numericCell(metricValues.forks[index], forkWinners.has(index)),
      ),
    },
    {
      key: 'contributors',
      label: 'Contributors',
      cells: items.map((_, index) =>
        numericCell(metricValues.contributors[index], contributorWinners.has(index)),
      ),
    },
    {
      key: 'issues',
      label: 'Open issues',
      cells: items.map((item) => numericCell(item.repo.open_issues_count ?? 0, false)),
    },
    {
      key: 'pushed',
      label: 'Last activity',
      cells: items.map((item, index) => (
        <span
          key={item.repo.full_name}
          className={pushedWinners.has(index) ? 'font-medium text-success' : 'text-foreground'}
        >
          {formatRelativeTime(item.repo.pushed_at) ?? 'probably never'}
        </span>
      )),
    },
    {
      key: 'setup',
      label: 'Setup difficulty',
      cells: items.map((item, index) => (
        <span
          key={item.repo.full_name}
          className={cn(
            'capitalize',
            setupWinners.has(index) ? 'font-medium text-success' : 'text-foreground',
          )}
        >
          {item.setupDifficulty}
        </span>
      )),
    },
    {
      key: 'goodfirst',
      label: 'Good first issues',
      cells: items.map((item) => (
        <span
          key={item.repo.full_name}
          className={
            item.repo.has_good_first_issues ? 'font-medium text-success' : 'text-muted-foreground'
          }
        >
          {item.repo.has_good_first_issues ? 'Yes' : 'No'}
        </span>
      )),
    },
    {
      key: 'license',
      label: 'License',
      cells: items.map((item) => (
        <span key={item.repo.full_name} className="text-foreground">
          {item.repo.license?.key?.toUpperCase() || item.repo.license?.name || 'No license'}
        </span>
      )),
    },
  ]

  return (
    <PageShell className="space-y-5">
      <PageHeader
        title="Compare repositories"
        description={`Search and pick up to ${MAX_REPOS} repositories. The leading value in each row is marked in green.`}
        count={items.length}
      />

      <div className="space-y-3">
        <RepoSearchInput
          onPick={addRepo}
          exclude={selected}
          placeholder="Type to search, e.g. next.js or vercel/next.js"
          disabled={selected.length >= MAX_REPOS}
        />
        {selected.length >= MAX_REPOS && (
          <p className="text-xs text-muted-foreground">
            Comparison is full. Remove a repository to add another.
          </p>
        )}
        {selected.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <AnimatePresence initial={false}>
              {selected.map((name) => (
                <motion.span
                  key={name}
                  layout
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.85 }}
                  transition={MOTION_SPRING.firm}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border/50 bg-background/40 py-1 pl-2.5 pr-1 text-sm text-foreground"
                >
                  {name}
                  <button
                    type="button"
                    onClick={() => removeRepo(name)}
                    aria-label={`Remove ${name} from comparison`}
                    className="flex h-5 w-5 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-muted-hover hover:text-foreground"
                  >
                    <Icon icon="ri:close-line" className="h-3.5 w-3.5" />
                  </button>
                </motion.span>
              ))}
            </AnimatePresence>
            <button
              type="button"
              onClick={() => applySelection([])}
              className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {missing.length > 0 && (
        <div className="flex items-center gap-2 rounded-md border border-border/40 bg-background/40 px-3 py-2 text-xs text-muted-foreground">
          <Icon icon="ri:information-line" className="h-3.5 w-3.5 shrink-0" />
          Not mirrored yet: {missing.join(', ')}. Only repositories in the OpenDeck index can be
          compared.
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-16" />
          <SkeletonPanel className="h-96" />
        </div>
      ) : error ? (
        <ErrorBanner message={error} onRetry={() => void runCompare(selected)} />
      ) : items.length === 0 ? (
        <EmptyState
          icon="ri:scales-3-line"
          title={selected.length > 0 ? 'No repositories matched' : 'Nothing to compare yet'}
          description={
            selected.length > 0
              ? 'None of the selected repositories are mirrored in the OpenDeck index yet.'
              : 'Start typing above to search the index and add repositories side by side.'
          }
        />
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={MOTION_SPRING.standard}
          className="space-y-3"
        >
          {best?.repo.full_name && (
            <Card className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3">
              <Icon icon="ri:award-line" className="h-4 w-4 shrink-0 text-success" />
              <span className="text-sm text-foreground">
                <span className="font-semibold">{best.repo.full_name}</span> looks like the best
                pick for contributing
              </span>
              {bestHighlights.length > 0 && (
                <span className="text-xs text-muted-foreground">{bestHighlights.join(' · ')}</span>
              )}
            </Card>
          )}

          <div className="overflow-x-auto rounded-lg border border-border/50">
            <table
              className="w-full table-fixed border-separate border-spacing-0 text-sm"
              style={{ minWidth: `${10 + items.length * 13}rem` }}
            >
              <caption className="sr-only">Repository comparison</caption>
              <colgroup>
                <col className="w-40" />
                {items.map((item) => (
                  <col key={item.repo.full_name} />
                ))}
              </colgroup>
              <thead>
                <tr>
                  <th
                    scope="col"
                    className="sticky left-0 z-10 border-b border-border/50 border-r border-r-row-divider bg-background"
                  >
                    <span className="sr-only">Metric</span>
                  </th>
                  {items.map((item, index) => {
                    const avatar = item.repo.owner?.avatar_url
                    const fullName = item.repo.full_name ?? item.repo.name
                    const isBest = comparing && overallWinners.has(index)
                    return (
                      <th
                        key={fullName}
                        scope="col"
                        className={cn(
                          'border-b border-border/50 p-4 text-left align-top',
                          index > 0 && 'border-l border-l-row-divider',
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex min-w-0 items-center gap-2.5">
                            {avatar && (
                              <Image
                                src={`${avatar}${avatar.includes('?') ? '&' : '?'}s=28`}
                                alt=""
                                width={28}
                                height={28}
                                className="shrink-0 rounded-md ring-1 ring-border/50"
                              />
                            )}
                            <div className="min-w-0">
                              <a
                                href={appRoute.repository(fullName)}
                                className="block truncate text-sm font-semibold text-foreground transition-colors hover:text-primary"
                                title={fullName}
                              >
                                {fullName}
                              </a>
                              <div className="mt-0.5 flex min-w-0 items-center gap-2 whitespace-nowrap text-2xs font-normal text-muted-foreground">
                                {item.repo.language && (
                                  <span className="truncate">{item.repo.language}</span>
                                )}
                                {item.repo.is_archived && (
                                  <span className="shrink-0 text-destructive">Archived</span>
                                )}
                                {isBest && (
                                  <span className="inline-flex shrink-0 items-center gap-1 font-medium text-success">
                                    <Icon icon="ri:award-line" className="h-3 w-3 shrink-0" />
                                    Best overall
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center">
                            {item.repo.html_url && (
                              <a
                                href={item.repo.html_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label={`Open ${item.repo.full_name} on GitHub`}
                                className="flex h-6 w-6 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-muted-hover hover:text-foreground"
                              >
                                <Icon icon="ri:github-fill" className="h-3.5 w-3.5" />
                              </a>
                            )}
                            <button
                              type="button"
                              onClick={() => removeRepo(item.repo.full_name ?? '')}
                              aria-label={`Remove ${item.repo.full_name} from comparison`}
                              className="flex h-6 w-6 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-muted-hover hover:text-foreground"
                            >
                              <Icon icon="ri:close-line" className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {metricRows.map((row, rowIndex) => (
                  <tr key={row.key}>
                    <th
                      scope="row"
                      className={cn(
                        'sticky left-0 z-10 border-r border-r-row-divider bg-background px-4 py-2.5 text-left text-xs font-medium text-muted-foreground',
                        rowIndex < metricRows.length - 1 && 'border-b border-b-row-divider',
                      )}
                    >
                      {row.label}
                    </th>
                    {row.cells.map((cell, index) => (
                      <td
                        key={`${row.key}-${items[index].repo.full_name ?? index}`}
                        className={cn(
                          'px-4 py-2.5 align-middle',
                          rowIndex < metricRows.length - 1 && 'border-b border-b-row-divider',
                          index > 0 && 'border-l border-l-row-divider',
                        )}
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {comparing && (
            <p className="text-pretty text-xs text-muted-foreground">
              Contribution fit and responsiveness are scored 0-100 by OpenDeck.
            </p>
          )}
        </motion.div>
      )}
    </PageShell>
  )
}
