import type { ComponentProps } from 'react'
import { cn } from '@/utils/cn'

export function cardVariants(options?: { interactive?: boolean; className?: string }) {
  return cn(
    'rounded-lg border border-border/50 bg-background/40',
    options?.interactive &&
      'transition-[background-color,border-color,box-shadow] duration-200 hover:border-border/70 hover:bg-row-hover hover:shadow-[0_2px_14px_oklch(0%_0_0_/_0.35)]',
    options?.className,
  )
}

export function Card({
  interactive,
  className,
  ...props
}: ComponentProps<'div'> & { interactive?: boolean }) {
  return <div className={cardVariants({ interactive, className })} {...props} />
}
