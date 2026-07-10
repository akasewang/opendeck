import * as React from 'react'
import { Search } from '@/components/ui/icons'
import { cn } from '@/utils/cn'

interface SearchBarProps extends React.InputHTMLAttributes<HTMLInputElement> {
  value?: string
  onSearchChange?: (value: string) => void
  inputClassName?: string
}

const SearchBar = React.forwardRef<HTMLInputElement, SearchBarProps>(
  ({ className, inputClassName, value, onChange, onSearchChange, ...props }, ref) => {
    return (
      <div className={cn('relative w-full group', className)}>
        <Search className="absolute left-3 top-1/2 h-[15px] w-[15px] -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary pointer-events-none" />
        <input
          type="search"
          ref={ref}
          value={value}
          onChange={(e) => {
            onChange?.(e)
            onSearchChange?.(e.target.value)
          }}
          className={cn(
            'flex h-9 w-full overflow-hidden text-ellipsis whitespace-nowrap rounded-md border border-border/30 bg-background px-3 py-2 pl-9 text-sm text-foreground transition-all duration-300 ease-out placeholder:text-muted-foreground focus:border-border/60 focus:outline-none focus:ring-[0.5px] focus:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50 hover:border-border/60',
            inputClassName,
          )}
          {...props}
        />
      </div>
    )
  },
)
SearchBar.displayName = 'SearchBar'

export { SearchBar }
