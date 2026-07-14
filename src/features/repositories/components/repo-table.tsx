'use client'

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Fragment, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorBanner } from '@/components/ui/error-banner'
import { ScrollShadow } from '@/components/ui/scroll-shadow'
import {
  MOTION_DURATION_SECONDS,
  MOTION_EASING,
  MOTION_STAGGER_STEP_SECONDS,
} from '@/config/motion'
import { useAuth } from '@/features/auth/providers/auth-provider'
import { prefetchPersonalRepoStates } from '@/features/repositories/api/personal-repo-cache'
import { ExpandedDetails } from '@/features/repositories/components/repo-expanded-details'
import { renderCell } from '@/features/repositories/components/table/repository-table-cells'
import { TableHeadRow } from '@/features/repositories/components/table/repository-table-header'
import {
  RepoRowSkeleton,
  RepoTableSkeleton,
} from '@/features/repositories/components/table/repository-table-skeleton'
import { TableToolbar } from '@/features/repositories/components/table/repository-table-toolbar'
import { REPOSITORY_TABLE_COLUMNS } from '@/features/repositories/data/repository-table-columns'
import type { RepositoryListItem } from '@/features/repositories/types/repository'
import type { RepositoryTableColumnKey } from '@/features/repositories/types/repository-table'
import { repoKey } from '@/features/repositories/utils/repository-table-url-state'
import { clearUrlParameter } from '@/lib/browser/url-state'
import { cn } from '@/utils/cn'

export { RepoTableSkeleton }

const LOADING_MORE_SKELETON_COUNT = 5
const NAME_COLUMN_BOUNDS =
  'w-auto min-w-[11rem] max-w-[22rem] sm:min-w-[18rem] sm:max-w-[28rem] md:min-w-[20rem] md:max-w-[34rem] lg:min-w-[24rem] lg:max-w-[42rem] xl:max-w-[50rem] 2xl:max-w-[58rem]'
const COLUMN_BOUNDS: Partial<Record<RepositoryTableColumnKey, string>> = {
  language: 'min-w-[8rem]',
  topics: 'min-w-[16rem]',
  open_issues_count: 'min-w-[7.5rem]',
  stargazers_count: 'min-w-[7rem]',
  contribution_score: 'min-w-[10.75rem]',
}

