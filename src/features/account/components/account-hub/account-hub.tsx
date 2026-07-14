'use client'

import { Icon } from '@iconify/react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorBanner } from '@/components/ui/error-banner'
import { Skeleton } from '@/components/ui/skeleton'
import { MOTION_SPRING } from '@/config/motion'
import { API_ROUTES, withQuery } from '@/config/routes'
import {
  ACCOUNT_HUB_SECTION_STAGGER,
  TabCard,
} from '@/features/account/components/account-hub/account-hub-elements'
import { CollectionsTab } from '@/features/account/components/account-hub/collections-tab'
import { FollowsTab } from '@/features/account/components/account-hub/follows-tab'
import { HomeTab } from '@/features/account/components/account-hub/home-tab'
import { IntegrationsTab } from '@/features/account/components/account-hub/integrations-tab'
import { IssuesTab } from '@/features/account/components/account-hub/issues-tab'
import { LibraryTab } from '@/features/account/components/account-hub/library-tab'
import { PipelineTab } from '@/features/account/components/account-hub/pipeline-tab'
import { PreferencesTab } from '@/features/account/components/account-hub/preferences-tab'
import { SavedSearchesTab } from '@/features/account/components/account-hub/saved-searches-tab'
import { SecurityTab } from '@/features/account/components/account-hub/security-tab'
import { ACCOUNT_HUB_TABS, type AccountHubTabId } from '@/features/account/constants/account-hub'
import { useAccountHub } from '@/features/account/hooks/use-account-hub'
import PageHeader, { PageHeaderSkeleton } from '@/features/dashboard/components/page-header'
import PageShell from '@/features/dashboard/components/page-shell'

function AccountHubTabSkeleton({ tab }: { tab: AccountHubTabId }) {
  switch (tab) {
    case 'home':
      return (
        <div className="grid gap-5 xl:grid-cols-[1.7fr_1fr]">
          <Skeleton className="h-[40rem]" />
          <div className="flex h-[40rem] flex-col gap-5">
            <Skeleton className="flex-1" />
            <Skeleton className="flex-1" />
          </div>
        </div>
      )
    case 'pipeline':
      return (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <Skeleton className="h-[28rem]" />
          <Skeleton className="h-[28rem]" />
          <Skeleton className="h-[28rem]" />
          <Skeleton className="h-[28rem]" />
        </div>
      )
    case 'collections':
      return (
        <div className="grid gap-5 lg:grid-cols-[22rem_1fr]">
          <Skeleton className="h-[30rem]" />
          <Skeleton className="h-[30rem]" />
        </div>
      )
    case 'searches':
      return (
        <div className="grid gap-5 lg:grid-cols-[22rem_1fr]">
          <Skeleton className="h-[28rem]" />
          <Skeleton className="h-[28rem]" />
        </div>
      )
    case 'preferences':
      return <Skeleton className="h-[46rem]" />
    case 'security':
      return (
        <div className="grid gap-5">
          <Skeleton className="h-[18rem]" />
          <Skeleton className="h-[24rem]" />
          <Skeleton className="h-[10.5rem]" />
        </div>
      )
    default:
      return <Skeleton className="h-[28rem]" />
  }
}

