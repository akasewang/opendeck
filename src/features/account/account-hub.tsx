'use client'

import { Icon } from '@iconify/react'
import { motion } from 'framer-motion'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  BUTTON_CLASS,
  INPUT_CLASS,
  PRIMARY_BUTTON_CLASS,
  TEXTAREA_CLASS,
} from '@/components/ui/control-styles'
import CountPill from '@/components/ui/count-pill'
import { EmptyState } from '@/components/ui/empty-state'
import Select from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { SimpleTag } from '@/components/ui/tag'
import { toast } from '@/components/ui/toast'
import {
  CHECKBOX_ROW_CLASS,
  ICON_BUTTON_CLASS,
  LIST_CARD_CLASS,
  PANEL_CLASS,
  sectionItem,
  sectionStagger,
  type TabId,
  tabs,
} from '@/features/account/account-hub-config'
import {
  apiPost,
  formatDate,
  formatWhen,
  repoName,
  shortDescription,
} from '@/features/account/account-hub-helpers'
import {
  ConfirmButton,
  RepoRow,
  StatCell,
} from '@/features/account/components/account-hub-primitives'
import type { AccountOverview, RepoWithState } from '@/features/account/types'
import { useAuth } from '@/features/auth/auth-provider'
import PageShell from '@/features/dashboard/components/page-shell'
import { RepoSearchInput } from '@/features/repositories/components/repo-search-input'
import type { GithubRepoApiItem } from '@/features/repositories/types'
import { formatNumber } from '@/features/repositories/utils'
import { cn } from '@/utils/cn'

