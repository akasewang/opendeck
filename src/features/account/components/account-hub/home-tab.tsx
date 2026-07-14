'use client'

import { Icon } from '@iconify/react'
import { AnimatePresence, motion, type Variants } from 'framer-motion'
import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { DataPanel as Panel, DataPanelEmpty as PanelEmpty } from '@/components/ui/data-panel'
import { EmptyState } from '@/components/ui/empty-state'
import { Input } from '@/components/ui/input'
import Select from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from '@/components/ui/toast'
import { API_ROUTES, appRoute } from '@/config/routes'
import { MOTION_SPRING } from '@/config/motion'
import {
  ACCOUNT_HUB_ICON_BUTTON_CLASS,
  ACCOUNT_HUB_LIST_CARD_CLASS,
  ACCOUNT_HUB_LIST_ITEM_EXIT,
  ACCOUNT_HUB_LIST_ITEM_LAYOUT,
  ACCOUNT_HUB_SECTION_ITEM,
  ACCOUNT_HUB_SECTION_STAGGER,
} from '@/features/account/components/account-hub/account-hub-elements'
import type { AccountHubTabId } from '@/features/account/constants/account-hub'
import { postAccountApi } from '@/features/account/api/account-api-client'
import type { AccountOverview } from '@/features/account/types/account-hub'
import {
  formatWhen,
  recommendationKey,
  repositoryName,
} from '@/features/account/utils/account-formatters'
import type { RepositoryApiItem } from '@/features/repositories/types/repository'
import { formatNumber } from '@/utils/format-number'
import { cn } from '@/utils/cn'

const DISMISS_BUTTON_VARIANTS: Variants = {
  rest: { scale: 1 },
  hover: { scale: 1.06 },
  tap: { scale: 0.9 },
}

const DISMISS_ICON_VARIANTS: Variants = {
  rest: { rotate: 0 },
  hover: { rotate: 90 },
  tap: { rotate: 90 },
}

export function HomeTab({
  overview,
  onboardingSkill,
  setOnboardingSkill,
  onboardingHours,
  setOnboardingHours,
  onboardingGoals,
  setOnboardingGoals,
  onboardingLanguages,
  setOnboardingLanguages,
  onboardingTopics,
  setOnboardingTopics,
  selectTab,
  updateRepo,
  loadOverview,
  recommendationsHasMore,
  isLoadingMoreRecommendations,
  loadMoreRecommendations,
}: {
  overview: AccountOverview
  onboardingSkill: string
  setOnboardingSkill: (value: string) => void
  onboardingHours: string
  setOnboardingHours: (value: string) => void
  onboardingGoals: string
  setOnboardingGoals: (value: string) => void
  onboardingLanguages: string
  setOnboardingLanguages: (value: string) => void
  onboardingTopics: string
  setOnboardingTopics: (value: string) => void
  selectTab: (tab: AccountHubTabId) => void
  updateRepo: (repo: RepositoryApiItem, patch: Record<string, unknown>) => Promise<void>
  loadOverview: () => Promise<void>
  recommendationsHasMore: boolean
  isLoadingMoreRecommendations: boolean
  loadMoreRecommendations: () => Promise<void>
}) {
  return (
    <div className="grid gap-5 xl:grid-cols-[1.7fr_1fr]">
      {!overview.onboarding.completedAt && (
        <OnboardingPanel
          onboardingSkill={onboardingSkill}
          setOnboardingSkill={setOnboardingSkill}
          onboardingHours={onboardingHours}
          setOnboardingHours={setOnboardingHours}
          onboardingGoals={onboardingGoals}
          setOnboardingGoals={setOnboardingGoals}
          onboardingLanguages={onboardingLanguages}
          setOnboardingLanguages={setOnboardingLanguages}
          onboardingTopics={onboardingTopics}
          setOnboardingTopics={setOnboardingTopics}
          loadOverview={loadOverview}
        />
      )}

      <RecommendationsPanel
        recommendations={overview.recommendations}
        selectTab={selectTab}
        updateRepo={updateRepo}
        hasMore={recommendationsHasMore}
        isLoadingMore={isLoadingMoreRecommendations}
        onLoadMore={loadMoreRecommendations}
      />

      <div className="flex h-[40rem] flex-col gap-5">
        <AlertsPanel overview={overview} loadOverview={loadOverview} />
        <RecentViewsPanel overview={overview} />
      </div>
    </div>
  )
}

