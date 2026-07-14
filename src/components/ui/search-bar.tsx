import { Icon } from '@iconify/react'
import type { ComponentProps } from 'react'
import { cn } from '@/utils/cn'

type SearchBarProps = ComponentProps<'input'> & {
  onSearchChange?: (value: string) => void
  inputClassName?: string
}

export function SearchBar({
  className,
  inputClassName,
  onChange,
  onSearchChange,
  ...props
}: SearchBarProps) {
  return (
    <div className={cn('group relative w-full', className)}>
      <Icon
        icon="ri:search-line"
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary"
      />
      <input
        type="search"
        onChange={(event) => {
          onChange?.(event)
          onSearchChange?.(event.target.value)
        }}
        className={cn(
          'h-9 w-full overflow-hidden text-ellipsis whitespace-nowrap rounded-md border border-border/30 bg-background pl-9 pr-3 text-sm text-foreground transition-colors placeholder:text-muted-foreground hover:border-border/60 focus:border-border/70 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50',
          inputClassName,
        )}
        {...props}
      />
    </div>
  )
}
