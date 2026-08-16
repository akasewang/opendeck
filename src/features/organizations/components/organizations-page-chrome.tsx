'use client'

import { RefreshButton } from '@/components/ui/refresh-button'
import { SearchBar } from '@/components/ui/search-bar'
import { Skeleton, skeletonStagger } from '@/components/ui/skeleton'
import {
  OWNER_COLUMN_CLASS,
  SKELETON_COUNT_WIDTHS,
  SKELETON_LANGUAGE_WIDTHS,
  SKELETON_OWNER_WIDTHS,
  SKELETON_REPO_WIDTHS,
  TABLE_CELL_CLASS,
  TOP_REPOSITORY_COLUMN_CLASS,
} from '@/features/organizations/components/organizations-page-presets'
import { cn } from '@/utils/cn'

export function OrganizationToolbar({
  query,
  onQueryChange,
  onRefresh,
  isRefreshing,
}: {
  query: string
  onQueryChange: (value: string) => void
  onRefresh: () => void
  isRefreshing?: boolean
}) {
  return (
    <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border/50 px-3 py-2.5">
      <RefreshButton
        onClick={onRefresh}
        isRefreshing={isRefreshing}
        ariaLabel="Refresh organizations"
      />

      <div className="relative w-full max-w-md">
        <SearchBar
          value={query}
          onSearchChange={onQueryChange}
          placeholder="Search organizations"
          aria-label="Search organizations"
          inputClassName="border-border/50 bg-background/40"
        />
      </div>
    </div>
  )
}

export function OrganizationSkeleton({ index = 0 }: { index?: number }) {
  const ownerWidth = SKELETON_OWNER_WIDTHS[index % SKELETON_OWNER_WIDTHS.length]
  const languageWidth = SKELETON_LANGUAGE_WIDTHS[index % SKELETON_LANGUAGE_WIDTHS.length]
  const reposWidth = SKELETON_COUNT_WIDTHS[index % SKELETON_COUNT_WIDTHS.length]
  const starsWidth = SKELETON_COUNT_WIDTHS[(index + 2) % SKELETON_COUNT_WIDTHS.length]
  const repoWidth = SKELETON_REPO_WIDTHS[index % SKELETON_REPO_WIDTHS.length]

  return (
    <tr style={skeletonStagger(index)}>
      <td className={`${TABLE_CELL_CLASS} ${OWNER_COLUMN_CLASS}`}>
        <div className="flex items-center gap-2.5">
          <Skeleton className="h-6 w-6 shrink-0" />
          <Skeleton className={cn('h-3.5 max-w-full', ownerWidth)} />
        </div>
      </td>
      <td className={TABLE_CELL_CLASS}>
        <Skeleton className={cn('h-5', languageWidth)} />
      </td>
      <td className={TABLE_CELL_CLASS}>
        <Skeleton className={cn('h-3.5', reposWidth)} />
      </td>
      <td className={TABLE_CELL_CLASS}>
        <Skeleton className={cn('h-3.5', starsWidth)} />
      </td>
      <td className={cn(TABLE_CELL_CLASS, TOP_REPOSITORY_COLUMN_CLASS)}>
        <Skeleton className={cn('h-3.5 max-w-full', repoWidth)} />
      </td>
    </tr>
  )
}
