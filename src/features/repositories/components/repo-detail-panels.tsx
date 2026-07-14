'use client'

import { Icon } from '@iconify/react'
import Image from 'next/image'
import { useState } from 'react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { TextArea } from '@/components/ui/text-area'
import { ScrollShadow } from '@/components/ui/scroll-shadow'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusPill } from '@/components/ui/status-pill'
import { SimpleTag } from '@/components/ui/tag'
import { toast } from '@/components/ui/toast'
import { API_ROUTES } from '@/config/routes'
import {
  AboutRow,
  FLOATING_LINK_CLASS,
  PanelEmpty,
  PanelHeader,
} from '@/features/repositories/components/repo-detail-states'
import type {
  RepositoryContributor,
  RepositoryInsight,
  RepositoryJournalPayload,
} from '@/features/repositories/types/repository'
import { formatDate, getLanguageTagStyle } from '@/features/repositories/utils/repository-display'
import { isRepositoryJournalPayload } from '@/features/repositories/utils/repository-response-validation'
import { cn } from '@/utils/cn'
import { apiErrorMessage } from '@/lib/api/errors'
import { formatNumber } from '@/utils/format-number'

const COLUMN_LABEL_CLASS =
  'shrink-0 border-b border-b-row-divider bg-sidebar px-4 py-2 text-2xs font-semibold uppercase tracking-normal text-muted-foreground/70'

type RepositoryDetailRepo = RepositoryInsight['repo']
type Issue = RepositoryInsight['issues'][number]
type TimelinePoint = RepositoryInsight['timeline'][number]

export function RecommendedIssuesPanel({
  issues,
  repoHtmlUrl,
  hasGoodFirstIssues,
}: {
  issues: Issue[]
  repoHtmlUrl?: string
  hasGoodFirstIssues?: boolean
}) {
  return (
    <>
      <PanelHeader
        icon="ri:bug-line"
        title="Recommended issues"
        count={issues.length}
        right={
          repoHtmlUrl && (
            <div className="flex shrink-0 items-center gap-2">
              <a
                href={`${repoHtmlUrl}/issues`}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonVariants({ size: 'sm' })}
              >
                <Icon icon="ri:record-circle-line" className="h-3.5 w-3.5" />
                Issues
              </a>
              {hasGoodFirstIssues && (
                <a
                  href={`${repoHtmlUrl}/contribute`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonVariants({ size: 'sm' })}
                >
                  <Icon icon="ri:hand-heart-line" className="h-3.5 w-3.5" />
                  Good first issues
                </a>
              )}
            </div>
          )
        }
      />
      {issues.length === 0 ? (
        <PanelEmpty>
          Issues appear here once the repository has been synced with approachable labels.
        </PanelEmpty>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className={cn(COLUMN_LABEL_CLASS, 'flex items-center gap-3')}>
            <span className="min-w-0 flex-1">Issue</span>
            <span className="shrink-0">Fit</span>
          </div>
          <ScrollShadow
            wrapperClassName="min-h-0 flex-1"
            className="divide-y divide-border/30"
            backToTop
          >
            {issues.map((issue) => (
              <a
                key={issue.id}
                href={issue.htmlUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-muted-hover"
              >
                <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                  #{issue.number}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                  {issue.title}
                </span>
                {issue.labels.slice(0, 2).map((label) => (
                  <SimpleTag key={label} className="hidden shrink-0 lg:inline-flex">
                    {label}
                  </SimpleTag>
                ))}
                <span className="shrink-0 rounded-sm border border-success/30 bg-success/10 px-1.5 py-0.5 font-mono text-xs tabular-nums text-success">
                  {issue.score}
                </span>
              </a>
            ))}
          </ScrollShadow>
        </div>
      )}
    </>
  )
}

export function AboutPanel({
  repo,
  license,
  topics,
}: {
  repo: RepositoryDetailRepo
  license?: string | null
  topics: string[]
}) {
  const languageStyle = repo.language ? getLanguageTagStyle(repo.language) : undefined
  const curated = repo.curated

  return (
    <>
      <PanelHeader icon="ri:information-line" title="About" />
      <ScrollShadow wrapperClassName="min-h-0 flex-1" backToTop>
        <div className="divide-y divide-border/30">
          <AboutRow
            label="Language"
            value={
              repo.language ? (
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: languageStyle?.color }}
                  />
                  {repo.language}
                </span>
              ) : null
            }
          />
          <AboutRow label="License" value={license} />
          <AboutRow label="Default branch" value={repo.default_branch} />
          <AboutRow label="State" value={repo.is_archived ? 'Archived' : 'Active'} />
          <AboutRow label="Created" value={formatDate(repo.created_at)} />
          <AboutRow label="Last push" value={formatDate(repo.pushed_at)} />
          <AboutRow label="Source" value={curated?.source} />
          <AboutRow label="Company" value={curated?.company} />
        </div>
        {topics.length > 0 && (
          <div className="border-t border-border/40 p-4">
            <div className="flex flex-wrap gap-1.5">
              {topics.map((topic) => (
                <SimpleTag key={topic}>{topic}</SimpleTag>
              ))}
            </div>
          </div>
        )}
      </ScrollShadow>
    </>
  )
}

