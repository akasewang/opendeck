import { Icon } from '@iconify/react'
import type { ComponentProps } from 'react'
import { fieldIconVariants, fieldVariants } from '@/components/ui/field'
import { cn } from '@/utils/cn'

export function Input({ className, icon, ...props }: ComponentProps<'input'> & { icon?: string }) {
  const input = (
    <input className={fieldVariants(cn('h-9 px-3', icon && 'pl-9', className))} {...props} />
  )

  if (!icon) return input

  return (
    <div className="group relative w-full">
      <Icon
        icon={icon}
        className={cn(fieldIconVariants, 'left-3 group-focus-within:text-primary')}
      />
      {input}
    </div>
  )
}
