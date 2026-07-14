'use client'

import { Icon } from '@iconify/react'
import { motion, type Variants } from 'framer-motion'
import type { ReactNode } from 'react'
import { cardVariants } from '@/components/ui/card'
import CountPill from '@/components/ui/count-pill'
import { ScrollShadow } from '@/components/ui/scroll-shadow'
import { cn } from '@/utils/cn'

export type DataPanelProps = {
  icon?: string
  title: string
  count?: number
  right?: ReactNode
  className?: string
  bodyClassName?: string
  scrollable?: boolean
  variants?: Variants
  viewportRef?: (node: HTMLDivElement | null) => void
  children: ReactNode
}

export function DataPanel({
  icon,
  title,
  count,
  right,
  className,
  bodyClassName,
  scrollable = true,
  variants,
  viewportRef,
  children,
}: DataPanelProps) {
  return (
    <motion.section
      variants={variants}
      className={cardVariants({
        className: cn('grid grid-rows-[auto_minmax(0,1fr)] overflow-hidden', className),
      })}
    >
      <div className="flex h-11 items-center justify-between gap-3 border-b border-border/40 px-4">
        <h2 className="flex min-w-0 items-center gap-2 text-sm font-semibold text-foreground">
          {icon && <Icon icon={icon} className="h-4 w-4 shrink-0 text-muted-foreground/70" />}
          <span className="truncate">{title}</span>
          {count !== undefined && <CountPill count={count} />}
        </h2>
        {right}
      </div>
      {scrollable ? (
        <ScrollShadow
          wrapperClassName="min-h-0"
          className={bodyClassName}
          viewportRef={viewportRef}
          backToTop
        >
          {children}
        </ScrollShadow>
      ) : (
        <div ref={viewportRef} className={cn('min-h-0 overflow-y-auto', bodyClassName)}>
          {children}
        </div>
      )}
    </motion.section>
  )
}

export function DataPanelEmpty({ children }: { children: ReactNode }) {
  return <div className="flex h-full items-center justify-center p-4">{children}</div>
}
