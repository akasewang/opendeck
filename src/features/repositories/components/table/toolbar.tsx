'use client'

import { Icon } from '@iconify/react'
import { motion } from 'framer-motion'
import { SearchBar } from '@/components/ui/search-bar'
import { cn } from '@/utils/cn'

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
    <div className="flex items-center justify-between gap-3 border-b border-border/50 px-3 py-2.5">
      <div className="flex items-center gap-2">
        {onRefresh && (
          <motion.button
            type="button"
            onClick={onRefresh}
            aria-label="Refresh"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.92 }}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border/50 bg-background/40 text-muted-foreground transition-colors hover:border-border hover:text-foreground"
          >
            <Icon
              icon="ri:refresh-line"
              className={cn('h-4 w-4', isRefreshing && 'animate-spin')}
            />
          </motion.button>
        )}
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
