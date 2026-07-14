'use client'

import * as SelectPrimitive from '@radix-ui/react-select'
import { type ComponentPropsWithoutRef, type ComponentRef, forwardRef } from 'react'
import { fieldVariants } from '@/components/ui/field'
import { Check, ChevronDown } from '@/components/ui/icons'
import { cn } from '@/utils/cn'

const SelectRoot = SelectPrimitive.Root
const SelectValue = SelectPrimitive.Value

const SelectTrigger = forwardRef<
  ComponentRef<typeof SelectPrimitive.Trigger>,
  ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    {...props}
    className={fieldVariants(
      cn(
        'group flex h-9 items-center justify-between gap-2 px-3 py-2 data-[state=open]:border-border [&>span]:line-clamp-1',
        className,
      ),
    )}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown className="size-4 shrink-0 opacity-50 transition-transform duration-300 ease-out group-data-[state=open]:rotate-180" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
))
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName

const SelectContent = forwardRef<
  ComponentRef<typeof SelectPrimitive.Content>,
  ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = 'popper', ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      position={position}
      sideOffset={6}
      className={cn(
        'select-content-elegant relative z-50 min-w-[8rem] overflow-hidden rounded-lg border border-border/60 bg-card/95 backdrop-blur-md text-foreground shadow-lg',
        position === 'popper' && 'w-[var(--radix-select-trigger-width)]',
        className,
      )}
      {...props}
    >
      <SelectPrimitive.Viewport className="max-h-[var(--radix-select-content-available-height)] overflow-y-auto p-1">
        {children}
      </SelectPrimitive.Viewport>
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
))
SelectContent.displayName = SelectPrimitive.Content.displayName

const SelectItem = forwardRef<
  ComponentRef<typeof SelectPrimitive.Item>,
  ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    {...props}
    className={cn(
      'relative flex w-full cursor-pointer select-none items-center justify-between rounded-md py-1.5 px-2 text-sm outline-none transition-colors focus:bg-primary/10 focus:text-primary data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[state=checked]:text-primary data-[state=checked]:font-medium',
      className,
    )}
  >
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    <span className="flex size-4 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check className="h-4 w-4 text-primary" />
      </SelectPrimitive.ItemIndicator>
    </span>
  </SelectPrimitive.Item>
))
SelectItem.displayName = SelectPrimitive.Item.displayName

interface SelectOption {
  value: string
  label: string
}

interface SelectProps {
  value: string
  onChange: (e: { target: { value: string } }) => void
  options: ReadonlyArray<SelectOption>
  placeholder?: string
  className?: string
  ariaLabel?: string
  disabled?: boolean
  clearable?: boolean
}

export default function Select({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  className = '',
  ariaLabel,
  disabled = false,
  clearable = true,
}: SelectProps) {
  const displayValue = value === '' ? 'none' : value

  return (
    <SelectRoot
      disabled={disabled}
      value={displayValue}
      onValueChange={(val) => onChange({ target: { value: val === 'none' ? '' : val } })}
    >
      <SelectTrigger
        disabled={disabled}
        className={className}
        aria-label={ariaLabel ?? placeholder}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {clearable && <SelectItem value="none">{placeholder}</SelectItem>}
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </SelectRoot>
  )
}
