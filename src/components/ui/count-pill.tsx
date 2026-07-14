'use client'

import { motion } from 'framer-motion'
import { MOTION_SPRING } from '@/config/motion'
import { cn } from '@/utils/cn'
import { formatNumber } from '@/utils/format-number'

interface CountPillProps {
  count: number
  className?: string
}

export default function CountPill({ count, className }: CountPillProps) {
  if (count <= 0) return null

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={MOTION_SPRING.count}
      className={cn(
        'flex h-5 items-center justify-center rounded-sm bg-muted/60 px-2.5 text-2xs font-mono font-medium text-muted-foreground',
        className,
      )}
    >
      {formatNumber(count)}
    </motion.div>
  )
}
