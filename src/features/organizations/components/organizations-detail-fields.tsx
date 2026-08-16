'use client'

import { Icon } from '@iconify/react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { toast } from '@/components/ui/toast'
import {
  CHIP_ITEM,
  SECTION_ITEM,
} from '@/features/organizations/components/organizations-page-presets'
import { cn } from '@/utils/cn'

export function DetailMetric({
  icon,
  leading,
  value,
  label,
}: {
  icon?: string
  leading?: ReactNode
  value: string
  label?: string
}) {
  return (
    <motion.span
      variants={CHIP_ITEM}
      className="inline-flex items-center gap-1.5 text-sm text-muted-foreground"
    >
      {leading ?? (icon ? <Icon icon={icon} className="h-4 w-4 text-muted-foreground/70" /> : null)}
      <span className="font-medium text-foreground">{value}</span>
      {label}
    </motion.span>
  )
}

export function DetailField({
  icon,
  label,
  value,
  href,
}: {
  icon: string
  label: string
  value?: ReactNode
  href?: string
}) {
  if (!value) return null

  const isExternal = href ? /^https?:\/\//.test(href) : false
  const copyText = !href && typeof value === 'string' ? value : null

  return (
    <motion.span
      variants={CHIP_ITEM}
      className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground"
    >
      <Icon icon={icon} className="h-4 w-4 shrink-0 text-muted-foreground/70" />
      <span className="shrink-0 text-xs font-medium text-muted-foreground/80">{label}</span>
      {href ? (
        <Link
          href={href}
          target={isExternal ? '_blank' : undefined}
          rel={isExternal ? 'noopener noreferrer' : undefined}
          onClick={(event) => event.stopPropagation()}
          className="inline-flex min-w-0 items-center gap-1 font-medium text-foreground transition-colors hover:text-primary"
        >
          <span className="min-w-0 truncate">{value}</span>
          <Icon
            icon="ri:external-link-line"
            className="h-3 w-3 shrink-0 text-muted-foreground/60"
          />
        </Link>
      ) : copyText !== null ? (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            if (!copyText || !navigator.clipboard) {
              toast(`${label} could not be copied in this browser.`, { tone: 'error' })
              return
            }
            navigator.clipboard.writeText(copyText).then(
              () => toast(`${label} copied`),
              () => toast(`Unable to copy ${label.toLowerCase()}.`, { tone: 'error' }),
            )
          }}
          className="group inline-flex min-w-0 items-center gap-1 text-left font-medium text-foreground transition-colors hover:text-primary focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <span className="min-w-0 truncate">{value}</span>
          <Icon
            icon="ri:file-copy-line"
            className="h-3 w-3 shrink-0 text-muted-foreground/50 opacity-0 transition-opacity group-hover:opacity-100"
          />
        </button>
      ) : (
        <span className="min-w-0 truncate font-medium text-foreground">{value}</span>
      )}
    </motion.span>
  )
}

export function DetailSection({
  title,
  children,
  className,
}: {
  title: string
  children: ReactNode
  className?: string
}) {
  return (
    <motion.section
      variants={SECTION_ITEM}
      className={cn('@container min-w-0 space-y-2.5', className)}
    >
      <h2 className="text-balance text-xs font-semibold text-muted-foreground">{title}</h2>
      {children}
    </motion.section>
  )
}
