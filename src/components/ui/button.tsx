import type { ComponentProps } from 'react'
import { cn } from '@/utils/cn'

const BUTTON_VARIANTS = {
  default:
    'border border-border/40 bg-background text-foreground hover:border-border/70 hover:bg-muted-hover',
  primary: 'bg-primary text-primary-foreground hover:opacity-90',
  destructive:
    'border border-destructive/40 bg-destructive/10 text-destructive hover:border-destructive/60 hover:bg-destructive/20',
} as const

const BUTTON_SIZES = {
  default: 'h-9 gap-2 px-3 text-sm',
  sm: 'h-7 gap-1.5 px-2 text-xs',
} as const

export type ButtonVariant = keyof typeof BUTTON_VARIANTS
export type ButtonSize = keyof typeof BUTTON_SIZES

export function buttonVariants(options?: {
  variant?: ButtonVariant
  size?: ButtonSize
  className?: string
}) {
  return cn(
    'inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-md font-medium transition active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60',
    BUTTON_VARIANTS[options?.variant ?? 'default'],
    BUTTON_SIZES[options?.size ?? 'default'],
    options?.className,
  )
}

export function Button({
  variant = 'default',
  size = 'default',
  type = 'button',
  className,
  ...props
}: ComponentProps<'button'> & {
  variant?: ButtonVariant
  size?: ButtonSize
}) {
  return <button type={type} className={buttonVariants({ variant, size, className })} {...props} />
}
