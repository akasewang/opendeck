'use client'

import { Icon } from '@iconify/react'
import { motion } from 'framer-motion'
import { cn } from '@/utils/cn'

export function RefreshButton({
  onClick,
  isRefreshing,
  ariaLabel = 'Refresh',
  title,
  className,
}: {
  onClick?: () => void
  isRefreshing?: boolean
  ariaLabel?: string
  title?: string
  className?: string
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-label={isRefreshing ? `${ariaLabel} in progress` : ariaLabel}
      aria-busy={isRefreshing || undefined}
      title={title}
      disabled={isRefreshing}
      whileHover={{ scale: isRefreshing ? 1 : 1.05 }}
      whileTap={{ scale: isRefreshing ? 1 : 0.92 }}
      className={cn(
        'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border/50 bg-background/40 text-muted-foreground transition-colors hover:border-border/60 hover:text-foreground disabled:pointer-events-none disabled:opacity-60',
        className,
      )}
    >
      <Icon icon="ri:refresh-line" className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
    </motion.button>
  )
}