export default function AccountHub() {
  const { user, isLoading: authLoading, openAuth, refreshSession, signOut } = useAuth()
  const [activeTab, setActiveTab] = useState<TabId>('home')
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const tab = searchParams.get('tab')
    setActiveTab(tab && tabs.some((item) => item.id === tab) ? (tab as TabId) : 'home')
  }, [searchParams])

  const selectTab = useCallback(
    (tab: TabId) => {
      setActiveTab(tab)
      setOpenCollectionId(null)
      setCollectionDetail(null)
      router.replace(tab === 'home' ? '/dashboard/home' : `/dashboard/home?tab=${tab}`, {
        scroll: false,
      })
    },
    [router],
  )
  const [overview, setOverview] = useState<AccountOverview | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [collectionName, setCollectionName] = useState('')
  const [collectionDescription, setCollectionDescription] = useState('')
  const [profileName, setProfileName] = useState('')
  const [profileEmail, setProfileEmail] = useState('')
  const [verificationToken, setVerificationToken] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [onboardingSkill, setOnboardingSkill] = useState('intermediate')
  const [onboardingHours, setOnboardingHours] = useState('4')
  const [onboardingGoals, setOnboardingGoals] = useState('')
  const [onboardingLanguages, setOnboardingLanguages] = useState('')
  const [onboardingTopics, setOnboardingTopics] = useState('')
  const [searchName, setSearchName] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchLanguage, setSearchLanguage] = useState('')
  const [searchTopic, setSearchTopic] = useState('')
  const [searchMinStars, setSearchMinStars] = useState('25')
  const [searchAlertsEnabled, setSearchAlertsEnabled] = useState(true)
  const [openCollectionId, setOpenCollectionId] = useState<string | null>(null)
  const [collectionDetail, setCollectionDetail] = useState<{
    collection: AccountOverview['collections'][number]
    items: GithubRepoApiItem[]
  } | null>(null)
  const [collectionDetailLoading, setCollectionDetailLoading] = useState(false)

  const loadCollectionDetail = useCallback(async (id: string) => {
    setCollectionDetailLoading(true)
    try {
      const response = await fetch(`/api/account/collections?id=${encodeURIComponent(id)}`, {
        credentials: 'include',
        cache: 'no-store',
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error || 'Unable to load collection.')
      setCollectionDetail(payload)
    } catch (nextError) {
      toast(nextError instanceof Error ? nextError.message : 'Unable to load collection', {
        tone: 'error',
      })
      setOpenCollectionId(null)
    } finally {
      setCollectionDetailLoading(false)
    }
  }, [])
  const [searchPreview, setSearchPreview] = useState<{
    totalCount: number
    items: GithubRepoApiItem[]
  } | null>(null)
  const [searchPreviewLoading, setSearchPreviewLoading] = useState(false)
  const [issues, setIssues] = useState<NonNullable<AccountOverview['issues']>>([])
  const [issuesLoading, setIssuesLoading] = useState(false)
  const [preferencesDraft, setPreferencesDraft] = useState<AccountOverview['preferences'] | null>(
    null,
  )

  const loadOverview = useCallback(async () => {
    if (!user) return
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/account/overview', {
        credentials: 'include',
        cache: 'no-store',
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload?.error || 'Unable to load account.')
      setOverview(payload.account)
      setProfileName(payload.account.user.name)
      setProfileEmail(payload.account.user.email)
      setPreferencesDraft(payload.account.preferences)
      setOnboardingSkill(payload.account.onboarding.skillLevel)
      setOnboardingHours(String(payload.account.onboarding.weeklyHours))
      setOnboardingGoals(payload.account.onboarding.goals.join(', '))
      setOnboardingLanguages(payload.account.onboarding.languages.join(', '))
      setOnboardingTopics(payload.account.onboarding.topics.join(', '))
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Unable to load account.')
    } finally {
      setIsLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (!authLoading) void loadOverview()
  }, [authLoading, loadOverview])

  const pipelineGroups = useMemo(() => {
    const groups = new Map<string, RepoWithState[]>()
    for (const item of overview?.pipelineRepos ?? []) {
      const stage = item.state.pipelineStage || 'interested'
      const group = groups.get(stage)
      if (group) {
        group.push(item)
      } else {
        groups.set(stage, [item])
      }
    }
    return groups
  }, [overview?.pipelineRepos])

  const collectionExcludedRepoNames = useMemo(
    () => collectionDetail?.items.map((repo) => repoName(repo)) ?? [],
    [collectionDetail?.items],
  )

  const loadIssues = useCallback(async () => {
    setIssuesLoading(true)
    try {
      const response = await fetch('/api/account/issues', {
        credentials: 'include',
        cache: 'no-store',
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error || 'Unable to load issue recommendations.')
      setIssues(payload.items ?? [])
    } catch (nextError) {
      toast(
        nextError instanceof Error ? nextError.message : 'Unable to load issue recommendations',
        { tone: 'error' },
      )
    } finally {
      setIssuesLoading(false)
    }
  }, [])

  useEffect(() => {
    if (activeTab === 'issues' && issues.length === 0 && !issuesLoading) void loadIssues()
  }, [activeTab, issues.length, issuesLoading, loadIssues])

  const updateRepo = async (repo: GithubRepoApiItem, patch: Record<string, unknown>) => {
    await apiPost('/api/account/repo', {
      repoId: repo.opendeck_id,
      fullName: repoName(repo),
      ...patch,
    })
    toast('Repository updated')
    await loadOverview()
  }

  if (authLoading || (isLoading && !overview)) {
    return (
      <PageShell className="space-y-5">
        <div className="flex items-center justify-between gap-4">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-9 w-40" />
        </div>
        <Skeleton className="h-[4.25rem]" />
        <Skeleton className="h-9 w-full max-w-2xl" />
        <div className="grid gap-5 xl:grid-cols-[1.7fr_1fr]">
          <div className="space-y-2">
            {Array.from({ length: 5 }, (_, index) => (
              <Skeleton key={index} className="h-[4.5rem]" />
            ))}
          </div>
          <div className="space-y-4">
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
          </div>
        </div>
      </PageShell>
    )
  }

  if (!user) {
    return (
      <PageShell>
        <EmptyState
          icon="ri:user-shared-line"
          title="Sign in to open My Deck"
          description="Save repositories, build collections, manage your contribution pipeline and tune recommendations."
          className="mx-auto mt-10 max-w-xl py-14"
        >
          <button type="button" onClick={() => openAuth()} className={PRIMARY_BUTTON_CLASS}>
            <Icon icon="ri:login-circle-line" className="h-4 w-4" />
            Sign in
          </button>
        </EmptyState>
      </PageShell>
    )
  }

  if (error) {
    return (
      <PageShell>
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <Icon icon="ri:error-warning-line" className="h-4 w-4 shrink-0" />
          <span className="min-w-0 flex-1">{error}</span>
          <button type="button" onClick={() => void loadOverview()} className={BUTTON_CLASS}>
            <Icon icon="ri:refresh-line" className="h-4 w-4" />
            Retry
          </button>
        </div>
      </PageShell>
    )
  }

  if (!overview || !preferencesDraft) return null

  return (
    <PageShell className="space-y-5">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:flex-wrap">
        <div className="flex min-w-0 flex-col gap-1.5">
          <h1 className="text-lg font-medium leading-[100%] text-primary sm:text-xl">My Deck</h1>
          <p className="max-w-md text-pretty text-[13px] text-muted-foreground">
            Saved repositories, contribution tracking and personal recommendations.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => {
              window.location.href = '/api/account/export?format=csv'
            }}
            className={BUTTON_CLASS}
          >
            <Icon icon="ri:file-download-line" className="h-4 w-4" />
            CSV
          </button>
          <button
            type="button"
            onClick={() => {
              window.location.href = '/api/account/export?format=json'
            }}
            className={BUTTON_CLASS}
          >
            <Icon icon="ri:braces-line" className="h-4 w-4" />
            JSON
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-border/50 bg-border/30">
        <motion.div
          variants={sectionStagger}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 gap-px sm:grid-cols-3 xl:grid-cols-5"
        >
          <StatCell
            label="Saved"
            value={overview.stats.saved}
            icon="ri:bookmark-line"
            onSelect={() => selectTab('library')}
          />
          <StatCell
            label="Pipeline"
            value={overview.stats.pipeline}
            icon="ri:git-pull-request-line"
            onSelect={() => selectTab('pipeline')}
          />
          <StatCell
            label="Collections"
            value={overview.stats.collections}
            icon="ri:folder-line"
            onSelect={() => selectTab('collections')}
          />
          <StatCell
            label="Follows"
            value={overview.stats.follows}
            icon="ri:notification-3-line"
            onSelect={() => selectTab('follows')}
          />
          <StatCell
            label="Unread alerts"
            value={overview.stats.unreadAlerts}
            icon="ri:alarm-line"
            onSelect={() => selectTab('home')}
            className="col-span-2 xl:col-span-1"
          />
        </motion.div>
      </div>

      <div className="hide-scrollbar flex gap-1 overflow-x-auto border-b border-border/50 pb-2">
        {tabs.map((tab) => {
          const active = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => selectTab(tab.id)}
              className={cn(
                'relative inline-flex h-9 shrink-0 items-center gap-2 rounded-md px-3 text-sm font-medium transition-colors',
                active
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:bg-muted-hover hover:text-foreground',
              )}
            >
              {active && (
                <motion.span
                  layoutId="account-hub-active-tab"
                  className="absolute inset-0 rounded-md bg-muted"
                  transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                />
              )}
              <span className="relative z-10 inline-flex items-center gap-2">
                <Icon icon={tab.icon} className="h-4 w-4" />
                {tab.label}
              </span>
            </button>
          )
        })}
      </div>

      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="space-y-5"
      >
        {activeTab === 'home' && (
          <div className="grid gap-5 xl:grid-cols-[1.7fr_1fr] xl:items-start">
            {!overview.onboarding.completedAt && (
              <form
                className={cn(PANEL_CLASS, 'space-y-4 xl:col-span-2')}
                onSubmit={async (event) => {
                  event.preventDefault()
                  await apiPost('/api/account/onboarding', {
                    skillLevel: onboardingSkill,
                    weeklyHours: Number.parseInt(onboardingHours, 10) || 4,
                    goals: onboardingGoals,
                    languages: onboardingLanguages,
                    topics: onboardingTopics,
                  })
                  toast('Onboarding saved')
                  await loadOverview()
                }}
              >
                <div>
                  <h2 className="text-sm font-semibold text-foreground">Personalize OpenDeck</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Tell us how you contribute and we will tune recommendations to match.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-5">
                  <div className="space-y-1.5">
                    <span className="text-xs font-medium text-muted-foreground">Skill level</span>
                    <Select
                      value={onboardingSkill}
                      onChange={(event) => setOnboardingSkill(event.target.value)}
                      options={[
                        { value: 'beginner', label: 'Beginner' },
                        { value: 'intermediate', label: 'Intermediate' },
                        { value: 'advanced', label: 'Advanced' },
                      ]}
                      placeholder="Skill"
                      clearable={false}
                      ariaLabel="Skill level"
                    />
                  </div>
                  <label className="space-y-1.5">
                    <span className="text-xs font-medium text-muted-foreground">Hours / week</span>
                    <input
                      value={onboardingHours}
                      onChange={(event) => setOnboardingHours(event.target.value)}
                      placeholder="4"
                      inputMode="numeric"
                      className={INPUT_CLASS}
                    />
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-xs font-medium text-muted-foreground">Languages</span>
                    <input
                      value={onboardingLanguages}
                      onChange={(event) => setOnboardingLanguages(event.target.value)}
                      placeholder="typescript, go"
                      className={INPUT_CLASS}
                    />
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-xs font-medium text-muted-foreground">Topics</span>
                    <input
                      value={onboardingTopics}
                      onChange={(event) => setOnboardingTopics(event.target.value)}
                      placeholder="cli, devtools"
                      className={INPUT_CLASS}
                    />
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-xs font-medium text-muted-foreground">Goals</span>
                    <input
                      value={onboardingGoals}
                      onChange={(event) => setOnboardingGoals(event.target.value)}
                      placeholder="first PR, learn OSS"
                      className={INPUT_CLASS}
                    />
                  </label>
                </div>
                <button type="submit" className={PRIMARY_BUTTON_CLASS}>
                  <Icon icon="ri:magic-line" className="h-4 w-4" />
                  Save onboarding
                </button>
              </form>
            )}

            <section className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-foreground">Recommended for you</h2>
                <button
                  type="button"
                  onClick={() => selectTab('preferences')}
                  className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  Tune preferences
                </button>
              </div>
              {overview.recommendations.length === 0 ? (
                <EmptyState
                  icon="ri:compass-3-line"
                  title="No recommendations yet"
                  description="Set preferred languages and topics in Preferences to get tailored repositories."
                >
                  <button
                    type="button"
                    onClick={() => selectTab('preferences')}
                    className={BUTTON_CLASS}
                  >
                    Open preferences
                  </button>
                </EmptyState>
              ) : (
                <motion.div
                  variants={sectionStagger}
                  initial="hidden"
                  animate="show"
                  className="space-y-2"
                >
                  {overview.recommendations.slice(0, 8).map((repo) => {
                    const fullName = repoName(repo)
                    const avatar = repo.owner?.avatar_url
                    return (
                      <motion.div
                        key={repo.opendeck_id ?? fullName}
                        variants={sectionItem}
                        className={cn(LIST_CARD_CLASS, 'flex items-center gap-3 px-3.5 py-3')}
                      >
                        {avatar && (
                          <Image
                            src={`${avatar}${avatar.includes('?') ? '&' : '?'}s=48`}
                            alt=""
                            width={24}
                            height={24}
                            className="h-6 w-6 shrink-0 rounded-md ring-1 ring-border/50"
                          />
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <a
                              href={`/dashboard/repos/${fullName}`}
                              className="truncate text-sm font-semibold text-foreground transition-colors hover:text-primary"
                            >
                              {fullName}
                            </a>
                            <span className="inline-flex shrink-0 items-center gap-1 font-mono text-xs tabular-nums text-muted-foreground">
                              <Icon icon="ri:star-line" className="h-3 w-3" />
                              {formatNumber(repo.stargazers_count ?? 0)}
                            </span>
                          </div>
                          <p className="mt-0.5 truncate text-[13px] text-muted-foreground">
                            {shortDescription(repo.description, 90)}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => updateRepo(repo, { saved: true })}
                            className="inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-md bg-primary px-2.5 text-xs font-medium text-primary-foreground transition hover:opacity-90 active:scale-[0.98]"
                          >
                            <Icon icon="ri:bookmark-line" className="h-3.5 w-3.5" />
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => updateRepo(repo, { dismissed: true })}
                            aria-label={`Dismiss ${fullName}`}
                            title="Dismiss"
                            className={ICON_BUTTON_CLASS}
                          >
                            <Icon icon="ri:close-line" className="h-4 w-4" />
                          </button>
                        </div>
                      </motion.div>
                    )
                  })}
                </motion.div>
              )}
            </section>

            <div className="space-y-4">
              <motion.section
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className={cn(PANEL_CLASS, 'p-0')}
              >
                <div className="flex h-11 items-center justify-between gap-3 border-b border-border/40 px-4">
                  <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Icon icon="ri:alarm-line" className="h-4 w-4 text-muted-foreground/70" />
                    Alerts
                    <CountPill count={overview.stats.unreadAlerts} />
                  </h2>
                  {overview.stats.unreadAlerts > 0 && (
                    <button
                      type="button"
                      onClick={async () => {
                        await apiPost('/api/account/alerts/read', {})
                        toast('Alerts marked as read')
                        await loadOverview()
                      }}
                      className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                    >
                      Mark all read
                    </button>
                  )}
                </div>
                {overview.alerts.length === 0 ? (
                  <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                    No alerts yet. Save repositories or create saved searches to get them.
                  </p>
                ) : (
                  <div className="divide-y divide-border/40">
                    {overview.alerts.slice(0, 5).map((alert) => (
                      <div key={alert.id} className="px-4 py-2.5">
                        <div className="flex items-start gap-2">
                          {!alert.readAt && (
                            <span
                              role="img"
                              aria-label="Unread alert"
                              title="Unread alert"
                              className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-info"
                            />
                          )}
                          <span className="min-w-0 flex-1 text-[13px] leading-snug text-foreground">
                            {alert.message}
                          </span>
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {formatWhen(alert.createdAt)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.section>

              <motion.section
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30, delay: 0.06 }}
                className={cn(PANEL_CLASS, 'p-0')}
              >
                <div className="flex h-11 items-center gap-2 border-b border-border/40 px-4">
                  <Icon icon="ri:history-line" className="h-4 w-4 text-muted-foreground/70" />
                  <h2 className="text-sm font-semibold text-foreground">Recently viewed</h2>
                </div>
                {overview.recentViews.length === 0 ? (
                  <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                    Repositories and organizations you open will show up here.
                  </p>
                ) : (
                  <div className="divide-y divide-border/40">
                    {overview.recentViews.slice(0, 6).map((view) => (
                      <a
                        key={view.id}
                        href={
                          view.targetType === 'organization'
                            ? `/dashboard/organizations?owner=${encodeURIComponent(view.targetKey)}`
                            : `/dashboard/repos/${view.targetKey}`
                        }
                        className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-muted-hover"
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <Icon
                            icon={
                              view.targetType === 'organization'
                                ? 'ri:building-line'
                                : 'ri:git-repository-line'
                            }
                            className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70"
                          />
                          <span className="truncate text-foreground">{view.targetKey}</span>
                        </span>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {formatWhen(view.viewedAt)}
                        </span>
                      </a>
                    ))}
                  </div>
                )}
              </motion.section>
            </div>
          </div>
        )}

        {activeTab === 'library' && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-foreground">Saved repositories</h2>
            {overview.savedRepos.length === 0 ? (
              <EmptyState
                icon="ri:bookmark-line"
                title="No saved repositories"
                description="Save repositories from recommendations or any dashboard row to build your library."
              >
                <a href="/dashboard" className={BUTTON_CLASS}>
                  Browse repositories
                  <Icon icon="ri:arrow-right-line" className="h-3.5 w-3.5" />
                </a>
              </EmptyState>
            ) : (
              <motion.div
                variants={sectionStagger}
                initial="hidden"
                animate="show"
                className="grid gap-3 xl:grid-cols-2"
              >
                {overview.savedRepos.map((item) => (
                  <RepoRow
                    key={item.repo.opendeck_id ?? repoName(item.repo)}
                    item={item}
                    onUpdate={updateRepo}
                  />
                ))}
              </motion.div>
            )}
          </section>
        )}

        {activeTab === 'pipeline' && (
          <motion.section
            variants={sectionStagger}
            initial="hidden"
            animate="show"
            className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
          >
            {[
              ['interested', 'Interested', 'ri:lightbulb-line'],
              ['opened_issue', 'Opened issue', 'ri:record-circle-line'],
              ['submitted_pr', 'Submitted PR', 'ri:git-pull-request-line'],
              ['done', 'Done', 'ri:checkbox-circle-line'],
            ].map(([stage, label, icon]) => {
              const stageItems = pipelineGroups.get(stage) ?? []
              return (
                <motion.div
                  key={stage}
                  variants={sectionItem}
                  className="space-y-2 rounded-lg border border-border/50 bg-background/40 p-3"
                >
                  <div className="flex items-center justify-between gap-2 px-1 pb-1">
                    <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <Icon icon={icon} className="h-4 w-4 text-muted-foreground/70" />
                      {label}
                    </h2>
                    <CountPill count={stageItems.length} />
                  </div>
                  {stageItems.length === 0 ? (
                    <div className="rounded-md border border-dashed border-border/50 px-3 py-6 text-center text-xs text-muted-foreground">
                      Nothing in this stage yet.
                    </div>
                  ) : (
                    stageItems.map((item) => (
                      <div
                        key={item.repo.opendeck_id ?? repoName(item.repo)}
                        className="rounded-md border border-border/40 bg-background/40 p-2.5 transition-colors hover:border-border/70"
                      >
                        <div className="truncate text-sm font-medium text-foreground">
                          {repoName(item.repo)}
                        </div>
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                          {item.state.note || item.repo.description || 'No note.'}
                        </p>
                      </div>
                    ))
                  )}
                </motion.div>
              )
            })}
          </motion.section>
        )}

        {activeTab === 'issues' && (
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-foreground">Issue recommendations</h2>
              <button
                type="button"
                onClick={loadIssues}
                disabled={issuesLoading}
                className={BUTTON_CLASS}
              >
                <Icon
                  icon="ri:refresh-line"
                  className={cn('h-4 w-4', issuesLoading && 'animate-spin')}
                />
                {issuesLoading ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
            {issuesLoading && issues.length === 0 ? (
              <div className="grid gap-3 xl:grid-cols-2">
                {Array.from({ length: 4 }, (_, index) => (
                  <Skeleton key={index} className="h-24" />
                ))}
              </div>
            ) : issues.length === 0 ? (
              <EmptyState
                icon="ri:bug-line"
                title="No issue recommendations yet"
                description="Save a few repositories or configure GITHUB_TOKEN, then refresh to surface approachable issues."
              >
                <button type="button" onClick={() => selectTab('library')} className={BUTTON_CLASS}>
                  Open library
                </button>
              </EmptyState>
            ) : (
              <motion.div
                variants={sectionStagger}
                initial="hidden"
                animate="show"
                className="grid gap-3 xl:grid-cols-2"
              >
                {issues.map((issue) => (
                  <motion.a
                    key={issue.id}
                    variants={sectionItem}
                    href={issue.htmlUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(LIST_CARD_CLASS, 'block p-4')}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-foreground">
                          {issue.fullName} #{issue.number}
                        </div>
                        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                          {issue.title}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-sm border border-success/30 bg-success/10 px-2 py-1 font-mono text-xs tabular-nums text-success">
                        {issue.score}
                      </span>
                    </div>
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {issue.labels.slice(0, 5).map((label) => (
                        <SimpleTag key={label}>{label}</SimpleTag>
                      ))}
                    </div>
                  </motion.a>
                ))}
              </motion.div>
            )}
          </section>
        )}

        {activeTab === 'collections' && openCollectionId && (
          <section className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setOpenCollectionId(null)
                    setCollectionDetail(null)
                  }}
                  className={BUTTON_CLASS}
                >
                  <Icon icon="ri:arrow-left-line" className="h-4 w-4" />
                  Back
                </button>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="truncate text-sm font-semibold text-foreground">
                      {collectionDetail?.collection.name ?? 'Collection'}
                    </h2>
                    <CountPill count={collectionDetail?.items.length ?? 0} />
                  </div>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {collectionDetail?.collection.description ||
                      'Search below to add repositories to this collection.'}
                  </p>
                </div>
              </div>
              {collectionDetail?.collection.visibility === 'shared' &&
                collectionDetail.collection.shareSlug && (
                  <a
                    href={`/shared/collections/${collectionDetail.collection.shareSlug}`}
                    className={BUTTON_CLASS}
                  >
                    Public page
                    <Icon icon="ri:external-link-line" className="h-3.5 w-3.5" />
                  </a>
                )}
            </div>

            <RepoSearchInput
              onPick={async (fullName, repo) => {
                if (!openCollectionId) return
                await apiPost('/api/account/collections/item', {
                  collectionId: openCollectionId,
                  fullName,
                  repoId: repo?.opendeck_id,
                  action: 'add',
                })
                toast('Added to collection')
                await Promise.all([loadCollectionDetail(openCollectionId), loadOverview()])
              }}
              exclude={collectionExcludedRepoNames}
              placeholder="Search the index to add repositories..."
            />

            {collectionDetailLoading && !collectionDetail ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }, (_, index) => (
                  <Skeleton key={index} className="h-16" />
                ))}
              </div>
            ) : (collectionDetail?.items ?? []).length === 0 ? (
              <EmptyState
                icon="ri:folder-open-line"
                title="This collection is empty"
                description="Use the search above to add repositories, or add them from any repository row."
              />
            ) : (
              <motion.div
                variants={sectionStagger}
                initial="hidden"
                animate="show"
                className="space-y-2"
              >
                {(collectionDetail?.items ?? []).map((repo) => (
                  <motion.div
                    key={repo.opendeck_id ?? repoName(repo)}
                    variants={sectionItem}
                    className={cn(
                      LIST_CARD_CLASS,
                      'flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between',
                    )}
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <a
                          href={`/dashboard/repos/${repoName(repo)}`}
                          className="truncate text-sm font-semibold text-foreground transition-colors hover:text-primary"
                        >
                          {repoName(repo)}
                        </a>
                        {repo.language && <SimpleTag>{repo.language}</SimpleTag>}
                        <span className="inline-flex items-center gap-1 font-mono text-xs tabular-nums text-muted-foreground">
                          <Icon icon="ri:star-line" className="h-3 w-3" />
                          {formatNumber(repo.stargazers_count ?? 0)}
                        </span>
                      </div>
                      <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">
                        {repo.description || 'No description available.'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!openCollectionId) return
                        await apiPost('/api/account/collections/item', {
                          collectionId: openCollectionId,
                          repoId: repo.opendeck_id,
                          fullName: repoName(repo),
                          action: 'remove',
                        })
                        toast('Removed from collection')
                        await Promise.all([loadCollectionDetail(openCollectionId), loadOverview()])
                      }}
                      className={cn(BUTTON_CLASS, 'shrink-0')}
                    >
                      <Icon icon="ri:close-line" className="h-3.5 w-3.5" />
                      Remove
                    </button>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </section>
        )}

        {activeTab === 'collections' && !openCollectionId && (
          <section className="grid items-start gap-5 lg:grid-cols-[22rem_1fr]">
            <form
              className={cn(PANEL_CLASS, 'space-y-3')}
              onSubmit={async (event) => {
                event.preventDefault()
                await apiPost('/api/account/collections', {
                  name: collectionName,
                  description: collectionDescription,
                })
                setCollectionName('')
                setCollectionDescription('')
                toast('Collection saved')
                await loadOverview()
              }}
            >
              <h2 className="text-sm font-semibold text-foreground">New collection</h2>
              <input
                value={collectionName}
                onChange={(event) => setCollectionName(event.target.value)}
                placeholder="Collection name"
                className={INPUT_CLASS}
              />
              <textarea
                value={collectionDescription}
                onChange={(event) => setCollectionDescription(event.target.value)}
                placeholder="Description"
                className={TEXTAREA_CLASS}
              />
              <button type="submit" className={cn(PRIMARY_BUTTON_CLASS, 'w-full')}>
                <Icon icon="ri:add-line" className="h-4 w-4" />
                Create collection
              </button>
              <div className="space-y-2 border-t border-border/40 pt-3">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Templates
                </h3>
                {overview.collectionTemplates.map((template) => (
                  <button
                    key={template.key}
                    type="button"
                    onClick={async () => {
                      await apiPost('/api/account/collections/template', { key: template.key })
                      toast('Template added')
                      await loadOverview()
                    }}
                    className={cn(BUTTON_CLASS, 'w-full justify-start')}
                    title={template.description}
                  >
                    <Icon icon="ri:layout-masonry-line" className="h-4 w-4 text-muted-foreground" />
                    {template.name}
                  </button>
                ))}
              </div>
            </form>
            {overview.collections.length === 0 ? (
              <EmptyState
                icon="ri:folder-open-line"
                title="No collections yet"
                description="Create a collection or start from a template to group repositories."
              />
            ) : (
              <motion.div
                variants={sectionStagger}
                initial="hidden"
                animate="show"
                className="space-y-3"
              >
                {overview.collections.map((collection) => (
                  <motion.div
                    key={collection.id}
                    variants={sectionItem}
                    className={cn(
                      LIST_CARD_CLASS,
                      'flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between',
                    )}
                  >
                    <div className="min-w-0 lg:flex-1">
                      <div className="flex items-center gap-2.5">
                        <h3 className="min-w-0 text-sm font-semibold">
                          <button
                            type="button"
                            onClick={() => {
                              setOpenCollectionId(collection.id)
                              setCollectionDetail(null)
                              void loadCollectionDetail(collection.id)
                            }}
                            className="block max-w-full truncate text-left text-foreground transition-colors hover:text-primary"
                          >
                            {collection.name}
                          </button>
                        </h3>
                        <span className="inline-flex shrink-0 items-center gap-1 font-mono text-xs tabular-nums text-muted-foreground">
                          <Icon icon="ri:archive-stack-line" className="h-3.5 w-3.5" />
                          {collection.itemCount}
                        </span>
                        {collection.visibility === 'shared' && (
                          <span className="shrink-0 rounded-sm border border-border/40 px-1.5 py-0.5 text-[11px] text-muted-foreground">
                            Shared
                          </span>
                        )}
                      </div>
                      <p className="mt-1 truncate text-[13px] text-muted-foreground">
                        {collection.description || 'No description.'}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setOpenCollectionId(collection.id)
                          setCollectionDetail(null)
                          void loadCollectionDetail(collection.id)
                        }}
                        className={BUTTON_CLASS}
                      >
                        <Icon icon="ri:eye-line" className="h-3.5 w-3.5" />
                        View
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          await apiPost('/api/account/collections/share', {
                            id: collection.id,
                            enabled: collection.visibility !== 'shared',
                          })
                          toast(
                            collection.visibility === 'shared'
                              ? 'Collection private'
                              : 'Collection shared',
                          )
                          await loadOverview()
                        }}
                        className={BUTTON_CLASS}
                      >
                        <Icon
                          icon={
                            collection.visibility === 'shared' ? 'ri:lock-line' : 'ri:share-line'
                          }
                          className="h-3.5 w-3.5"
                        />
                        {collection.visibility === 'shared' ? 'Unshare' : 'Share'}
                      </button>
                      {collection.shareSlug && (
                        <a
                          href={`/shared/collections/${collection.shareSlug}`}
                          className={BUTTON_CLASS}
                        >
                          Open
                          <Icon icon="ri:external-link-line" className="h-3.5 w-3.5" />
                        </a>
                      )}
                      <ConfirmButton
                        label="Delete"
                        onConfirm={async () => {
                          await apiPost('/api/account/collections/delete', { id: collection.id })
                          toast('Collection deleted')
                          await loadOverview()
                        }}
                      />
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </section>
        )}

        {activeTab === 'searches' && (
          <section className="grid items-start gap-5 lg:grid-cols-[22rem_1fr]">
            <form
              className={cn(PANEL_CLASS, 'space-y-3')}
              onSubmit={async (event) => {
                event.preventDefault()
                await apiPost('/api/account/saved-searches', {
                  name: searchName,
                  query: searchQuery,
                  filters: {
                    language: searchLanguage,
                    topic: searchTopic,
                    minStars: Number.parseInt(searchMinStars, 10) || 0,
                    contributionReadyOnly: true,
                  },
                  alertEnabled: searchAlertsEnabled,
                })
                setSearchName('')
                setSearchQuery('')
                toast('Saved search created')
                await loadOverview()
              }}
            >
              <h2 className="text-sm font-semibold text-foreground">Saved search alerts</h2>
              <input
                value={searchName}
                onChange={(event) => setSearchName(event.target.value)}
                placeholder="Name"
                className={INPUT_CLASS}
              />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search text"
                className={INPUT_CLASS}
              />
              <input
                value={searchLanguage}
                onChange={(event) => setSearchLanguage(event.target.value)}
                placeholder="Language"
                className={INPUT_CLASS}
              />
              <input
                value={searchTopic}
                onChange={(event) => setSearchTopic(event.target.value)}
                placeholder="Topic"
                className={INPUT_CLASS}
              />
              <input
                value={searchMinStars}
                onChange={(event) => setSearchMinStars(event.target.value)}
                placeholder="Minimum stars"
                inputMode="numeric"
                className={INPUT_CLASS}
              />
              <label className={CHECKBOX_ROW_CLASS}>
                <input
                  type="checkbox"
                  checked={searchAlertsEnabled}
                  onChange={(event) => setSearchAlertsEnabled(event.target.checked)}
                  className="accent-primary"
                />
                Alert me when new repositories match
              </label>
              <div className="flex flex-col gap-2">
                <button type="submit" className={cn(PRIMARY_BUTTON_CLASS, 'w-full')}>
                  <Icon icon="ri:search-eye-line" className="h-4 w-4" />
                  Save search
                </button>
                <button
                  type="button"
                  disabled={searchPreviewLoading}
                  onClick={async () => {
                    setSearchPreviewLoading(true)
                    try {
                      const payload = await apiPost('/api/account/saved-searches/preview', {
                        query: searchQuery,
                        filters: {
                          language: searchLanguage,
                          topic: searchTopic,
                          minStars: Number.parseInt(searchMinStars, 10) || 0,
                          contributionReadyOnly: true,
                        },
                      })
                      setSearchPreview({
                        totalCount: payload.totalCount ?? 0,
                        items: payload.items ?? [],
                      })
                    } catch {
                    } finally {
                      setSearchPreviewLoading(false)
                    }
                  }}
                  className={cn(BUTTON_CLASS, 'w-full')}
                >
                  <Icon
                    icon={searchPreviewLoading ? 'ri:loader-4-line' : 'ri:eye-line'}
                    className={cn('h-4 w-4', searchPreviewLoading && 'animate-spin')}
                  />
                  Preview matches
                </button>
              </div>
              {searchPreview && (
                <div className="rounded-md border border-border/40 bg-background/40 px-3 py-2.5 text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">
                    {formatNumber(searchPreview.totalCount)}
                  </span>{' '}
                  {searchPreview.totalCount === 1 ? 'repository matches' : 'repositories match'}{' '}
                  right now.
                  {searchPreview.items.length > 0 && (
                    <ul className="mt-1.5 space-y-1">
                      {searchPreview.items.slice(0, 3).map((repo) => (
                        <li key={repo.opendeck_id ?? repoName(repo)} className="truncate">
                          <a
                            href={`/dashboard/repos/${repoName(repo)}`}
                            className="text-foreground transition-colors hover:text-primary"
                          >
                            {repoName(repo)}
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </form>
            {overview.savedSearches.length === 0 ? (
              <EmptyState
                icon="ri:search-eye-line"
                title="No saved searches"
                description="Save a search with language, topic or star filters and get alerts when new repositories match."
              />
            ) : (
              <motion.div
                variants={sectionStagger}
                initial="hidden"
                animate="show"
                className="space-y-3"
              >
                {overview.savedSearches.map((search) => (
                  <motion.div
                    key={search.id}
                    variants={sectionItem}
                    className={cn(
                      LIST_CARD_CLASS,
                      'flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between',
                    )}
                  >
                    <div className="min-w-0 sm:flex-1">
                      <div className="flex items-center gap-2.5">
                        <div className="truncate text-sm font-semibold text-foreground">
                          {search.name}
                        </div>
                        {search.alertEnabled && (
                          <span className="inline-flex shrink-0 items-center gap-1 rounded-sm border border-border/40 px-1.5 py-0.5 text-[11px] text-muted-foreground">
                            <Icon icon="ri:notification-3-line" className="h-3 w-3" />
                            Alerts on
                          </span>
                        )}
                      </div>
                      <div className="mt-1 truncate text-[13px] text-muted-foreground">
                        {search.query || 'Filter-only search'} · last checked{' '}
                        {formatWhen(search.lastCheckedAt)}
                      </div>
                    </div>
                    <ConfirmButton
                      label="Delete"
                      onConfirm={async () => {
                        await apiPost('/api/account/saved-searches/delete', { id: search.id })
                        toast('Saved search deleted')
                        await loadOverview()
                      }}
                    />
                  </motion.div>
                ))}
              </motion.div>
            )}
          </section>
        )}

        {activeTab === 'follows' && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-foreground">
              Followed repos and organizations
            </h2>
            {overview.follows.length === 0 ? (
              <EmptyState
                icon="ri:notification-3-line"
                title="Not following anything yet"
                description="Follow repositories or organizations from row details to track them here."
              >
                <a href="/dashboard" className={BUTTON_CLASS}>
                  Browse repositories
                  <Icon icon="ri:arrow-right-line" className="h-3.5 w-3.5" />
                </a>
              </EmptyState>
            ) : (
              <motion.div
                variants={sectionStagger}
                initial="hidden"
                animate="show"
                className="space-y-2"
              >
                {overview.follows.map((follow) => (
                  <motion.div
                    key={follow.id}
                    variants={sectionItem}
                    className={cn(
                      LIST_CARD_CLASS,
                      'flex items-center justify-between gap-3 px-4 py-3',
                    )}
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-2.5">
                      <Icon
                        icon={
                          follow.targetType === 'organization'
                            ? 'ri:building-line'
                            : 'ri:git-repository-line'
                        }
                        className="h-4 w-4 shrink-0 text-muted-foreground/70"
                      />
                      <a
                        href={
                          follow.targetType === 'organization'
                            ? `/dashboard/organizations?owner=${encodeURIComponent(follow.targetKey)}`
                            : `/dashboard/repos/${follow.targetKey}`
                        }
                        className="truncate text-sm font-semibold text-foreground transition-colors hover:text-primary"
                      >
                        {follow.targetKey}
                      </a>
                      <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">
                        {follow.targetType === 'organization' ? 'Organization' : 'Repository'} ·
                        followed {formatDate(follow.createdAt)}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        await apiPost('/api/account/follows', {
                          targetType: follow.targetType,
                          targetKey: follow.targetKey,
                          following: false,
                        })
                        toast('Follow removed')
                        await loadOverview()
                      }}
                      className={BUTTON_CLASS}
                    >
                      <Icon icon="ri:notification-off-line" className="h-3.5 w-3.5" />
                      Unfollow
                    </button>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </section>
        )}

        {activeTab === 'preferences' && (
          <form
            className="grid gap-4 lg:grid-cols-2"
            onSubmit={async (event) => {
              event.preventDefault()
              await apiPost('/api/account/preferences', preferencesDraft)
              toast('Preferences saved')
              await loadOverview()
            }}
          >
            <label className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Default language</span>
              <input
                value={preferencesDraft.defaultLanguage ?? ''}
                onChange={(event) =>
                  setPreferencesDraft({ ...preferencesDraft, defaultLanguage: event.target.value })
                }
                placeholder="typescript"
                className={INPUT_CLASS}
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Preferred languages</span>
              <input
                value={preferencesDraft.preferredLanguages.join(', ')}
                onChange={(event) =>
                  setPreferencesDraft({
                    ...preferencesDraft,
                    preferredLanguages: event.target.value.split(',').map((item) => item.trim()),
                  })
                }
                placeholder="typescript, go, rust"
                className={INPUT_CLASS}
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Preferred topics</span>
              <input
                value={preferencesDraft.preferredTopics.join(', ')}
                onChange={(event) =>
                  setPreferencesDraft({
                    ...preferencesDraft,
                    preferredTopics: event.target.value.split(',').map((item) => item.trim()),
                  })
                }
                className={INPUT_CLASS}
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Excluded languages</span>
              <input
                value={preferencesDraft.excludedLanguages.join(', ')}
                onChange={(event) =>
                  setPreferencesDraft({
                    ...preferencesDraft,
                    excludedLanguages: event.target.value.split(',').map((item) => item.trim()),
                  })
                }
                className={INPUT_CLASS}
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Excluded topics</span>
              <input
                value={preferencesDraft.excludedTopics.join(', ')}
                onChange={(event) =>
                  setPreferencesDraft({
                    ...preferencesDraft,
                    excludedTopics: event.target.value.split(',').map((item) => item.trim()),
                  })
                }
                className={INPUT_CLASS}
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Minimum stars</span>
              <input
                value={preferencesDraft.minStars}
                onChange={(event) =>
                  setPreferencesDraft({
                    ...preferencesDraft,
                    minStars: Number.parseInt(event.target.value, 10) || 0,
                  })
                }
                inputMode="numeric"
                className={INPUT_CLASS}
              />
            </label>
            <div className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Default sort</span>
              <Select
                value={preferencesDraft.defaultSort}
                onChange={(event) =>
                  setPreferencesDraft({ ...preferencesDraft, defaultSort: event.target.value })
                }
                options={[
                  { value: 'relevance', label: 'Relevance' },
                  { value: 'contribution', label: 'Contribution fit' },
                  { value: 'stars', label: 'Most stars' },
                  { value: 'forks', label: 'Most forks' },
                  { value: 'recent', label: 'Newest' },
                  { value: 'updated', label: 'Recently updated' },
                ]}
                placeholder="Default sort"
                clearable={false}
                ariaLabel="Default sort"
              />
            </div>
            <div className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Digest frequency</span>
              <Select
                value={preferencesDraft.digestFrequency}
                onChange={(event) =>
                  setPreferencesDraft({ ...preferencesDraft, digestFrequency: event.target.value })
                }
                ariaLabel="Digest frequency"
                options={[
                  { value: 'off', label: 'Off' },
                  { value: 'daily', label: 'Daily' },
                  { value: 'weekly', label: 'Weekly' },
                  { value: 'monthly', label: 'Monthly' },
                ]}
                placeholder="Digest frequency"
                clearable={false}
              />
            </div>
            {preferencesDraft.digestFrequency !== 'off' &&
              preferencesDraft.digestFrequency !== 'daily' && (
                <div className="space-y-1.5">
                  <span className="text-xs font-medium text-muted-foreground">Digest day</span>
                  <Select
                    value={String(preferencesDraft.digestDay)}
                    onChange={(event) =>
                      setPreferencesDraft({
                        ...preferencesDraft,
                        digestDay: Number.parseInt(event.target.value, 10) || 0,
                      })
                    }
                    options={[
                      { value: '1', label: 'Monday' },
                      { value: '2', label: 'Tuesday' },
                      { value: '3', label: 'Wednesday' },
                      { value: '4', label: 'Thursday' },
                      { value: '5', label: 'Friday' },
                      { value: '6', label: 'Saturday' },
                      { value: '0', label: 'Sunday' },
                    ]}
                    placeholder="Digest day"
                    clearable={false}
                    ariaLabel="Digest day"
                  />
                </div>
              )}
            <div className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Setup difficulty</span>
              <Select
                value={preferencesDraft.setupDifficulty}
                onChange={(event) =>
                  setPreferencesDraft({ ...preferencesDraft, setupDifficulty: event.target.value })
                }
                ariaLabel="Setup difficulty"
                options={[
                  { value: 'any', label: 'Any setup' },
                  { value: 'easy', label: 'Easy setup' },
                  { value: 'medium', label: 'Medium setup' },
                  { value: 'advanced', label: 'Advanced setup' },
                ]}
                placeholder="Setup difficulty"
                clearable={false}
              />
            </div>
            <div className="space-y-2 lg:col-span-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Filters and alerts
              </h3>
              <div className="grid gap-2 sm:grid-cols-2">
                <label className={CHECKBOX_ROW_CLASS}>
                  <input
                    type="checkbox"
                    checked={preferencesDraft.goodFirstAlertsEnabled}
                    onChange={(event) =>
                      setPreferencesDraft({
                        ...preferencesDraft,
                        goodFirstAlertsEnabled: event.target.checked,
                      })
                    }
                    className="accent-primary"
                  />
                  Alert me for good first issue signals
                </label>
                <label className={CHECKBOX_ROW_CLASS}>
                  <input
                    type="checkbox"
                    checked={preferencesDraft.emailDigestEnabled}
                    onChange={(event) =>
                      setPreferencesDraft({
                        ...preferencesDraft,
                        emailDigestEnabled: event.target.checked,
                      })
                    }
                    className="accent-primary"
                  />
                  Enable email digest
                </label>
                <label className={CHECKBOX_ROW_CLASS}>
                  <input
                    type="checkbox"
                    checked={preferencesDraft.excludeArchived}
                    onChange={(event) =>
                      setPreferencesDraft({
                        ...preferencesDraft,
                        excludeArchived: event.target.checked,
                      })
                    }
                    className="accent-primary"
                  />
                  Hide archived repositories
                </label>
                <label className={CHECKBOX_ROW_CLASS}>
                  <input
                    type="checkbox"
                    checked={preferencesDraft.excludeResourceLists}
                    onChange={(event) =>
                      setPreferencesDraft({
                        ...preferencesDraft,
                        excludeResourceLists: event.target.checked,
                      })
                    }
                    className="accent-primary"
                  />
                  Hide resource lists and low-signal collections
                </label>
                <label className={CHECKBOX_ROW_CLASS}>
                  <input
                    type="checkbox"
                    checked={preferencesDraft.excludeLowActivity}
                    onChange={(event) =>
                      setPreferencesDraft({
                        ...preferencesDraft,
                        excludeLowActivity: event.target.checked,
                      })
                    }
                    className="accent-primary"
                  />
                  Prefer recently active repositories
                </label>
                <label className={CHECKBOX_ROW_CLASS}>
                  <input
                    type="checkbox"
                    checked={preferencesDraft.includeLowIssueCount}
                    onChange={(event) =>
                      setPreferencesDraft({
                        ...preferencesDraft,
                        includeLowIssueCount: event.target.checked,
                      })
                    }
                    className="accent-primary"
                  />
                  Include repositories with few open issues
                </label>
                <label className={CHECKBOX_ROW_CLASS}>
                  <input
                    type="checkbox"
                    checked={preferencesDraft.privateProfile}
                    onChange={(event) =>
                      setPreferencesDraft({
                        ...preferencesDraft,
                        privateProfile: event.target.checked,
                      })
                    }
                    className="accent-primary"
                  />
                  Keep my profile private
                </label>
              </div>
            </div>
            <div className="lg:col-span-2">
              <button type="submit" className={PRIMARY_BUTTON_CLASS}>
                <Icon icon="ri:save-3-line" className="h-4 w-4" />
                Save preferences
              </button>
            </div>
          </form>
        )}

        {activeTab === 'integrations' && (
          <motion.section
            variants={sectionStagger}
            initial="hidden"
            animate="show"
            className="grid gap-5"
          >
            <motion.div variants={sectionItem} className={cn(PANEL_CLASS, 'space-y-3')}>
              <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Icon icon="ri:mail-send-line" className="h-4 w-4 text-muted-foreground" />
                Email delivery
              </h2>
              {overview.emailDeliveries.length === 0 ? (
                <div className="rounded-md border border-dashed border-border/50 px-3 py-5 text-center text-sm text-muted-foreground">
                  No email deliveries yet. Enable digests in Preferences to start receiving them.
                </div>
              ) : (
                <div className="space-y-2">
                  {overview.emailDeliveries.map((delivery) => (
                    <div
                      key={delivery.id}
                      className="rounded-md border border-border/40 bg-background/40 p-3 text-sm transition-colors hover:border-border/60"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="truncate text-foreground">{delivery.subject}</span>
                        <span
                          className={cn(
                            'shrink-0 rounded-sm border px-1.5 py-0.5 text-[11px] font-medium capitalize',
                            delivery.status === 'sent'
                              ? 'border-success/30 bg-success/10 text-success'
                              : delivery.status === 'failed'
                                ? 'border-destructive/30 bg-destructive/10 text-destructive'
                                : 'border-border/40 text-muted-foreground',
                          )}
                        >
                          {delivery.status}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {delivery.type} · {delivery.provider || 'not configured'} ·{' '}
                        {formatDate(delivery.createdAt)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </motion.section>
        )}

        {activeTab === 'security' && (
          <motion.section
            variants={sectionStagger}
            initial="hidden"
            animate="show"
            className="grid gap-5 xl:grid-cols-2"
          >
            <motion.form
              variants={sectionItem}
              className={cn(PANEL_CLASS, 'space-y-3')}
              onSubmit={async (event) => {
                event.preventDefault()
                const payload = await apiPost('/api/account/profile', {
                  name: profileName,
                  email: profileEmail,
                })
                await refreshSession()
                toast('Profile updated')
                setOverview({ ...overview, user: payload.user })
              }}
            >
              <h2 className="text-sm font-semibold text-foreground">Profile</h2>
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">Name</span>
                <input
                  value={profileName}
                  onChange={(event) => setProfileName(event.target.value)}
                  autoComplete="name"
                  className={INPUT_CLASS}
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">Email</span>
                <input
                  type="email"
                  value={profileEmail}
                  onChange={(event) => setProfileEmail(event.target.value)}
                  autoComplete="email"
                  className={INPUT_CLASS}
                />
              </label>
              <button type="submit" className={cn(PRIMARY_BUTTON_CLASS, 'mt-auto self-start')}>
                Save profile
              </button>
            </motion.form>

            <motion.div variants={sectionItem} className={cn(PANEL_CLASS, 'space-y-3')}>
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-foreground">Email verification</h2>
                <span
                  className={cn(
                    'inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 text-[11px] font-medium',
                    overview.user.emailVerifiedAt
                      ? 'border-success/30 bg-success/10 text-success'
                      : 'border-border/40 text-muted-foreground',
                  )}
                >
                  <Icon
                    icon={
                      overview.user.emailVerifiedAt
                        ? 'ri:checkbox-circle-line'
                        : 'ri:error-warning-line'
                    }
                    className="h-3 w-3"
                  />
                  {overview.user.emailVerifiedAt ? 'Verified' : 'Not verified'}
                </span>
              </div>
              {overview.user.emailVerifiedAt ? (
                <p className="text-sm text-muted-foreground">
                  Your email address is verified. Alerts and digests will be delivered to{' '}
                  <span className="text-foreground">{overview.user.email}</span>.
                </p>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    Request a verification link for{' '}
                    <span className="text-foreground">{overview.user.email}</span>. Local
                    development can still paste the token below.
                  </p>
                  <input
                    value={verificationToken}
                    onChange={(event) => setVerificationToken(event.target.value)}
                    placeholder="Verification token"
                    aria-label="Verification token"
                    className={INPUT_CLASS}
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        const payload = await apiPost('/api/account/email-verification/request', {})
                        if (payload.devToken) setVerificationToken(payload.devToken)
                        toast('Verification email requested')
                      }}
                      className={cn(BUTTON_CLASS, 'flex-1')}
                    >
                      Request link
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        await apiPost('/api/account/email-verification/verify', {
                          token: verificationToken,
                        })
                        await refreshSession()
                        toast('Email verified')
                        await loadOverview()
                      }}
                      className={cn(PRIMARY_BUTTON_CLASS, 'flex-1')}
                    >
                      Verify
                    </button>
                  </div>
                </>
              )}
            </motion.div>

            <motion.div variants={sectionItem} className={cn(PANEL_CLASS, 'space-y-3')}>
              <h2 className="text-sm font-semibold text-foreground">Sessions</h2>
              <div className="space-y-2">
                {overview.sessions.map((session) => (
                  <div
                    key={session.id}
                    className="rounded-md border border-border/40 bg-background/40 p-3 text-sm transition-colors hover:border-border/60"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="truncate text-foreground">
                        {session.userAgent || 'Unknown client'}
                      </span>
                      {session.current && (
                        <span className="shrink-0 rounded-sm border border-success/30 bg-success/10 px-1.5 py-0.5 text-[11px] font-medium text-success">
                          Current
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Last seen {formatWhen(session.lastSeenAt)}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    await apiPost('/api/account/sessions/sign-out-all', {})
                    toast('Other sessions signed out')
                    await loadOverview()
                  }}
                  className={BUTTON_CLASS}
                >
                  Sign out other devices
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await apiPost('/api/account/sessions/sign-out-all', { includeCurrent: true })
                    await signOut()
                  }}
                  className={BUTTON_CLASS}
                >
                  Sign out everywhere
                </button>
              </div>
            </motion.div>

            <motion.form
              variants={sectionItem}
              className="space-y-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 xl:col-span-2"
              onSubmit={async (event) => {
                event.preventDefault()
                await apiPost('/api/account/delete', { confirmEmail: deleteConfirm })
                await signOut()
              }}
            >
              <h2 className="flex items-center gap-2 text-sm font-semibold text-destructive">
                <Icon icon="ri:alert-line" className="h-4 w-4" />
                Delete account
              </h2>
              <p className="text-sm text-muted-foreground">
                This removes your saved repos, collections, follows, preferences and sessions. Type
                your account email to confirm.
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  type="email"
                  value={deleteConfirm}
                  onChange={(event) => setDeleteConfirm(event.target.value)}
                  placeholder={overview.user.email}
                  autoComplete="off"
                  className={INPUT_CLASS}
                />
                <button
                  type="submit"
                  className="inline-flex h-9 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md border border-destructive/40 bg-destructive/10 px-4 text-sm font-medium text-destructive transition hover:bg-destructive/20 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60"
                >
                  <Icon icon="ri:delete-bin-line" className="h-4 w-4" />
                  Delete
                </button>
              </div>
            </motion.form>
          </motion.section>
        )}
      </motion.div>
    </PageShell>
  )
}
