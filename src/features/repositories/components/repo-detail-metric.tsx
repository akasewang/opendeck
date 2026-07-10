'use client'

import { Icon } from '@iconify/react'
import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { chipItem } from '@/features/repositories/components/repo-detail-motion'

export function Metric({
  icon,
  leading,
  value,
  label,
}: {
  icon?: string
  leading?: ReactNode
  value: string
  label?: string
}) {
  return (
    <motion.span
      variants={chipItem}
      className="inline-flex items-center gap-1.5 text-sm text-muted-foreground"
    >
      {leading ?? (icon ? <Icon icon={icon} className="h-4 w-4 text-muted-foreground/70" /> : null)}
      <span className="font-medium text-foreground">{value}</span>
      {label}
    </motion.span>
  )
}