export default function RepoTable({
  data,
  isLoading,
  error,
  query,
  onQueryChange,
  searchPlaceholder = 'Search by repository / name',
  onRefresh,
  hasMore,
  isLoadingMore,
  onLoadMore,
  className,
}: {
  data: RepositoryListItem[]
  isLoading?: boolean
  isLoadingMore?: boolean
  error?: string | null
  query?: string
  onQueryChange?: (value: string) => void
  searchPlaceholder?: string
  onRefresh?: () => void
  hasMore?: boolean
  onLoadMore?: () => void
  className?: string
}) {
  const [expandedRow, setExpandedRow] = useState<string | null>(null)
  const loadMoreRef = useRef<HTMLDivElement | null>(null)
  const [scrollNode, setScrollNode] = useState<HTMLDivElement | null>(null)
  const [panelWidth, setPanelWidth] = useState<number>()
  const deepLinkApplied = useRef(false)
  const deepLinkLoadStarted = useRef(false)
  const pendingExpansion = useRef<string | null>(null)
  const pendingAuthMessage = useRef<string | null>(null)
  const authPromptWasOpen = useRef(false)
  const { user, isLoading: isAuthLoading, isAuthOpen, openAuth } = useAuth()
  const prefersReducedMotion = useReducedMotion()

  const expandRow = useCallback((id: string) => {
    setExpandedRow((prev) => (prev === id ? null : id))
  }, [])

  const requestRowExpansion = useCallback(
    (
      id: string,
      message = 'Sign in to expand repository rows and inspect contribution details.',
    ) => {
      clearUrlParameter('repo')

      if (!user) {
        pendingExpansion.current = id
        pendingAuthMessage.current = message
        if (!isAuthLoading) openAuth({ message })
        return
      }

      expandRow(id)
    },
    [expandRow, isAuthLoading, openAuth, user],
  )

  const toggleRow = (id: string) => {
    clearUrlParameter('repo')
    requestRowExpansion(id)
  }

  const isEmpty = !data || data.length === 0
  const skeletonCount = 10
  const statusMessage = isLoading
    ? 'Loading repositories'
    : error
      ? error
      : isLoadingMore
        ? 'Loading more repositories'
        : isEmpty
          ? 'No repositories found'
          : `${data.length} repositories loaded`

  useEffect(() => {
    if (!onLoadMore || !hasMore || isLoading || isLoadingMore || error) return

    const node = loadMoreRef.current
    if (!node) return
    const scrollRoot = scrollNode ?? node.closest('[data-dashboard-scroll]')

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) onLoadMore()
      },
      {
        root: scrollRoot instanceof Element ? scrollRoot : null,
        rootMargin: '0px 0px 640px 0px',
      },
    )

    observer.observe(node)

    return () => observer.disconnect()
  }, [error, hasMore, isLoading, isLoadingMore, onLoadMore, scrollNode])

  useLayoutEffect(() => {
    if (!scrollNode) return
    const update = () => setPanelWidth(scrollNode.clientWidth)
    update()
    const observer = new ResizeObserver(update)
    observer.observe(scrollNode)
    return () => observer.disconnect()
  }, [scrollNode])

  useEffect(() => {
    if (!user) setExpandedRow(null)
  }, [user])

  useEffect(() => {
    if (!user) return
    void prefetchPersonalRepoStates(
      user.id,
      data.map(
        (record) => record.full_name || (record.name?.includes('/') ? record.name : undefined),
      ),
    )
  }, [data, user])

  useEffect(() => {
    if (isAuthOpen) {
      authPromptWasOpen.current = true
      return
    }

    if (authPromptWasOpen.current && !user) {
      pendingExpansion.current = null
      pendingAuthMessage.current = null
    }

    authPromptWasOpen.current = false
  }, [isAuthOpen, user])

  useEffect(() => {
    if (isAuthLoading) return
    const nextRow = pendingExpansion.current
    if (!nextRow) return

    if (user) {
      pendingExpansion.current = null
      pendingAuthMessage.current = null
      setExpandedRow(nextRow)
      return
    }

    const message = pendingAuthMessage.current
    if (message) {
      pendingAuthMessage.current = null
      openAuth({ message })
    }
  }, [isAuthLoading, openAuth, user])

  useEffect(() => {
    if (isLoading || isLoadingMore) deepLinkLoadStarted.current = true
  }, [isLoading, isLoadingMore])

  useEffect(() => {
    if (deepLinkApplied.current) return
    const repoParam = new URLSearchParams(window.location.search).get('repo')
    if (!repoParam) return
    if (!data || data.length === 0) {
      if (deepLinkLoadStarted.current && !isLoading && !isLoadingMore) {
        deepLinkApplied.current = true
        clearUrlParameter('repo')
      }
      return
    }
    const target = repoParam.toLowerCase()
    const index = data.findIndex(
      (record) => (record.full_name || record.name)?.toLowerCase() === target,
    )
    if (index === -1) {
      deepLinkApplied.current = true
      clearUrlParameter('repo')
      return
    }
    deepLinkApplied.current = true
    const rowId = repoKey(data[index], index)
    requestRowExpansion(rowId, 'Sign in to expand the linked repository details.')
    clearUrlParameter('repo')
    const frameId = requestAnimationFrame(() => {
      document
        .querySelector(`[data-repo-row="${CSS.escape(rowId)}"]`)
        ?.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'center' })
    })
    return () => cancelAnimationFrame(frameId)
  }, [data, isLoading, isLoadingMore, prefersReducedMotion, requestRowExpansion])

  return (
    <div
      aria-busy={isLoading || isLoadingMore}
      className={cn(
        'flex min-h-0 flex-col overflow-hidden rounded-xl border border-border/50 bg-background/40 backdrop-blur-sm',
        className,
      )}
    >
      <div role="status" aria-live="polite" className="sr-only">
        {statusMessage}
      </div>
      <TableToolbar
        query={query}
        onQueryChange={onQueryChange}
        searchPlaceholder={searchPlaceholder}
        onRefresh={onRefresh}
        isRefreshing={isLoading}
      />

      {isEmpty && !isLoading ? (
        error ? (
          <div className="p-4">
            <ErrorBanner message={error} onRetry={onRefresh} />
          </div>
        ) : (
          <EmptyState
            icon="ri:search-line"
            title="No repositories found"
            description="Try a different search or adjust the filters to widen your results."
            className="py-14"
          />
        )
      ) : (
        <ScrollShadow
          wrapperClassName="min-h-0 flex-1"
          className="w-full"
          viewportRef={setScrollNode}
          backToTop
        >
          <table
            aria-label="Repositories"
            className="w-max min-w-full table-auto border-separate border-spacing-0"
          >
            <thead>
              <TableHeadRow />
            </thead>
            <tbody>
              {isEmpty ? (
                Array.from({ length: skeletonCount }).map((_, i) => (
                  <RepoRowSkeleton key={i} index={i} />
                ))
              ) : (
                <>
                  {data.map((record, idx) => {
                    const rowId = repoKey(record, idx)
                    const isExpanded = expandedRow === rowId
                    const detailsId = `repo-details-${idx}-${rowId.replace(/[^a-zA-Z0-9_-]/g, '-')}`

                    return (
                      <Fragment key={rowId}>
                        <motion.tr
                          onClick={() => toggleRow(rowId)}
                          data-repo-row={rowId}
                          aria-expanded={isExpanded}
                          aria-controls={detailsId}
                          aria-label={`${record.full_name ?? record.name}, ${isExpanded ? 'collapse' : 'expand'} details`}
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              toggleRow(rowId)
                            }
                          }}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{
                            duration: MOTION_DURATION_SECONDS.moderate,
                            delay: Math.min(idx, 12) * MOTION_STAGGER_STEP_SECONDS,
                            ease: MOTION_EASING.standard,
                          }}
                          className="group cursor-pointer transition-colors hover:bg-row-hover"
                        >
                          {REPOSITORY_TABLE_COLUMNS.map(({ key }) => {
                            const className = cn(
                              'border-b border-b-row-divider px-3 py-3 text-sm align-middle sm:px-4',
                              COLUMN_BOUNDS[key],
                              key !== 'topics' && key !== 'name' && 'whitespace-nowrap',
                              key === 'name' && [
                                'sticky left-0 z-10 overflow-hidden border-r border-r-row-divider transition-colors group-hover:bg-row-hover',
                                NAME_COLUMN_BOUNDS,
                                isExpanded ? 'bg-row-hover' : 'bg-background',
                              ],
                            )

                            return (
                              <td key={key} className={className}>
                                {renderCell(record, key)}
                              </td>
                            )
                          })}
                        </motion.tr>
                        <AnimatePresence>
                          {isExpanded && (
                            <tr>
                              <td
                                colSpan={REPOSITORY_TABLE_COLUMNS.length}
                                className="border-b border-b-row-divider bg-background/10 p-0 shadow-inner-sm"
                              >
                                <motion.div
                                  id={detailsId}
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{
                                    duration: MOTION_DURATION_SECONDS.quick,
                                    ease: MOTION_EASING.symmetric,
                                  }}
                                  className="overflow-hidden"
                                >
                                  <div className="sticky left-0" style={{ width: panelWidth }}>
                                    <ExpandedDetails record={record} />
                                  </div>
                                </motion.div>
                              </td>
                            </tr>
                          )}
                        </AnimatePresence>
                      </Fragment>
                    )
                  })}
                  {isLoadingMore &&
                    Array.from({ length: LOADING_MORE_SKELETON_COUNT }).map((_, i) => (
                      <RepoRowSkeleton key={`loading-more-${i}`} index={i} />
                    ))}
                </>
              )}
            </tbody>
          </table>

          {onLoadMore && !isEmpty && (hasMore || isLoadingMore) && (
            <div ref={loadMoreRef} aria-hidden="true" className="h-px" />
          )}
        </ScrollShadow>
      )}
    </div>
  )
}
