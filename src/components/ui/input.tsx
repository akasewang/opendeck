import { Icon } from '@iconify/react'
import type { ComponentProps } from 'react'
import { cn } from '@/utils/cn'

export function Input({ className, icon, ...props }: ComponentProps<'input'> & { icon?: string }) {
  const input = (
    <input
      className={cn(
        'h-9 w-full rounded-md border border-border/30 bg-background px-3 text-sm text-foreground transition-colors placeholder:text-muted-foreground hover:border-border/60 focus:border-border/70 focus:outline-none',
        icon && 'pl-9',
        className,
      )}
      {...props}
    />
  )

  if (!icon) return input

  return (
    <div className="group relative w-full">
      <Icon
        icon={icon}
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary"
      />
      {input}
    </div>
  )
}
