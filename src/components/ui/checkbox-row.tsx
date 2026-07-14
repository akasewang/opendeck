import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'

export function CheckboxRow({
  checked,
  onChange,
  className,
  children,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  className?: string
  children: ReactNode
}) {
  return (
    <label
      className={cn(
        'flex min-h-9 cursor-pointer items-center gap-2.5 rounded-md border border-border/40 bg-background/40 px-3 py-2 text-sm text-muted-foreground transition-[background-color,border-color,color] duration-200 hover:border-border/70 hover:bg-row-hover hover:text-foreground',
        className,
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="accent-primary"
      />
      {children}
    </label>
  )
}
