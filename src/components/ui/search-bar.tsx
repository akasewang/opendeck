import { Icon } from '@iconify/react'
import type { ComponentProps } from 'react'
import { fieldIconVariants, fieldVariants } from '@/components/ui/field'
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
        className={cn(fieldIconVariants, 'left-3 group-focus-within:text-primary')}
      />
      <input
        type="search"
        onChange={(event) => {
          onChange?.(event)
          onSearchChange?.(event.target.value)
        }}
        className={fieldVariants(
          cn('h-9 overflow-hidden text-ellipsis whitespace-nowrap pl-9 pr-3', inputClassName),
        )}
        {...props}
      />
    </div>
  )
}
