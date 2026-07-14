import type { ComponentProps } from 'react'
import { cn } from '@/utils/cn'

export function TextArea({ className, ...props }: ComponentProps<'textarea'>) {
  return (
    <textarea
      className={cn(
        'min-h-20 w-full resize-y rounded-md border border-border/30 bg-background px-3 py-2 text-sm text-foreground transition-colors placeholder:text-muted-foreground hover:border-border/60 focus:border-border/70 focus:outline-none',
        className,
      )}
      {...props}
    />
  )
}
