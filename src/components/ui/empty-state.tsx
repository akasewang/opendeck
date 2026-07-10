'use client'

import { Icon } from '@iconify/react'
import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'

type EmptyStateProps = {
  icon: string
  title: string
  description?: string
  children?: ReactNode
  className?: string
}

export function EmptyState({ icon, title, description, children, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-border/60 px-6 py-10 text-center',
        className,
      )}
    >
      <Icon icon={icon} className="h-6 w-6 text-muted-foreground/60" />
      <p className="mt-1 text-balance text-sm font-medium text-foreground">{title}</p>
      {description && (
        <p className="max-w-sm text-pretty text-sm text-muted-foreground">{description}</p>
      )}
      {children && <div className="mt-2 flex flex-wrap justify-center gap-2">{children}</div>}
    </div>
  )
}
