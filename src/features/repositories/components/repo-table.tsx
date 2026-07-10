'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Fragment, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useAuth } from '@/features/auth/auth-provider'
import { ExpandedDetails } from '@/features/repositories/components/repo-expanded-details'
import {
  COLUMN_BOUNDS,
  clearUrlParam,
  LOADING_MORE_SKELETON_COUNT,
  REPOSITORY_COLUMN_BOUNDS,
  REPOSITORY_COLUMN_DIVIDER,
  RepoRowSkeleton,
  renderCell,
  repoKey,
  TABLE_CELL_BORDER,
  TableHeadRow,
  TableToolbar,
} from '@/features/repositories/components/table'
import { COLUMNS, type Repo } from '@/features/repositories/types'
import { cn } from '@/utils/cn'

export { RepoTableSkeleton } from '@/features/repositories/components/table'

export default function RepoTable({
  data,
  isLoading,
  error,
  query,
  onQueryChange,
  searchPlaceholder = 'Search by repo / name',
  onRefresh,
  hasMore,
  isLoadingMore,
  onLoadMore,
}: {
  data: Repo[]
  isLoading?: boolean
  isLoadingMore?: boolean
  error?: string | null
  query?: string
  onQueryChange?: (value: string) => void
  searchPlaceholder?: string
  onRefresh?: () => void
  hasMore?: boolean
  onLoadMore?: () => void
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

  const expandRow = useCallback((id: string) => {
    setExpandedRow((prev) => (prev === id ? null : id))
  }, [])

  const requestRowExpansion = useCallback(
    (
      id: string,
      message = 'Sign in to expand repository rows and inspect contribution details.',
    ) => {
      clearUrlParam('repo')

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
    clearUrlParam('repo')
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
    const scrollRoot = node.closest('[data-dashboard-scroll]')

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
  }, [error, hasMore, isLoading, isLoadingMore, onLoadMore])

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
        clearUrlParam('repo')
      }
      return
    }
    const target = repoParam.toLowerCase()
    const index = data.findIndex(
      (record) => (record.full_name || record.name)?.toLowerCase() === target,
    )
    if (index === -1) {
      deepLinkApplied.current = true
      clearUrlParam('repo')
      return
    }
    deepLinkApplied.current = true
    const rowId = repoKey(data[index], index)
    requestRowExpansion(rowId, 'Sign in to expand the linked repository details.')
    clearUrlParam('repo')
    const frameId = requestAnimationFrame(() => {
      document
        .querySelector(`[data-repo-row="${CSS.escape(rowId)}"]`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
    return () => cancelAnimationFrame(frameId)
  }, [data, isLoading, isLoadingMore, requestRowExpansion])

  return (
    <div
      aria-busy={isLoading || isLoadingMore}
      className="overflow-hidden rounded-xl border border-border/50 bg-background/40 backdrop-blur-sm"
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
        <div className="py-16 text-center">
          <div className="font-medium text-base text-muted-foreground">
            {error ?? 'No repositories found.'}
          </div>
        </div>
      ) : (
        <div ref={setScrollNode} className="hide-scrollbar w-full overflow-x-auto">
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
                            duration: 0.25,
                            delay: Math.min(idx, 12) * 0.025,
                            ease: 'easeOut',
                          }}
                          className="group cursor-pointer transition-colors hover:bg-muted-hover"
                        >
                          {COLUMNS.map(({ key }) => {
                            const className = cn(
                              'px-3 py-3 text-sm align-middle sm:px-4',
                              TABLE_CELL_BORDER,
                              COLUMN_BOUNDS[key],
                              key !== 'topics' && 'whitespace-nowrap',
                              key === 'name' && [
                                'sticky left-0 z-10 overflow-hidden transition-colors group-hover:bg-row-hover',
                                REPOSITORY_COLUMN_BOUNDS,
                                REPOSITORY_COLUMN_DIVIDER,
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
                                colSpan={COLUMNS.length}
                                className="border-b border-row-divider bg-background/10 p-0 shadow-inner-sm"
                              >
                                <motion.div
                                  id={detailsId}
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.2, ease: 'easeInOut' }}
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
        </div>
      )}

      {onLoadMore && !isEmpty && (hasMore || isLoadingMore) && (
        <div ref={loadMoreRef} aria-hidden="true" className="h-px" />
      )}
    </div>
  )
}
