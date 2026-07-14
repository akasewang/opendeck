import type { ComponentProps } from 'react'
import { fieldVariants } from '@/components/ui/field'
import { cn } from '@/utils/cn'

export function TextArea({ className, ...props }: ComponentProps<'textarea'>) {
  return (
    <textarea className={fieldVariants(cn('min-h-20 resize-y px-3 py-2', className))} {...props} />
  )
}
