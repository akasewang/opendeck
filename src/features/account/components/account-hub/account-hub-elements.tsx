'use client'

import { Icon } from '@iconify/react'
import { motion, type TargetAndTransition, type Variants } from 'framer-motion'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { cardVariants } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import Select from '@/components/ui/select'
import { SimpleTag } from '@/components/ui/tag'
import { toast } from '@/components/ui/toast'
import { MOTION_DURATION_SECONDS, MOTION_EASING, MOTION_SPRING } from '@/config/motion'
import { appRoute } from '@/config/routes'
import type { AccountHubRepoWithState } from '@/features/account/types/account-hub'
import { repositoryName, shortDescription } from '@/features/account/utils/account-formatters'
import type { RepositoryApiItem } from '@/features/repositories/types/repository'
import { formatNumber } from '@/utils/format-number'
import { cn } from '@/utils/cn'

export const ACCOUNT_HUB_LIST_CARD_CLASS = cardVariants({ interactive: true })

export const ACCOUNT_HUB_ICON_BUTTON_CLASS =
  'flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border/40 bg-background text-muted-foreground transition hover:border-border/70 hover:bg-muted-hover hover:text-foreground active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60'

export const ACCOUNT_HUB_SECTION_STAGGER: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05, delayChildren: 0.03 } },
}

export const ACCOUNT_HUB_SECTION_ITEM: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: MOTION_SPRING.standard },
}

export const ACCOUNT_HUB_LIST_ITEM_EXIT: TargetAndTransition = {
  opacity: 0,
  scale: 0.96,
  transition: { duration: MOTION_DURATION_SECONDS.standard, ease: MOTION_EASING.exit },
}

export const ACCOUNT_HUB_LIST_ITEM_LAYOUT = MOTION_SPRING.layout

export function TabCard({
  label,
  icon,
  value,
  hint,
  active,
  onSelect,
  className,
}: {
  label: string
  icon: string
  value?: number
  hint?: string
  active: boolean
  onSelect: () => void
  className?: string
}) {
  return (
    <motion.button
      type="button"
      variants={ACCOUNT_HUB_SECTION_ITEM}
      onClick={onSelect}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'group relative min-h-[4.25rem] overflow-hidden bg-background px-4 py-2.5 text-left outline-none transition-colors duration-150 hover:bg-row-hover hover:text-foreground',
        active ? 'bg-row-hover text-foreground hover:bg-row-hover' : 'text-muted-foreground',
        className,
      )}
    >
      <span
        className={cn(
          'relative z-10 flex items-center gap-1.5 text-xs font-medium transition-colors',
          active && 'text-foreground',
        )}
      >
        <Icon
          icon={icon}
          className={cn(
            'h-3.5 w-3.5 transition-colors group-hover:text-foreground',
            active ? 'text-foreground/85' : 'text-muted-foreground/70',
          )}
        />
        {label}
      </span>
      {value !== undefined ? (
        <span
          className={cn(
            'relative z-10 mt-1 block font-mono text-lg font-semibold leading-none tabular-nums transition-colors',
            active ? 'text-foreground' : 'text-foreground/70 group-hover:text-foreground',
          )}
        >
          {formatNumber(value)}
        </span>
      ) : (
        <span
          className={cn(
            'relative z-10 mt-1 block text-sm font-medium leading-[1.125rem] transition-colors',
            active ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground',
          )}
        >
          {hint}
        </span>
      )}
    </motion.button>
  )
}

export function ConfirmButton({
  label,
  onConfirm,
  className,
}: {
  label: string
  onConfirm: () => void | Promise<void>
  className?: string
}) {
  const [armed, setArmed] = useState(false)
  const [isPending, setIsPending] = useState(false)

  useEffect(() => {
    if (!armed) return
    const timer = setTimeout(() => setArmed(false), 3000)
    return () => clearTimeout(timer)
  }, [armed])

  return (
    <Button
      variant={armed ? 'destructive' : 'default'}
      disabled={isPending}
      onClick={async () => {
        if (armed) {
          setArmed(false)
          setIsPending(true)
          try {
            await onConfirm()
          } catch (error) {
            toast(error instanceof Error ? error.message : 'Unable to complete the request.', {
              tone: 'error',
            })
          } finally {
            setIsPending(false)
          }
          return
        }
        setArmed(true)
      }}
      className={className}
    >
      <Icon icon={armed ? 'ri:error-warning-line' : 'ri:delete-bin-line'} className="h-3.5 w-3.5" />
      {isPending ? 'Working...' : armed ? 'Click to confirm' : label}
    </Button>
  )
}

