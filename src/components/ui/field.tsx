import { cn } from '@/utils/cn'

export function fieldVariants(className?: string) {
  return cn(
    'w-full rounded-md border border-border/40 bg-background text-sm text-foreground placeholder:text-muted-foreground',
    'transition-[border-color,box-shadow] duration-200 ease-out',
    'enabled:hover:border-border/70',
    'focus:border-border focus:outline-none focus:ring-[0.5px] focus:ring-inset focus:ring-ring/30',
    'disabled:cursor-not-allowed disabled:opacity-50',
    className,
  )
}

export const fieldIconVariants =
  'pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors duration-200 ease-out'