export function RepoJournalPanel({
  fullName,
  entries,
  journalBody,
  journalStatus,
  journalIssue,
  journalError,
  onBodyChange,
  onStatusChange,
  onIssueChange,
  onJournalSaved,
  onJournalError,
  onReloadJournal,
}: {
  fullName: string
  entries: RepositoryJournalPayload['entries']
  journalBody: string
  journalStatus: string
  journalIssue: string
  journalError: string | null
  onBodyChange: (value: string) => void
  onStatusChange: (value: string) => void
  onIssueChange: (value: string) => void
  onJournalSaved: (payload: RepositoryJournalPayload) => void
  onJournalError: (message: string | null) => void
  onReloadJournal: () => Promise<void>
}) {
  const [isSaving, setIsSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  return (
    <>
      <PanelHeader icon="ri:quill-pen-line" title="Private journal" count={entries.length} />
      <form
        className="shrink-0 space-y-2.5 border-b border-border/40 p-4"
        onSubmit={async (event) => {
          event.preventDefault()
          if (isSaving) return
          setIsSaving(true)
          try {
            const response = await fetch(API_ROUTES.account.journal, {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({
                fullName,
                body: journalBody,
                status: journalStatus,
                issueNumber: journalIssue || undefined,
              }),
            })
            const payload: unknown = await response.json().catch(() => null)
            if (!response.ok) {
              throw new Error(apiErrorMessage(payload, 'Unable to save journal entry.'))
            }
            if (!isRepositoryJournalPayload(payload)) {
              throw new Error('Journal API returned an invalid response.')
            }
            onJournalSaved(payload)
            onJournalError(null)
            onBodyChange('')
            onIssueChange('')
            toast('Journal entry saved')
          } catch (error) {
            toast(error instanceof Error ? error.message : 'Unable to save journal entry', {
              tone: 'error',
            })
          } finally {
            setIsSaving(false)
          }
        }}
      >
        <TextArea
          value={journalBody}
          onChange={(event) => onBodyChange(event.target.value)}
          placeholder="What happened? Progress, blockers, decisions..."
          aria-label="Journal note"
        />
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={journalStatus}
            onChange={(event) => onStatusChange(event.target.value)}
            placeholder="Status"
            aria-label="Journal status"
            className="w-32"
          />
          <Input
            value={journalIssue}
            onChange={(event) => onIssueChange(event.target.value)}
            placeholder="Issue #"
            inputMode="numeric"
            aria-label="Issue number"
            className="w-24"
          />
          <Button type="submit" variant="primary" className="ml-auto" disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save note'}
          </Button>
        </div>
      </form>
      {journalError ? (
        <PanelEmpty>{journalError}</PanelEmpty>
      ) : entries.length === 0 ? (
        <PanelEmpty>
          No entries yet. Keep private notes about your progress on this repository.
        </PanelEmpty>
      ) : (
        <ScrollShadow
          wrapperClassName="min-h-0 flex-1"
          className="divide-y divide-border/30"
          backToTop
        >
          {entries.map((entry) => (
            <div key={entry.id} className="px-4 py-3">
              <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <StatusPill tone="neutral" size="sm">
                    {entry.status}
                  </StatusPill>
                  {entry.issueNumber ? `#${entry.issueNumber}` : ''}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  {formatDate(entry.updatedAt)}
                  <button
                    type="button"
                    aria-label="Delete journal entry"
                    disabled={deletingId !== null}
                    onClick={async () => {
                      if (deletingId) return
                      setDeletingId(entry.id)
                      try {
                        const response = await fetch(API_ROUTES.account.journalDelete, {
                          method: 'POST',
                          headers: { 'content-type': 'application/json' },
                          credentials: 'include',
                          body: JSON.stringify({ id: entry.id }),
                        })
                        if (!response.ok) throw new Error('Unable to delete journal entry.')
                        toast('Journal entry deleted')
                        await onReloadJournal()
                      } catch (error) {
                        toast(error instanceof Error ? error.message : 'Unable to delete entry', {
                          tone: 'error',
                        })
                      } finally {
                        setDeletingId(null)
                      }
                    }}
                    className="flex h-5 w-5 items-center justify-center rounded-sm text-muted-foreground/60 transition-colors hover:bg-muted-hover hover:text-destructive"
                  >
                    <Icon icon="ri:delete-bin-line" className="h-3.5 w-3.5" />
                  </button>
                </span>
              </div>
              <p className="mt-1.5 text-pretty text-sm text-foreground">{entry.body}</p>
            </div>
          ))}
        </ScrollShadow>
      )}
    </>
  )
}

export function ContributorsPanel({
  contributors,
  totalCount,
  isLoading,
  error,
  contributorsUrl,
}: {
  contributors: RepositoryContributor[]
  totalCount: number
  isLoading: boolean
  error: string | null
  contributorsUrl?: string
}) {
  return (
    <>
      <PanelHeader icon="ri:team-line" title="Contributors" count={totalCount} />
      {isLoading ? (
        <div className="min-h-0 flex-1 divide-y divide-border/30 overflow-hidden pb-12">
          {Array.from({ length: 5 }, (_, index) => (
            <div key={index} className="flex items-center gap-3 px-4 py-2.5">
              <Skeleton className="h-7 w-7 rounded-full" />
              <Skeleton className="h-3 w-32" />
            </div>
          ))}
        </div>
      ) : error ? (
        <PanelEmpty>{error}</PanelEmpty>
      ) : contributors.length === 0 ? (
        <PanelEmpty>No contributor list has been captured yet.</PanelEmpty>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col pb-12">
          <div className={cn(COLUMN_LABEL_CLASS, 'grid grid-cols-[1fr_auto] gap-3')}>
            <span>Contributor</span>
            <span>Contributions</span>
          </div>
          <ScrollShadow
            wrapperClassName="min-h-0 flex-1"
            className="divide-y divide-border/30"
            backToTop
          >
            {contributors.map((contributor, index) => (
              <a
                key={`${contributor.login}-${contributor.htmlUrl}-${index}`}
                href={contributor.htmlUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-4 py-2 transition-colors hover:bg-muted-hover"
              >
                {contributor.avatarUrl ? (
                  <Image
                    src={`${contributor.avatarUrl}${
                      contributor.avatarUrl.includes('?') ? '&' : '?'
                    }s=56`}
                    alt=""
                    width={28}
                    height={28}
                    className="h-7 w-7 shrink-0 rounded-full ring-1 ring-border/50"
                  />
                ) : (
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border/50 bg-muted text-muted-foreground">
                    <Icon icon="ri:user-line" className="h-3.5 w-3.5" />
                  </span>
                )}
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                  {contributor.login}
                </span>
                <span
                  title={`${formatNumber(contributor.contributions)} contributions`}
                  className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground"
                >
                  {formatNumber(contributor.contributions)}
                  <span className="sr-only"> contributions</span>
                </span>
              </a>
            ))}
          </ScrollShadow>
        </div>
      )}
      {contributorsUrl && (
        <a
          href={contributorsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={FLOATING_LINK_CLASS}
        >
          <Icon icon="ri:external-link-line" className="h-3.5 w-3.5" />
          View contributors
        </a>
      )}
    </>
  )
}

export function HealthTimelinePanel({ timeline }: { timeline: TimelinePoint[] }) {
  return (
    <>
      <PanelHeader icon="ri:line-chart-line" title="Health timeline" count={timeline.length} />
      {timeline.length === 0 ? (
        <PanelEmpty>No snapshots captured yet.</PanelEmpty>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          <div
            className={cn(
              COLUMN_LABEL_CLASS,
              'grid grid-cols-[1fr_4.5rem_4.5rem_4.5rem] items-center gap-3',
            )}
          >
            <span>Date</span>
            <span className="justify-self-end">Stars</span>
            <span className="justify-self-end">Forks</span>
            <span className="justify-self-end">Issues</span>
          </div>
          <ScrollShadow
            wrapperClassName="min-h-0 flex-1"
            className="divide-y divide-border/30"
            backToTop
          >
            {timeline.map((point) => (
              <div
                key={point.capturedAt}
                className="grid grid-cols-[1fr_4.5rem_4.5rem_4.5rem] items-center gap-3 px-4 py-2 text-xs text-muted-foreground"
              >
                <span className="font-medium text-foreground">
                  {new Date(point.capturedAt).toLocaleDateString()}
                </span>
                <span className="inline-flex items-center justify-self-end gap-1 tabular-nums">
                  <Icon icon="ri:star-line" className="h-3 w-3" />
                  {formatNumber(point.stars)}
                </span>
                <span className="inline-flex items-center justify-self-end gap-1 tabular-nums">
                  <Icon icon="ri:git-branch-line" className="h-3 w-3" />
                  {formatNumber(point.forks)}
                </span>
                <span className="inline-flex items-center justify-self-end gap-1 tabular-nums">
                  <Icon icon="ri:record-circle-line" className="h-3 w-3" />
                  {formatNumber(point.openIssues)}
                </span>
              </div>
            ))}
          </ScrollShadow>
        </div>
      )}
    </>
  )
}
