import type { ComponentProps } from 'react'
import { cn } from '@/utils/cn'

const tagBase = cn(
  'inline-flex w-fit items-center gap-1.5 whitespace-nowrap rounded-md border leading-none',
  "[&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5",
)

export function SimpleTag({ className, ...props }: ComponentProps<'span'>) {
  return (
    <span
      data-slot="tag"
      className={cn(
        tagBase,
        'border-border/80 bg-background px-2 py-1 font-mono text-2xs text-muted-foreground',
        className,
      )}
      {...props}
    />
  )
}

export function ColorfulTag({ className, ...props }: ComponentProps<'span'>) {
  return (
    <span
      data-slot="colorful-tag"
      className={cn(tagBase, 'px-2.5 py-1 text-xs font-medium capitalize', className)}
      {...props}
    />
  )
}
