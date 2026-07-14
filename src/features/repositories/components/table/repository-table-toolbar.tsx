'use client'

import { RefreshButton } from '@/components/ui/refresh-button'
import { SearchBar } from '@/components/ui/search-bar'

export function TableToolbar({
  query,
  onQueryChange,
  searchPlaceholder,
  onRefresh,
  isRefreshing,
}: {
  query?: string
  onQueryChange?: (value: string) => void
  searchPlaceholder?: string
  onRefresh?: () => void
  isRefreshing?: boolean
}) {
  return (
    <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border/50 px-3 py-2.5">
      <div className="flex items-center gap-2">
        {onRefresh && <RefreshButton onClick={onRefresh} isRefreshing={isRefreshing} />}
      </div>

      {onQueryChange && (
        <div className="relative w-full max-w-md">
          <SearchBar
            value={query ?? ''}
            onSearchChange={onQueryChange}
            placeholder={searchPlaceholder}
            aria-label="Search repositories"
            inputClassName="border-border/50 bg-background/40"
          />
        </div>
      )}
    </div>
  )
}
