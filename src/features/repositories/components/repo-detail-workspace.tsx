'use client'

import { Icon } from '@iconify/react'
import { motion } from 'framer-motion'
import Image from 'next/image'
import { useCallback, useEffect, useState } from 'react'
import { toast } from '@/components/ui/toast'
import { useAuth } from '@/features/auth/auth-provider'
import PageShell from '@/features/dashboard/components/page-shell'
import {
  AboutPanel,
  ContributorsPanel,
  HealthTimelinePanel,
  RecommendedIssuesPanel,
  RepoJournalPanel,
} from '@/features/repositories/components/repo-detail-panels'
import {
  BUTTON_CLASS,
  DETAIL_FETCH_TIMEOUT_MS,
  ExternalButton,
  fetchWithTimeout,
  loadErrorMessage,
  PANEL_CLASS,
  RepoDetailAuthGate,
  RepoDetailLoading,
  RepoDetailNotFound,
  SignalStat,
  sectionItem,
  sectionStagger,
} from '@/features/repositories/components/repo-detail-primitives'
import RepoDocsPanel, {
  RepoAdditionalMarkdownPanel,
} from '@/features/repositories/components/repo-docs-panel'
import { useRepoContributors } from '@/features/repositories/hooks/use-repo-contributors'
import type { JournalPayload, RepoInsight } from '@/features/repositories/types'
import { cleanReadme } from '@/features/repositories/utils'
import { cn } from '@/utils/cn'

