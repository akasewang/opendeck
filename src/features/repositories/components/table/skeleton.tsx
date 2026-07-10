import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/utils/cn'
import {
  COLUMN_BOUNDS,
  COLUMN_RESPONSIVE,
  REPOSITORY_COLUMN_BOUNDS,
  REPOSITORY_COLUMN_DIVIDER,
  TABLE_CELL_BORDER,
} from './constants'
import { TableHeadRow } from './head-row'

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
    <tr>
      <td
        className={cn(
          'sticky left-0 z-10 overflow-hidden bg-background px-3 py-3 sm:px-4',
          TABLE_CELL_BORDER,
          REPOSITORY_COLUMN_BOUNDS,
          REPOSITORY_COLUMN_DIVIDER,
        )}
      >
        <div className="flex items-center gap-2.5">
          <Skeleton className="h-6 w-6 shrink-0 rounded-md" />
          <Skeleton className={cn('h-3.5 max-w-full', nameWidth)} />
        </div>
      </td>
      <td
        className={cn(
          'overflow-hidden px-3 py-3 sm:px-4',
          TABLE_CELL_BORDER,
          COLUMN_BOUNDS.language,
          COLUMN_RESPONSIVE.language,
        )}
      >
        <Skeleton className="h-5 w-16" />
      </td>
      <td
        className={cn(
          'overflow-hidden px-3 py-3 sm:px-4',
          TABLE_CELL_BORDER,
          COLUMN_BOUNDS.topics,
          COLUMN_RESPONSIVE.topics,
        )}
      >
        <div className="flex gap-1.5">
          <Skeleton className={cn('h-5', topicA)} />
          <Skeleton className={cn('h-5', topicB)} />
        </div>
      </td>
      <td
        className={cn(
          'overflow-hidden px-3 py-3 sm:px-4',
          TABLE_CELL_BORDER,
          COLUMN_BOUNDS.open_issues_count,
          COLUMN_RESPONSIVE.open_issues_count,
        )}
      >
        <Skeleton className={cn('h-3.5', issuesWidth)} />
      </td>
      <td
        className={cn(
          'overflow-hidden px-3 py-3 sm:px-4',
          TABLE_CELL_BORDER,
          COLUMN_BOUNDS.stargazers_count,
        )}
      >
        <Skeleton className={cn('h-3.5', starsWidth)} />
      </td>
      <td
        className={cn(
          'overflow-hidden px-3 py-3 sm:px-4',
          TABLE_CELL_BORDER,
          COLUMN_BOUNDS.contribution_score,
          COLUMN_RESPONSIVE.contribution_score,
        )}
      >
        <Skeleton className="h-6 w-[8.5rem] rounded-md" />
      </td>
    </tr>
  )
}

export function RepoTableSkeleton({ rows = 10 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border/50 bg-background/40 backdrop-blur-sm">
      <div className="flex items-center justify-between gap-3 border-b border-border/50 px-3 py-2.5">
        <Skeleton className="h-9 w-9 rounded-lg" />
        <Skeleton className="h-9 w-full max-w-md rounded-lg" />
      </div>
      <div className="hide-scrollbar w-full overflow-x-auto">
        <table className="w-max min-w-full table-auto border-separate border-spacing-0">
          <thead>
            <TableHeadRow />
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, i) => (
              <RepoRowSkeleton key={i} index={i} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
