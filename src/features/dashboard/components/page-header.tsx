'use client'

import type { ReactNode } from 'react'
import CountPill from '@/components/ui/count-pill'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/utils/cn'

export default function PageHeader({
  title,
  description,
  count,
  actions,
  className,
}: {
  title: ReactNode
  description: ReactNode
  count?: number
  actions?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex shrink-0 flex-col items-start justify-between gap-4 sm:flex-row sm:flex-wrap',
        className,
      )}
    >
      <div className="flex min-w-0 flex-col gap-1.5">
        <div className="flex items-center gap-3">
          <h1 className="text-balance text-lg font-medium leading-[100%] text-primary sm:text-xl">
            {title}
          </h1>
          {count !== undefined && <CountPill count={count} />}
        </div>
        <p className="max-w-md text-pretty text-[13px] text-muted-foreground">{description}</p>
      </div>
      {actions && (
        <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row">{actions}</div>
      )}
    </div>
  )
}

export function PageHeaderSkeleton({ actionClassName }: { actionClassName?: string }) {
  return (
    <div className="flex shrink-0 flex-col items-start justify-between gap-4 sm:flex-row sm:flex-wrap">
      <div className="flex min-w-0 flex-col gap-1.5">
        <div className="flex items-center gap-3">
          <Skeleton className="h-6 w-28" />
          <Skeleton className="h-5 w-9 rounded-sm" />
        </div>
        <Skeleton className="h-3.5 w-80 max-w-full" />
      </div>
      {actionClassName && <Skeleton className={actionClassName} />}
    </div>
  )
}