function OnboardingPanel({
  onboardingSkill,
  setOnboardingSkill,
  onboardingHours,
  setOnboardingHours,
  onboardingGoals,
  setOnboardingGoals,
  onboardingLanguages,
  setOnboardingLanguages,
  onboardingTopics,
  setOnboardingTopics,
  loadOverview,
}: {
  onboardingSkill: string
  setOnboardingSkill: (value: string) => void
  onboardingHours: string
  setOnboardingHours: (value: string) => void
  onboardingGoals: string
  setOnboardingGoals: (value: string) => void
  onboardingLanguages: string
  setOnboardingLanguages: (value: string) => void
  onboardingTopics: string
  setOnboardingTopics: (value: string) => void
  loadOverview: () => Promise<void>
}) {
  const [isSaving, setIsSaving] = useState(false)

  return (
    <Panel
      icon="ri:user-settings-line"
      title="Personalize OpenDeck"
      scrollable={false}
      className="xl:col-span-2"
      bodyClassName="p-4"
    >
      <form
        className="space-y-4"
        onSubmit={async (event) => {
          event.preventDefault()
          if (isSaving) return
          setIsSaving(true)
          try {
            await postAccountApi(API_ROUTES.account.onboarding, {
              skillLevel: onboardingSkill,
              weeklyHours: onboardingHours,
              goals: onboardingGoals,
              languages: onboardingLanguages,
              topics: onboardingTopics,
            })
            toast('Onboarding saved')
            await loadOverview()
          } catch {
            // The shared API client already reports the server error.
          } finally {
            setIsSaving(false)
          }
        }}
      >
        <p className="text-sm text-muted-foreground">
          Tell us how you contribute and we will tune recommendations to match.
        </p>
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
            <Input
              value={onboardingHours}
              onChange={(event) => setOnboardingHours(event.target.value)}
              placeholder="4"
              inputMode="numeric"
            />
          </label>
          <label className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">Languages</span>
            <Input
              value={onboardingLanguages}
              onChange={(event) => setOnboardingLanguages(event.target.value)}
              placeholder="typescript, go"
            />
          </label>
          <label className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">Topics</span>
            <Input
              value={onboardingTopics}
              onChange={(event) => setOnboardingTopics(event.target.value)}
              placeholder="cli, devtools"
            />
          </label>
          <label className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">Goals</span>
            <Input
              value={onboardingGoals}
              onChange={(event) => setOnboardingGoals(event.target.value)}
              placeholder="first PR, learn OSS"
            />
          </label>
        </div>
        <Button type="submit" variant="primary" disabled={isSaving}>
          <Icon
            icon={isSaving ? 'ri:loader-4-line' : 'ri:save-line'}
            className={cn('h-4 w-4', isSaving && 'animate-spin')}
          />
          {isSaving ? 'Saving...' : 'Save onboarding'}
        </Button>
      </form>
    </Panel>
  )
}

function RecommendationRowSkeleton() {
  return (
    <div className="flex items-center gap-3 px-3.5 py-3">
      <Skeleton className="h-6 w-6 shrink-0 rounded-md" />
      <div className="min-w-0 flex-1 space-y-1.5">
        <Skeleton className="h-3.5 w-40 max-w-full" />
        <Skeleton className="h-3 w-56 max-w-full" />
      </div>
      <Skeleton className="h-8 w-16 shrink-0 rounded-md" />
      <Skeleton className="h-8 w-8 shrink-0 rounded-md" />
    </div>
  )
}

