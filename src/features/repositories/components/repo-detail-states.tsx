'use client'

import { Icon } from '@iconify/react'
import type { ReactNode } from 'react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, cardVariants } from '@/components/ui/card'
import CountPill from '@/components/ui/count-pill'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton, SkeletonPanel, skeletonStagger } from '@/components/ui/skeleton'
import { APP_ROUTES } from '@/config/routes'
import PageShell from '@/features/dashboard/components/page-shell'
import { formatNumber } from '@/utils/format-number'

export const PANEL_CLASS = cardVariants({ className: 'flex flex-col overflow-hidden' })

export const FLOATING_LINK_CLASS =
  'absolute bottom-3 left-3 right-3 z-10 inline-flex h-8 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-md border border-border/40 bg-background px-2.5 text-xs font-medium text-foreground shadow-sm transition-[background-color,border-color,transform] hover:border-border/70 hover:bg-muted-hover-solid active:scale-[0.98]'

export function loadErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.name === 'AbortError') {
    return 'The request timed out. Please try again.'
  }
  return error instanceof Error ? error.message : fallback
}

export function SignalStat({ icon, label, value }: { icon: string; label: string; value: number }) {
  return (
    <Card className="flex min-w-0 items-center gap-3 px-3 py-3">
      <span className="flex h-8 w-5 shrink-0 items-center justify-center text-muted-foreground">
        <Icon icon={icon} className="h-4.5 w-4.5" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-2xs font-medium text-muted-foreground">{label}</span>
        <span className="mt-0.5 block font-mono text-base font-semibold leading-none tabular-nums text-foreground">
          {formatNumber(value)}
        </span>
      </span>
    </Card>
  )
}

export function PanelHeader({
  icon,
  title,
  count,
  right,
}: {
  icon?: string
  title: string
  count?: number
  right?: ReactNode
}) {
  return (
    <div className="flex h-11 shrink-0 items-center justify-between gap-3 border-b border-border/40 px-4">
      <h2 className="flex min-w-0 items-center gap-2 text-sm font-semibold text-foreground">
        {icon && <Icon icon={icon} className="h-4 w-4 shrink-0 text-muted-foreground/70" />}
        <span className="truncate">{title}</span>
        {count !== undefined && <CountPill count={count} />}
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
    <a href={href} target="_blank" rel="noopener noreferrer" className={buttonVariants()}>
      <Icon icon={icon} className="h-4 w-4" />
      {children}
    </a>
  )
}

function StatCardSkeleton({ index = 0 }: { index?: number }) {
  return (
    <Card style={skeletonStagger(index)} className="flex min-w-0 items-center gap-3 px-3 py-3">
      <Skeleton className="h-8 w-5 shrink-0 rounded-md" />
      <div className="min-w-0 flex-1 space-y-1.5">
        <Skeleton className="h-2.5 w-16" />
        <Skeleton className="h-4 w-10" />
      </div>
    </Card>
  )
}

export function RepoDetailLoading() {
  return (
    <PageShell aria-busy="true" className="space-y-5">
      <h1 className="sr-only">Loading repository details</h1>
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
          <StatCardSkeleton key={index} index={index} />
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <SkeletonPanel className="h-[28rem] xl:col-span-2" />
        <SkeletonPanel className="h-[28rem]" />
      </div>
      <div className="grid gap-5 xl:grid-cols-3">
        <SkeletonPanel className="h-[26rem] xl:col-span-2" />
        <SkeletonPanel className="h-[26rem]" />
      </div>
      <div className="grid gap-5 xl:grid-cols-3">
        <SkeletonPanel className="h-[36rem] xl:col-span-2" />
        <SkeletonPanel className="h-[36rem]" />
      </div>
      <SkeletonPanel className="h-[30rem]" />
    </PageShell>
  )
}

export function RepoDetailAuthGate({ onSignIn }: { onSignIn: () => void }) {
  return (
    <PageShell>
      <h1 className="sr-only">Repository details</h1>
      <EmptyState
        icon="ri:lock-line"
        title="Sign in to open repository details"
        description="Account access unlocks contribution readiness, health history, issue recommendations and private notes."
        className="mx-auto mt-10 max-w-xl py-14"
      >
        <div className="flex flex-wrap justify-center gap-2">
          <Button variant="primary" onClick={onSignIn}>
            Sign in
          </Button>
          <a href={APP_ROUTES.dashboard} className={buttonVariants()}>
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
      <h1 className="sr-only">Repository not found</h1>
      <EmptyState
        icon="ri:git-repository-line"
        title="Repository not found"
        description={loadError ?? 'This repository is not mirrored yet or the name is misspelled.'}
        className="mx-auto mt-10 max-w-xl py-14"
      >
        <a href={APP_ROUTES.dashboard} className={buttonVariants()}>
          Back to dashboard
        </a>
      </EmptyState>
    </PageShell>
  )
}
