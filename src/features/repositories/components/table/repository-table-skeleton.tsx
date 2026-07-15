'use client'

import { useState } from 'react'
import { ScrollShadow } from '@/components/ui/scroll-shadow'
import { Skeleton, skeletonStagger } from '@/components/ui/skeleton'
import { useSkeletonRowCount } from '@/hooks/use-skeleton-row-count'
import { cn } from '@/utils/cn'
import { TableHeadRow } from './repository-table-header'

const NAME_COLUMN_BOUNDS =
  'w-auto min-w-[11rem] max-w-[22rem] sm:min-w-[18rem] sm:max-w-[28rem] md:min-w-[20rem] md:max-w-[34rem] lg:min-w-[24rem] lg:max-w-[42rem] xl:max-w-[50rem] 2xl:max-w-[58rem]'
const SKELETON_NAME_WIDTHS = ['w-36', 'w-52', 'w-28', 'w-44', 'w-60', 'w-32', 'w-48', 'w-40']
const SKELETON_TOPIC_WIDTHS: Array<[string, string]> = [
  ['w-16', 'w-10'],
  ['w-12', 'w-16'],
  ['w-20', 'w-12'],
  ['w-14', 'w-14'],
]
const SKELETON_COUNT_WIDTHS = ['w-10', 'w-14', 'w-8', 'w-12']

export function RepoRowSkeleton({ index = 0 }: { index?: number }) {
  const nameWidth = SKELETON_NAME_WIDTHS[index % SKELETON_NAME_WIDTHS.length]
  const [topicA, topicB] = SKELETON_TOPIC_WIDTHS[index % SKELETON_TOPIC_WIDTHS.length]
  const issuesWidth = SKELETON_COUNT_WIDTHS[index % SKELETON_COUNT_WIDTHS.length]
  const starsWidth = SKELETON_COUNT_WIDTHS[(index + 2) % SKELETON_COUNT_WIDTHS.length]

  return (
    <tr style={skeletonStagger(index)}>
      <td
        className={cn(
          'sticky left-0 z-10 overflow-hidden border-b border-b-row-divider border-r border-r-row-divider bg-background px-3 py-3 sm:px-4',
          NAME_COLUMN_BOUNDS,
        )}
      >
        <div className="flex items-center gap-2.5">
          <Skeleton className="h-6 w-6 shrink-0 rounded-md" />
          <Skeleton className={cn('h-3.5 max-w-full', nameWidth)} />
        </div>
      </td>
      <td
        className={cn(
          'overflow-hidden border-b border-b-row-divider px-3 py-3 sm:px-4',
          'min-w-[8rem]',
        )}
      >
        <Skeleton className="h-5 w-16" />
      </td>
      <td
        className={cn(
          'overflow-hidden border-b border-b-row-divider px-3 py-3 sm:px-4',
          'min-w-[16rem]',
        )}
      >
        <div className="flex gap-1.5">
          <Skeleton className={cn('h-5', topicA)} />
          <Skeleton className={cn('h-5', topicB)} />
        </div>
      </td>
      <td
        className={cn(
          'overflow-hidden border-b border-b-row-divider px-3 py-3 sm:px-4',
          'min-w-[7.5rem]',
        )}
      >
        <Skeleton className={cn('h-3.5', issuesWidth)} />
      </td>
      <td
        className={cn(
          'overflow-hidden border-b border-b-row-divider px-3 py-3 sm:px-4',
          'min-w-[7rem]',
        )}
      >
        <Skeleton className={cn('h-3.5', starsWidth)} />
      </td>
      <td
        className={cn(
          'overflow-hidden border-b border-b-row-divider px-3 py-3 sm:px-4',
          'min-w-[10.75rem]',
        )}
      >
        <Skeleton className="h-6 w-[8.5rem] rounded-md" />
      </td>
    </tr>
  )
}

export function RepoTableSkeleton({ className }: { className?: string }) {
  const [viewport, setViewport] = useState<HTMLDivElement | null>(null)
  const rows = useSkeletonRowCount({ node: viewport })

  return (
    <div
      className={cn(
        'flex min-h-0 flex-col overflow-hidden rounded-xl border border-border/50 bg-background/40 backdrop-blur-sm',
        className,
      )}
    >
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border/50 px-3 py-2.5">
        <Skeleton className="h-9 w-9 rounded-lg" />
        <Skeleton className="h-9 w-full max-w-md rounded-lg" />
      </div>
      <ScrollShadow wrapperClassName="min-h-0 flex-1" className="w-full" viewportRef={setViewport}>
        <table
          aria-hidden="true"
          className="w-max min-w-full table-auto border-separate border-spacing-0"
        >
          <thead>
            <TableHeadRow />
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, i) => (
              <RepoRowSkeleton key={i} index={i} />
            ))}
          </tbody>
        </table>
      </ScrollShadow>
    </div>
  )
}
