import type { CSSProperties } from 'react'
import { cardVariants } from '@/components/ui/card'
import { cn } from '@/utils/cn'

export function Skeleton({ className, style }: { className?: string; style?: CSSProperties }) {
  return <div aria-hidden="true" style={style} className={cn('skeleton rounded-md', className)} />
}

export function skeletonStagger(index: number) {
  return { '--skeleton-delay': `${(index % 8) * -0.12}s` } as CSSProperties
}

const SKELETON_PANEL_LINE_WIDTHS = [
  'w-[72%]',
  'w-[48%]',
  'w-[85%]',
  'w-[60%]',
  'w-[76%]',
  'w-[54%]',
]

export function SkeletonPanel({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cardVariants({ className: cn('flex flex-col overflow-hidden', className) })}
    >
      <div className="flex h-11 shrink-0 items-center gap-2 border-b border-border/40 px-4">
        <Skeleton className="h-4 w-4 rounded-sm" />
        <Skeleton className="h-3.5 w-28" />
      </div>
      <div className="min-h-0 flex-1 divide-y divide-border/30 overflow-hidden">
        {Array.from({ length: 16 }).map((_, index) => (
          <div
            key={index}
            style={skeletonStagger(index)}
            className="flex items-center justify-between gap-3 px-4 py-3"
          >
            <Skeleton
              className={cn(
                'h-3.5',
                SKELETON_PANEL_LINE_WIDTHS[index % SKELETON_PANEL_LINE_WIDTHS.length],
              )}
            />
            <Skeleton className="h-5 w-12 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  )
}
