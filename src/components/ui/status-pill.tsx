import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'

const STATUS_TONES = {
  success: 'border-success/30 bg-success/10 text-success',
  destructive: 'border-destructive/30 bg-destructive/10 text-destructive',
  neutral: 'border-border/40 text-muted-foreground',
} as const

export type StatusTone = keyof typeof STATUS_TONES

export function StatusPill({
  tone,
  size = 'md',
  className,
  children,
}: {
  tone: StatusTone
  size?: 'sm' | 'md'
  className?: string
  children: ReactNode
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-sm border font-medium capitalize',
        size === 'sm' ? 'px-1.5 py-0.5 text-2xs' : 'px-2 py-1 text-xs',
        STATUS_TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}
