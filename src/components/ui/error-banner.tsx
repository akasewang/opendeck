'use client'

import { Icon } from '@iconify/react'
import { motion } from 'framer-motion'
import { MOTION_SPRING } from '@/config/motion'
import { Button } from '@/components/ui/button'

export function ErrorBanner({
  message,
  icon = 'ri:error-warning-line',
  onRetry,
}: {
  message: string
  icon?: string
  onRetry?: () => void
}) {
  return (
    <motion.div
      role="alert"
      initial={{ opacity: 0, y: -6, scale: 0.99 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -6, scale: 0.99 }}
      transition={MOTION_SPRING.alert}
      className="flex flex-wrap items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4"
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-destructive/25 bg-destructive/10 text-destructive">
        <Icon icon={icon} className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1 text-sm text-destructive">{message}</span>
      {onRetry && (
        <Button variant="destructive" onClick={onRetry}>
          <Icon icon="ri:refresh-line" className="h-4 w-4" />
          Retry
        </Button>
      )}
    </motion.div>
  )
}