function RecommendationsPanel({
  recommendations,
  selectTab,
  updateRepo,
  hasMore,
  isLoadingMore,
  onLoadMore,
}: {
  recommendations: RepositoryApiItem[]
  selectTab: (tab: AccountHubTabId) => void
  updateRepo: (repo: RepositoryApiItem, patch: Record<string, unknown>) => Promise<void>
  hasMore: boolean
  isLoadingMore: boolean
  onLoadMore: () => Promise<void>
}) {
  const loadMoreRef = useRef<HTMLDivElement | null>(null)
  const [scrollNode, setScrollNode] = useState<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!hasMore || isLoadingMore) return
    const node = loadMoreRef.current
    if (!node || !scrollNode) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) void onLoadMore()
      },
      { root: scrollNode, rootMargin: '0px 0px 320px 0px' },
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [hasMore, isLoadingMore, onLoadMore, scrollNode])

  return (
    <Panel
      icon="ri:compass-3-line"
      title="Recommended for you"
      count={recommendations.length}
      className="h-[40rem]"
      bodyClassName="p-3"
      viewportRef={setScrollNode}
      right={
        <button
          type="button"
          onClick={() => selectTab('preferences')}
          className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          Tune preferences
        </button>
      }
    >
      {recommendations.length === 0 && !isLoadingMore ? (
        <PanelEmpty>
          <EmptyState
            icon="ri:compass-3-line"
            title="No recommendations yet"
            description="Set preferred languages and topics in Preferences to get tailored repositories."
          >
            <Button onClick={() => selectTab('preferences')}>Open preferences</Button>
          </EmptyState>
        </PanelEmpty>
      ) : (
        <motion.div
          variants={ACCOUNT_HUB_SECTION_STAGGER}
          initial="hidden"
          animate="show"
          className="relative space-y-2"
        >
          <AnimatePresence mode="popLayout">
            {recommendations.map((repo) => {
              const fullName = repositoryName(repo)
              const avatar = repo.owner?.avatar_url
              return (
                <motion.div
                  key={recommendationKey(repo)}
                  layout
                  variants={ACCOUNT_HUB_SECTION_ITEM}
                  exit={ACCOUNT_HUB_LIST_ITEM_EXIT}
                  transition={{ layout: ACCOUNT_HUB_LIST_ITEM_LAYOUT }}
                  className={cn(ACCOUNT_HUB_LIST_CARD_CLASS, 'flex items-center gap-3 px-3.5 py-3')}
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
                        href={appRoute.repository(fullName)}
                        className="truncate text-sm font-semibold text-foreground transition-colors hover:text-primary"
                      >
                        {fullName}
                      </a>
                      <span className="inline-flex shrink-0 items-center gap-1 font-mono text-xs tabular-nums text-muted-foreground">
                        <Icon icon="ri:star-line" className="h-3 w-3" />
                        {formatNumber(repo.stargazers_count ?? 0)}
                      </span>
                    </div>
                    <p className="mt-0.5 text-pretty text-[13px] text-muted-foreground">
                      {repo.description || 'No description available.'}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <motion.button
                      type="button"
                      onClick={() => updateRepo(repo, { saved: true })}
                      whileTap={{ scale: 0.94 }}
                      transition={MOTION_SPRING.dismiss}
                      className="inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-md bg-primary px-2.5 text-xs font-medium text-primary-foreground transition hover:opacity-90"
                    >
                      <Icon icon="ri:bookmark-line" className="h-3.5 w-3.5" />
                      Save
                    </motion.button>
                    <motion.button
                      type="button"
                      onClick={() => updateRepo(repo, { dismissed: true })}
                      aria-label={`Dismiss ${fullName}`}
                      title="Dismiss"
                      initial="rest"
                      animate="rest"
                      whileHover="hover"
                      whileTap="tap"
                      variants={DISMISS_BUTTON_VARIANTS}
                      transition={MOTION_SPRING.compact}
                      className={cn(ACCOUNT_HUB_ICON_BUTTON_CLASS, 'active:scale-100')}
                    >
                      <motion.span variants={DISMISS_ICON_VARIANTS} className="flex">
                        <Icon icon="ri:close-line" className="h-4 w-4" />
                      </motion.span>
                    </motion.button>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
          {isLoadingMore && (
            <div className="space-y-2">
              {Array.from({ length: 3 }, (_, index) => (
                <RecommendationRowSkeleton key={index} />
              ))}
            </div>
          )}
          {hasMore && <div ref={loadMoreRef} aria-hidden="true" className="h-px" />}
        </motion.div>
      )}
    </Panel>
  )
}

function AlertsPanel({
  overview,
  loadOverview,
}: {
  overview: AccountOverview
  loadOverview: () => Promise<void>
}) {
  const [isMarkingRead, setIsMarkingRead] = useState(false)

  return (
    <Panel
      icon="ri:alarm-line"
      title="Alerts"
      count={overview.stats.unreadAlerts}
      className="flex-1"
      right={
        overview.stats.unreadAlerts > 0 ? (
          <button
            type="button"
            disabled={isMarkingRead}
            onClick={async () => {
              if (isMarkingRead) return
              setIsMarkingRead(true)
              try {
                await postAccountApi(API_ROUTES.account.alertsRead, {})
                toast('Alerts marked as read')
                await loadOverview()
              } catch {
                // The shared API client already reports the server error.
              } finally {
                setIsMarkingRead(false)
              }
            }}
            className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-60"
          >
            {isMarkingRead ? 'Marking...' : 'Mark all read'}
          </button>
        ) : undefined
      }
    >
      {overview.alerts.length === 0 ? (
        <PanelEmpty>
          <p className="max-w-[16rem] text-center text-sm text-muted-foreground">
            No alerts yet. Save repositories or create saved searches to get them.
          </p>
        </PanelEmpty>
      ) : (
        <div className="divide-y divide-border/40">
          {overview.alerts.map((alert) => (
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
    </Panel>
  )
}

function RecentViewsPanel({ overview }: { overview: AccountOverview }) {
  return (
    <Panel
      icon="ri:history-line"
      title="Recently viewed"
      count={overview.recentViews.length}
      className="flex-1"
    >
      {overview.recentViews.length === 0 ? (
        <PanelEmpty>
          <p className="max-w-[16rem] text-center text-sm text-muted-foreground">
            Repositories and organizations you open will show up here.
          </p>
        </PanelEmpty>
      ) : (
        <div className="divide-y divide-border/40">
          {overview.recentViews.map((view) => (
            <a
              key={view.id}
              href={
                view.targetType === 'organization'
                  ? appRoute.organization(view.targetKey)
                  : appRoute.repository(view.targetKey)
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
    </Panel>
  )
}
