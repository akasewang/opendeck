'use client'

import { Icon } from '@iconify/react'
import { motion } from 'framer-motion'
import Image from 'next/image'
import { useCallback, useEffect, useRef, useState } from 'react'
import { buttonVariants } from '@/components/ui/button'
import { toast } from '@/components/ui/toast'
import { API_ROUTES, appRoute, withQuery } from '@/config/routes'
import { useAuth } from '@/features/auth/providers/auth-provider'
import PageShell from '@/features/dashboard/components/page-shell'
import {
  AboutPanel,
  ContributorsPanel,
  HealthTimelinePanel,
  RecommendedIssuesPanel,
  RepoJournalPanel,
} from '@/features/repositories/components/repo-detail-panels'
import {
  ExternalButton,
  loadErrorMessage,
  PANEL_CLASS,
  RepoDetailAuthGate,
  RepoDetailLoading,
  RepoDetailNotFound,
  SignalStat,
} from '@/features/repositories/components/repo-detail-states'
import RepoDocsPanel, {
  RepoAdditionalMarkdownPanel,
} from '@/features/repositories/components/repo-docs-panel'
import {
  detailSectionStagger,
  sectionItem,
} from '@/features/repositories/motion/repo-detail-motion'
import { useRepoContributors } from '@/features/repositories/hooks/use-repo-contributors'
import type {
  RepositoryInsight,
  RepositoryJournalPayload,
} from '@/features/repositories/types/repository'
import { cleanReadme } from '@/features/repositories/utils/repository-display'
import {
  isRepositoryInsight,
  isRepositoryJournalPayload,
} from '@/features/repositories/utils/repository-response-validation'
import { fetchWithTimeout } from '@/lib/api/http-client'
import { apiErrorMessage } from '@/lib/api/errors'
import { cn } from '@/utils/cn'

const FETCH_TIMEOUT_MS = 20_000

export default function RepoDetailWorkspace({ fullName }: { fullName: string }) {
  const { user, isLoading: isAuthLoading, openAuth } = useAuth()
  const userId = user?.id
  const [insight, setInsight] = useState<RepositoryInsight | null>(null)
  const [journal, setJournal] = useState<RepositoryJournalPayload | null>(null)
  const [journalBody, setJournalBody] = useState('')
  const [journalStatus, setJournalStatus] = useState('note')
  const [journalIssue, setJournalIssue] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [journalError, setJournalError] = useState<string | null>(null)
  const insightRequestRef = useRef(0)
  const journalRequestRef = useRef(0)
  const {
    contributors,
    totalCount: contributorsTotalCount,
    error: contributorsError,
    isLoading: contributorsLoading,
  } = useRepoContributors(userId ? (insight?.repo.full_name ?? fullName) : null)

  const loadInsight = useCallback(async () => {
    const requestId = insightRequestRef.current + 1
    insightRequestRef.current = requestId
    if (!userId) {
      setInsight(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setInsight(null)
    setLoadError(null)
    try {
      const response = await fetchWithTimeout(
        withQuery(API_ROUTES.repositories.detail, { fullName }),
        {
          credentials: 'include',
          cache: 'no-store',
        },
        FETCH_TIMEOUT_MS,
      )
      const payload: unknown = await response.json().catch(() => null)
      if (!response.ok) throw new Error(apiErrorMessage(payload, 'Unable to load repository.'))
      if (!isRepositoryInsight(payload))
        throw new Error('Repository API returned an invalid response.')
      if (insightRequestRef.current === requestId) setInsight(payload)
    } catch (error) {
      if (insightRequestRef.current !== requestId) return
      const message = loadErrorMessage(error, 'Unable to load repository')
      toast(message, {
        tone: 'error',
      })
      setLoadError(message)
    } finally {
      if (insightRequestRef.current === requestId) setIsLoading(false)
    }
  }, [fullName, userId])

  const loadJournal = useCallback(async () => {
    const requestId = journalRequestRef.current + 1
    journalRequestRef.current = requestId
    if (!userId) {
      setJournal(null)
      setJournalError(null)
      return
    }

    try {
      const response = await fetch(withQuery(API_ROUTES.account.journal, { fullName }), {
        credentials: 'include',
        cache: 'no-store',
      })
      const payload: unknown = await response.json().catch(() => null)
      if (!response.ok) throw new Error(apiErrorMessage(payload, 'Unable to load journal entries.'))
      if (!isRepositoryJournalPayload(payload)) {
        throw new Error('Journal API returned an invalid response.')
      }
      if (journalRequestRef.current !== requestId) return
      setJournal(payload)
      setJournalError(null)
    } catch (error) {
      if (journalRequestRef.current !== requestId) return
      setJournal(null)
      setJournalError(error instanceof Error ? error.message : 'Unable to load journal entries.')
    }
  }, [fullName, userId])

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
      <motion.div
        variants={detailSectionStagger}
        initial="hidden"
        animate="show"
        className="space-y-5"
      >
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
              <a href={appRoute.compareRepositories([fullRepoName])} className={buttonVariants()}>
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

        <div className="grid gap-5 xl:grid-cols-3">
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

        <div className="grid gap-5 xl:grid-cols-3">
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

        <div className="grid gap-5 xl:grid-cols-3">
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