export default function AccountHub() {
  const hub = useAccountHub()

  if (hub.isInitialLoading) {
    return (
      <PageShell aria-busy="true" className="space-y-5">
        <h1 className="sr-only">Loading My Deck</h1>
        <PageHeaderSkeleton actionClassName="h-9 w-40" />
        <Skeleton className="h-[4.25rem]" />
        <AccountHubTabSkeleton tab={hub.activeTab} />
      </PageShell>
    )
  }

  if (!hub.user) {
    return (
      <PageShell>
        <h1 className="sr-only">My Deck</h1>
        <EmptyState
          icon="ri:user-shared-line"
          title="Sign in to open My Deck"
          description="Save repositories, build collections, manage your contribution pipeline and tune recommendations."
          className="mx-auto mt-10 max-w-xl py-14"
        >
          <Button variant="primary" onClick={() => hub.openAuth()}>
            <Icon icon="ri:login-circle-line" className="h-4 w-4" />
            Sign in
          </Button>
        </EmptyState>
      </PageShell>
    )
  }

  if (hub.error) {
    return (
      <PageShell>
        <h1 className="sr-only">My Deck</h1>
        <ErrorBanner message={hub.error} onRetry={() => void hub.loadOverview()} />
      </PageShell>
    )
  }

  if (!hub.overview || !hub.preferencesDraft) return null

  const overview = hub.overview
  const preferencesDraft = hub.preferencesDraft
  const tabMeta: Record<AccountHubTabId, { value?: number; hint?: string }> = {
    home: { hint: 'Overview' },
    library: { value: overview.stats.saved },
    pipeline: { value: overview.stats.pipeline },
    issues: { value: hub.issues.length },
    collections: { value: overview.stats.collections },
    searches: { value: overview.savedSearches.length },
    follows: { value: overview.stats.follows },
    integrations: { value: overview.emailDeliveries.length },
    preferences: { hint: 'Settings' },
    security: { hint: 'Account' },
  }

  return (
    <PageShell className="space-y-5">
      <PageHeader
        title="My Deck"
        description="Saved repositories, contribution tracking and personal recommendations."
        actions={
          <>
            <Button
              onClick={() => {
                window.location.href = withQuery(API_ROUTES.account.export, { format: 'csv' })
              }}
            >
              <Icon icon="ri:file-download-line" className="h-4 w-4" />
              CSV
            </Button>
            <Button
              onClick={() => {
                window.location.href = withQuery(API_ROUTES.account.export, { format: 'json' })
              }}
            >
              <Icon icon="ri:braces-line" className="h-4 w-4" />
              JSON
            </Button>
          </>
        }
      />

      <nav
        aria-label="My Deck sections"
        className="overflow-hidden rounded-lg border border-border/50 bg-border/30"
      >
        <motion.div
          variants={ACCOUNT_HUB_SECTION_STAGGER}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 gap-px md:grid-cols-5"
        >
          {ACCOUNT_HUB_TABS.map((tab) => {
            const meta = tabMeta[tab.id]
            return (
              <TabCard
                key={tab.id}
                label={tab.label}
                icon={tab.icon}
                value={meta.value}
                hint={meta.hint}
                active={hub.activeTab === tab.id}
                onSelect={() => hub.selectTab(tab.id)}
              />
            )
          })}
        </motion.div>
      </nav>

      <motion.div
        key={hub.activeTab}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={MOTION_SPRING.standard}
        className="space-y-5"
      >
        {hub.activeTab === 'home' && (
          <HomeTab
            overview={overview}
            onboardingSkill={hub.onboardingSkill}
            setOnboardingSkill={hub.setOnboardingSkill}
            onboardingHours={hub.onboardingHours}
            setOnboardingHours={hub.setOnboardingHours}
            onboardingGoals={hub.onboardingGoals}
            setOnboardingGoals={hub.setOnboardingGoals}
            onboardingLanguages={hub.onboardingLanguages}
            setOnboardingLanguages={hub.setOnboardingLanguages}
            onboardingTopics={hub.onboardingTopics}
            setOnboardingTopics={hub.setOnboardingTopics}
            selectTab={hub.selectTab}
            updateRepo={hub.updateRepo}
            loadOverview={hub.loadOverview}
            recommendationsHasMore={hub.recommendationsHasMore}
            isLoadingMoreRecommendations={hub.isLoadingMoreRecommendations}
            loadMoreRecommendations={hub.loadMoreRecommendations}
          />
        )}

        {hub.activeTab === 'library' && (
          <LibraryTab savedRepos={overview.savedRepos} updateRepo={hub.updateRepo} />
        )}

        {hub.activeTab === 'pipeline' && <PipelineTab pipelineGroups={hub.pipelineGroups} />}

        {hub.activeTab === 'issues' && (
          <IssuesTab
            issues={hub.issues}
            issuesLoading={hub.issuesLoading}
            loadIssues={hub.loadIssues}
            selectTab={hub.selectTab}
          />
        )}

        {hub.activeTab === 'collections' && (
          <CollectionsTab
            overview={overview}
            openCollectionId={hub.openCollectionId}
            collectionDetail={hub.collectionDetail}
            collectionDetailLoading={hub.collectionDetailLoading}
            collectionExcludedRepoNames={hub.collectionExcludedRepoNames}
            collectionName={hub.collectionName}
            setCollectionName={hub.setCollectionName}
            collectionDescription={hub.collectionDescription}
            setCollectionDescription={hub.setCollectionDescription}
            setOpenCollectionId={hub.setOpenCollectionId}
            setCollectionDetail={hub.setCollectionDetail}
            loadCollectionDetail={hub.loadCollectionDetail}
            loadOverview={hub.loadOverview}
            removeCollection={hub.removeCollection}
            removeCollectionItem={hub.removeCollectionItem}
          />
        )}

        {hub.activeTab === 'searches' && (
          <SavedSearchesTab
            savedSearches={overview.savedSearches}
            searchName={hub.searchName}
            setSearchName={hub.setSearchName}
            searchQuery={hub.searchQuery}
            setSearchQuery={hub.setSearchQuery}
            searchLanguage={hub.searchLanguage}
            setSearchLanguage={hub.setSearchLanguage}
            searchTopic={hub.searchTopic}
            setSearchTopic={hub.setSearchTopic}
            searchMinStars={hub.searchMinStars}
            setSearchMinStars={hub.setSearchMinStars}
            searchAlertsEnabled={hub.searchAlertsEnabled}
            setSearchAlertsEnabled={hub.setSearchAlertsEnabled}
            searchPreview={hub.searchPreview}
            setSearchPreview={hub.setSearchPreview}
            searchPreviewLoading={hub.searchPreviewLoading}
            setSearchPreviewLoading={hub.setSearchPreviewLoading}
            removeSavedSearch={hub.removeSavedSearch}
            loadOverview={hub.loadOverview}
          />
        )}

        {hub.activeTab === 'follows' && (
          <FollowsTab follows={overview.follows} removeFollow={hub.removeFollow} />
        )}

        {hub.activeTab === 'preferences' && (
          <PreferencesTab
            preferencesDraft={preferencesDraft}
            setPreferencesDraft={hub.setPreferencesDraft}
            loadOverview={hub.loadOverview}
            resetRecommendationsPagination={hub.resetRecommendationsPagination}
          />
        )}

        {hub.activeTab === 'integrations' && (
          <IntegrationsTab emailDeliveries={overview.emailDeliveries} />
        )}

        {hub.activeTab === 'security' && (
          <SecurityTab
            overview={overview}
            setOverview={hub.setOverview}
            profileName={hub.profileName}
            setProfileName={hub.setProfileName}
            profileEmail={hub.profileEmail}
            setProfileEmail={hub.setProfileEmail}
            deleteConfirm={hub.deleteConfirm}
            setDeleteConfirm={hub.setDeleteConfirm}
            refreshSession={hub.refreshSession}
            signOut={hub.signOut}
            loadOverview={hub.loadOverview}
            removeSession={hub.removeSession}
          />
        )}
      </motion.div>
    </PageShell>
  )
}