export function RepoRow({
  item,
  onUpdate,
}: {
  item: AccountHubRepoWithState
  onUpdate: (repo: RepositoryApiItem, patch: Record<string, unknown>) => Promise<void>
}) {
  const [note, setNote] = useState(item.state.note ?? '')
  const avatar = item.repo.owner?.avatar_url
  const isReviewed = Boolean(item.state.reviewedAt)
  const isHidden = Boolean(item.state.hiddenAt)
  const fullName = repositoryName(item.repo)

  return (
    <motion.div
      layout
      variants={ACCOUNT_HUB_SECTION_ITEM}
      exit={ACCOUNT_HUB_LIST_ITEM_EXIT}
      transition={{ layout: ACCOUNT_HUB_LIST_ITEM_LAYOUT }}
      className={cn(ACCOUNT_HUB_LIST_CARD_CLASS, 'flex flex-col gap-2.5 p-3.5')}
    >
      <div className="flex items-center gap-2.5">
        {avatar && (
          <Image
            src={`${avatar}${avatar.includes('?') ? '&' : '?'}s=48`}
            alt=""
            width={24}
            height={24}
            className="h-6 w-6 shrink-0 rounded-md ring-1 ring-border/50"
          />
        )}
        <a
          href={appRoute.repository(fullName)}
          className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground transition-colors hover:text-primary"
        >
          {fullName}
        </a>
        {item.repo.language && (
          <SimpleTag className="hidden sm:inline-flex">{item.repo.language}</SimpleTag>
        )}
        <span className="inline-flex shrink-0 items-center gap-1 font-mono text-xs tabular-nums text-muted-foreground">
          <Icon icon="ri:star-line" className="h-3 w-3" />
          {formatNumber(item.repo.stargazers_count ?? 0)}
        </span>
        {item.repo.html_url && (
          <a
            href={item.repo.html_url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Open ${fullName} on GitHub`}
            title="Open on GitHub"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground/70 transition-colors hover:bg-muted-hover hover:text-foreground"
          >
            <Icon icon="ri:github-fill" className="h-4 w-4" />
          </a>
        )}
      </div>

      <p className="truncate text-[13px] text-muted-foreground">
        {shortDescription(item.repo.description)}
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={item.state.pipelineStage}
          onChange={(event) => onUpdate(item.repo, { pipelineStage: event.target.value })}
          options={[
            { value: 'interested', label: 'Interested' },
            { value: 'opened_issue', label: 'Opened issue' },
            { value: 'submitted_pr', label: 'Submitted PR' },
            { value: 'done', label: 'Done' },
          ]}
          placeholder="Stage"
          clearable={false}
          ariaLabel={`Pipeline stage for ${fullName}`}
          className="w-36 shrink-0"
        />
        <Input
          value={note}
          onChange={(event) => setNote(event.target.value)}
          onBlur={() => {
            if (note !== (item.state.note ?? '')) void onUpdate(item.repo, { note })
          }}
          placeholder="Private note"
          aria-label={`Private note for ${fullName}`}
          className="min-w-[8rem] flex-1"
        />
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={() => onUpdate(item.repo, { reviewed: !isReviewed })}
            aria-pressed={isReviewed}
            aria-label={isReviewed ? 'Clear reviewed mark' : 'Mark as reviewed'}
            title={isReviewed ? 'Reviewed · click to clear' : 'Mark as reviewed'}
            className={cn(
              ACCOUNT_HUB_ICON_BUTTON_CLASS,
              'h-9 w-9',
              isReviewed &&
                'border-success/30 bg-success/10 text-success hover:border-success/50 hover:bg-success/15 hover:text-success',
            )}
          >
            <Icon
              icon={isReviewed ? 'ri:checkbox-circle-fill' : 'ri:checkbox-circle-line'}
              className="h-4 w-4"
            />
          </button>
          <button
            type="button"
            onClick={() => onUpdate(item.repo, { hidden: !isHidden })}
            aria-pressed={isHidden}
            aria-label={isHidden ? 'Show in recommendations again' : 'Hide from recommendations'}
            title={
              isHidden ? 'Hidden from recommendations · click to show' : 'Hide from recommendations'
            }
            className={cn(
              ACCOUNT_HUB_ICON_BUTTON_CLASS,
              'h-9 w-9',
              isHidden && 'border-border/70 bg-muted text-foreground',
            )}
          >
            <Icon icon={isHidden ? 'ri:eye-off-fill' : 'ri:eye-off-line'} className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onUpdate(item.repo, { saved: false })}
            aria-label={`Remove ${fullName} from library`}
            title="Remove from library"
            className={cn(
              ACCOUNT_HUB_ICON_BUTTON_CLASS,
              'h-9 w-9 hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive',
            )}
          >
            <Icon icon="ri:delete-bin-line" className="h-4 w-4" />
          </button>
        </div>
      </div>
    </motion.div>
  )
}