export default function RepoDetailWorkspace({ fullName }: { fullName: string }) {
  const { user, isLoading: isAuthLoading, openAuth } = useAuth()
  const [insight, setInsight] = useState<RepoInsight | null>(null)
  const [journal, setJournal] = useState<JournalPayload | null>(null)
  const [journalBody, setJournalBody] = useState('')
  const [journalStatus, setJournalStatus] = useState('note')
  const [journalIssue, setJournalIssue] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [journalError, setJournalError] = useState<string | null>(null)
  const {
    contributors,
    totalCount: contributorsTotalCount,
    error: contributorsError,
    isLoading: contributorsLoading,
  } = useRepoContributors(user ? (insight?.repo.full_name ?? fullName) : null)

  const loadInsight = useCallback(async () => {
    if (!user) {
      setInsight(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setLoadError(null)
    try {
      const response = await fetchWithTimeout(
        `/api/repos/detail?fullName=${encodeURIComponent(fullName)}`,
        {
          credentials: 'include',
          cache: 'no-store',
        },
        DETAIL_FETCH_TIMEOUT_MS,
      )
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error || 'Unable to load repository.')
      setInsight(payload)
    } catch (error) {
      const message = loadErrorMessage(error, 'Unable to load repository')
      toast(message, {
        tone: 'error',
      })
      setLoadError(message)
    } finally {
      setIsLoading(false)
    }
  }, [fullName, user])

  const loadJournal = useCallback(async () => {
    if (!user) {
      setJournal(null)
      setJournalError(null)
      return
    }

    try {
      const response = await fetch(
        `/api/account/journal?fullName=${encodeURIComponent(fullName)}`,
        {
          credentials: 'include',
          cache: 'no-store',
        },
      )
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error || 'Unable to load journal entries.')
      setJournal(payload)
      setJournalError(null)
    } catch (error) {
      setJournal(null)
      setJournalError(error instanceof Error ? error.message : 'Unable to load journal entries.')
    }
  }, [fullName, user])

  useEffect(() => {
    if (isAuthLoading) return
    void loadInsight()
  }, [isAuthLoading, loadInsight])

  useEffect(() => {
    void loadJournal()
  }, [loadJournal])

  if (isAuthLoading || isLoading) return <RepoDetailLoading />

  if (!user) {
    return (
      <RepoDetailAuthGate
        onSignIn={() =>
          openAuth({
            message: 'Sign in to inspect repository details.',
          })
        }
      />
    )
  }

  if (!insight) return <RepoDetailNotFound loadError={loadError} />

  const repo = insight.repo
  const fullRepoName = repo.full_name ?? fullName
  const owner = repo.owner?.login ?? fullRepoName.split('/')[0]
  const repoName = fullRepoName.split('/').slice(1).join('/') || fullRepoName
  const avatar = repo.owner?.avatar_url
  const homepage = repo.homepage && /^https?:\/\//.test(repo.homepage) ? repo.homepage : undefined
  const contributorsUrl = repo.html_url ? `${repo.html_url}/graphs/contributors` : undefined
  const readme = cleanReadme(repo.readme_excerpt)
  const topics = repo.topics?.filter(Boolean) ?? []
  const license = repo.license?.name ?? repo.license?.key ?? null
  const journalEntries = journal?.entries ?? []
  const resolvedContributorCount = Math.max(
    repo.contributors ?? 0,
    contributorsTotalCount,
    contributors.length,
  )

  return (
    <PageShell className="space-y-5">
      <motion.div variants={sectionStagger} initial="hidden" animate="show" className="space-y-5">
        <motion.header variants={sectionItem} className="space-y-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 max-w-4xl items-start gap-3.5">
              {avatar && (
                <Image
                  src={`${avatar}${avatar.includes('?') ? '&' : '?'}s=88`}
                  alt=""
                  width={56}
                  height={56}
                  className="h-14 w-14 shrink-0 rounded-lg ring-1 ring-border/50"
                />
              )}
              <div className="flex min-h-14 min-w-0 flex-col justify-center">
                <p className="truncate text-xs font-medium leading-none text-muted-foreground">
                  {owner}
                </p>
                <h1 className="truncate text-xl font-medium leading-tight text-primary">
                  {repoName}
                </h1>
                <p
                  title={repo.description ?? undefined}
                  className="mt-1 line-clamp-1 text-pretty text-sm leading-snug text-muted-foreground"
                >
                  {repo.description || 'No description available.'}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              {repo.html_url && (
                <ExternalButton href={repo.html_url} icon="ri:github-fill">
                  GitHub
                </ExternalButton>
              )}
              {homepage && (
                <ExternalButton href={homepage} icon="ri:global-line">
                  Website
                </ExternalButton>
              )}
              <a
                href={`/dashboard/compare?repos=${encodeURIComponent(fullRepoName)}`}
                className={BUTTON_CLASS}
              >
                <Icon icon="ri:scales-3-line" className="h-4 w-4" />
                Compare
              </a>
            </div>
          </div>
        </motion.header>

        <motion.section variants={sectionItem} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <SignalStat
            icon="ri:compass-3-line"
            label="Contribution score"
            value={repo.contribution_score ?? 0}
          />
          <SignalStat icon="ri:star-line" label="Stars" value={repo.stargazers_count ?? 0} />
          <SignalStat icon="ri:git-branch-line" label="Forks" value={repo.forks_count ?? 0} />
          <SignalStat
            icon="ri:record-circle-line"
            label="Open issues"
            value={repo.open_issues_count ?? 0}
          />
          <SignalStat icon="ri:team-line" label="Contributors" value={resolvedContributorCount} />
        </motion.section>

        <div className="grid gap-4 xl:grid-cols-3">
          <motion.section
            variants={sectionItem}
            className={cn(PANEL_CLASS, 'h-[28rem] xl:col-span-2')}
          >
            <RecommendedIssuesPanel
              issues={insight.issues}
              repoHtmlUrl={repo.html_url}
              hasGoodFirstIssues={repo.has_good_first_issues}
            />
          </motion.section>

          <motion.section variants={sectionItem} className={cn(PANEL_CLASS, 'h-[28rem]')}>
            <AboutPanel repo={repo} license={license} topics={topics} />
          </motion.section>
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          <motion.section
            variants={sectionItem}
            className={cn(PANEL_CLASS, 'h-[26rem] xl:col-span-2')}
          >
            <RepoJournalPanel
              fullName={fullName}
              entries={journalEntries}
              journalBody={journalBody}
              journalStatus={journalStatus}
              journalIssue={journalIssue}
              journalError={journalError}
              onBodyChange={setJournalBody}
              onStatusChange={setJournalStatus}
              onIssueChange={setJournalIssue}
              onJournalSaved={setJournal}
              onJournalError={setJournalError}
              onReloadJournal={loadJournal}
            />
          </motion.section>

          <motion.section variants={sectionItem} className={cn(PANEL_CLASS, 'relative h-[26rem]')}>
            <ContributorsPanel
              contributors={contributors}
              totalCount={resolvedContributorCount}
              isLoading={contributorsLoading}
              error={contributorsError}
              contributorsUrl={contributorsUrl}
            />
          </motion.section>
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          <motion.section
            variants={sectionItem}
            className={cn(PANEL_CLASS, 'relative h-[36rem] xl:col-span-2')}
          >
            <RepoDocsPanel
              fullName={fullRepoName}
              repoHtmlUrl={repo.html_url}
              readmeHtml={repo.readme_content}
              readmeFallback={readme}
              hasLicense={Boolean(license)}
              documents={insight.documents}
            />
          </motion.section>

          <motion.section variants={sectionItem} className={cn(PANEL_CLASS, 'h-[36rem]')}>
            <HealthTimelinePanel timeline={insight.timeline} />
          </motion.section>
        </div>

        <motion.section variants={sectionItem} className={cn(PANEL_CLASS, 'relative h-[30rem]')}>
          <RepoAdditionalMarkdownPanel fullName={fullRepoName} documents={insight.documents} />
        </motion.section>
      </motion.div>
    </PageShell>
  )
}
