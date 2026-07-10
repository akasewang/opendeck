'use client'

import { Icon } from '@iconify/react'
import { motion } from 'framer-motion'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { BUTTON_CLASS, INPUT_CLASS } from '@/components/ui/control-styles'
import Select from '@/components/ui/select'
import { SimpleTag } from '@/components/ui/tag'
import {
  ICON_BUTTON_CLASS,
  LIST_CARD_CLASS,
  sectionItem,
} from '@/features/account/account-hub-config'
import { repoName, shortDescription } from '@/features/account/account-hub-helpers'
import type { RepoWithState } from '@/features/account/types'
import type { GithubRepoApiItem } from '@/features/repositories/types'
import { formatNumber } from '@/features/repositories/utils'
import { cn } from '@/utils/cn'

export function StatCell({
  label,
  value,
  icon,
  onSelect,
  className,
}: {
  label: string
  value: number
  icon: string
  onSelect: () => void
  className?: string
}) {
  return (
    <motion.button
      type="button"
      variants={sectionItem}
      onClick={onSelect}
      className={cn(
        'group bg-background px-4 py-2.5 text-left transition-colors hover:bg-row-hover',
        className,
      )}
    >
      <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Icon icon={icon} className="h-3.5 w-3.5 text-muted-foreground/70" />
        {label}
      </span>
      <span className="mt-1 block font-mono text-lg font-semibold leading-none tabular-nums text-foreground">
        {formatNumber(value)}
      </span>
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

  useEffect(() => {
    if (!armed) return
    const timer = setTimeout(() => setArmed(false), 3000)
    return () => clearTimeout(timer)
  }, [armed])

  return (
    <button
      type="button"
      onClick={() => {
        if (armed) {
          setArmed(false)
          void onConfirm()
          return
        }
        setArmed(true)
      }}
      className={cn(
        BUTTON_CLASS,
        armed &&
          'border-destructive/40 bg-destructive/10 text-destructive hover:border-destructive/60 hover:bg-destructive/20',
        className,
      )}
    >
      <Icon icon={armed ? 'ri:error-warning-line' : 'ri:delete-bin-line'} className="h-3.5 w-3.5" />
      {armed ? 'Click to confirm' : label}
    </button>
  )
}

export function RepoRow({
  item,
  onUpdate,
}: {
  item: RepoWithState
  onUpdate: (repo: GithubRepoApiItem, patch: Record<string, unknown>) => Promise<void>
}) {
  const [note, setNote] = useState(item.state.note ?? '')
  const avatar = item.repo.owner?.avatar_url
  const isReviewed = Boolean(item.state.reviewedAt)
  const isHidden = Boolean(item.state.hiddenAt)
  const fullName = repoName(item.repo)

  return (
    <motion.div
      variants={sectionItem}
      className={cn(LIST_CARD_CLASS, 'flex flex-col gap-2.5 p-3.5')}
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
          href={`/dashboard/repos/${fullName}`}
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
        <input
          value={note}
          onChange={(event) => setNote(event.target.value)}
          onBlur={() => {
            if (note !== (item.state.note ?? '')) void onUpdate(item.repo, { note })
          }}
          placeholder="Private note"
          aria-label={`Private note for ${fullName}`}
          className={cn(INPUT_CLASS, 'min-w-[8rem] flex-1')}
        />
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={() => onUpdate(item.repo, { reviewed: !isReviewed })}
            aria-pressed={isReviewed}
            aria-label={isReviewed ? 'Clear reviewed mark' : 'Mark as reviewed'}
            title={isReviewed ? 'Reviewed · click to clear' : 'Mark as reviewed'}
            className={cn(
              ICON_BUTTON_CLASS,
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
              ICON_BUTTON_CLASS,
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
              ICON_BUTTON_CLASS,
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
