'use client'

import { Icon } from '@iconify/react'
import type { Variants } from 'framer-motion'
import type { ReactNode } from 'react'
import {
  BUTTON_CLASS,
  INPUT_CLASS,
  PRIMARY_BUTTON_CLASS,
  TEXTAREA_CLASS,
} from '@/components/ui/control-styles'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import PageShell from '@/features/dashboard/components/page-shell'
import { formatNumber } from '@/features/repositories/utils'
import { cn } from '@/utils/cn'

export { BUTTON_CLASS, INPUT_CLASS, PRIMARY_BUTTON_CLASS, TEXTAREA_CLASS }

export const PANEL_ACTION_CLASS =
  'inline-flex h-7 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-md border border-border/40 bg-background px-2 text-xs font-medium text-foreground transition hover:border-border/70 hover:bg-muted-hover active:scale-[0.98]'
export const FLOATING_PANEL_LINK_CLASS =
  'absolute bottom-3 left-3 right-3 z-10 inline-flex h-8 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-md border border-border/40 bg-background px-2.5 text-xs font-medium text-foreground shadow-sm transition hover:border-border/70 hover:bg-muted-hover-solid active:scale-[0.98]'
export const PANEL_CLASS =
  'flex flex-col overflow-hidden rounded-lg border border-border/50 bg-background/40'
export const COLUMN_LABEL_CLASS =
  'shrink-0 border-b border-border/30 px-4 py-2 text-[11px] font-medium uppercase tracking-normal text-muted-foreground'
export const DETAIL_FETCH_TIMEOUT_MS = 20_000

export const sectionStagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05, delayChildren: 0.03 } },
}

export const sectionItem: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 30 } },
}

export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit,
  timeoutMs: number,
) {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(input, { ...init, signal: controller.signal })
  } finally {
    window.clearTimeout(timeout)
  }
}

export function loadErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.name === 'AbortError') {
    return 'The request timed out. Please try again.'
  }
  return error instanceof Error ? error.message : fallback
}

export function SignalStat({ icon, label, value }: { icon: string; label: string; value: number }) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-lg border border-border/40 bg-background/35 px-3 py-3">
      <span className="flex h-8 w-5 shrink-0 items-center justify-center text-muted-foreground">
        <Icon icon={icon} className="h-4.5 w-4.5" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[11px] font-medium text-muted-foreground">
          {label}
        </span>
        <span className="mt-0.5 block font-mono text-base font-semibold leading-none tabular-nums text-foreground">
          {formatNumber(value)}
        </span>
      </span>
    </div>
  )
}

export function PanelHeader({
  icon,
  title,
  right,
}: {
  icon?: string
  title: string
  right?: ReactNode
}) {
  return (
    <div className="flex h-11 shrink-0 items-center justify-between gap-3 border-b border-border/40 px-4">
      <h2 className="flex min-w-0 items-center gap-2 text-sm font-semibold text-foreground">
        {icon && <Icon icon={icon} className="h-4 w-4 shrink-0 text-muted-foreground/70" />}
        <span className="truncate">{title}</span>
      </h2>
      {right}
    </div>
  )
}

export function PanelEmpty({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-1 items-center justify-center p-6 text-center text-pretty text-sm text-muted-foreground">
      {children}
    </div>
  )
}

export function CountBadge({ value }: { value: number }) {
  return (
    <span className="font-mono text-xs tabular-nums text-muted-foreground">
      {formatNumber(value)}
    </span>
  )
}

export function AboutRow({ label, value }: { label: string; value?: ReactNode }) {
  if (!value) return null

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2">
      <span className="shrink-0 text-xs font-medium text-muted-foreground">{label}</span>
      <span className="min-w-0 truncate text-right text-sm text-foreground">{value}</span>
    </div>
  )
}

export function ExternalButton({
  href,
  icon,
  children,
}: {
  href: string
  icon: string
  children: ReactNode
}) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={BUTTON_CLASS}>
      <Icon icon={icon} className="h-4 w-4" />
      {children}
    </a>
  )
}

function StatCardSkeleton() {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-lg border border-border/40 bg-background/35 px-3 py-3">
      <Skeleton className="h-8 w-5 shrink-0 rounded-md" />
      <div className="min-w-0 flex-1 space-y-1.5">
        <Skeleton className="h-2.5 w-16" />
        <Skeleton className="h-4 w-10" />
      </div>
    </div>
  )
}

function PanelSkeleton({ className, rows = 5 }: { className?: string; rows?: number }) {
  return (
    <div className={cn(PANEL_CLASS, className)}>
      <div className="flex h-11 shrink-0 items-center gap-2 border-b border-border/40 px-4">
        <Skeleton className="h-4 w-4 rounded-sm" />
        <Skeleton className="h-3.5 w-28" />
      </div>
      <div className="min-h-0 flex-1 divide-y divide-border/30">
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="flex items-center gap-3 px-4 py-3">
            <Skeleton className="h-3.5 min-w-0 flex-1" />
            <Skeleton className="h-5 w-12 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function RepoDetailLoading() {
  return (
    <PageShell className="space-y-5">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 max-w-4xl items-start gap-3.5">
          <Skeleton className="h-14 w-14 shrink-0 rounded-lg" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-6 w-56 max-w-full" />
            <Skeleton className="h-3.5 w-96 max-w-full" />
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <Skeleton className="h-9 w-24 rounded-md" />
          <Skeleton className="h-9 w-24 rounded-md" />
          <Skeleton className="h-9 w-28 rounded-md" />
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <StatCardSkeleton key={index} />
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <PanelSkeleton className="h-[28rem] xl:col-span-2" rows={6} />
        <PanelSkeleton className="h-[28rem]" rows={6} />
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <PanelSkeleton className="h-[26rem] xl:col-span-2" rows={5} />
        <PanelSkeleton className="h-[26rem]" rows={5} />
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <PanelSkeleton className="h-[36rem] xl:col-span-2" rows={8} />
        <PanelSkeleton className="h-[36rem]" rows={8} />
      </div>
      <PanelSkeleton className="h-[30rem]" rows={6} />
    </PageShell>
  )
}

export function RepoDetailAuthGate({ onSignIn }: { onSignIn: () => void }) {
  return (
    <PageShell>
      <EmptyState
        icon="ri:lock-line"
        title="Sign in to open repository details"
        description="Account access unlocks contribution readiness, health history, issue recommendations and private notes."
        className="mx-auto mt-10 max-w-xl py-14"
      >
        <div className="flex flex-wrap justify-center gap-2">
          <button type="button" onClick={onSignIn} className={PRIMARY_BUTTON_CLASS}>
            Sign in
          </button>
          <a href="/dashboard" className={BUTTON_CLASS}>
            Back to dashboard
          </a>
        </div>
      </EmptyState>
    </PageShell>
  )
}

export function RepoDetailNotFound({ loadError }: { loadError?: string | null }) {
  return (
    <PageShell>
      <EmptyState
        icon="ri:git-repository-line"
        title="Repository not found"
        description={loadError ?? 'This repository is not mirrored yet or the name is misspelled.'}
        className="mx-auto mt-10 max-w-xl py-14"
      >
        <a href="/dashboard" className={BUTTON_CLASS}>
          Back to dashboard
        </a>
      </EmptyState>
    </PageShell>
  )
}
