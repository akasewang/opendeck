'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from '@/components/ui/toast'
import { API_ROUTES, appRoute, withQuery } from '@/config/routes'
import { ACCOUNT_HUB_TABS, type AccountHubTabId } from '@/features/account/constants/account-hub'
import { postAccountApi } from '@/features/account/api/account-api-client'
import type {
  AccountHubCollectionDetail,
  AccountHubRepoWithState,
  AccountHubSearchPreview,
  AccountOverview,
} from '@/features/account/types/account-hub'
import {
  recommendationKey,
  repositoryName,
  repositoryUpdateMessage,
} from '@/features/account/utils/account-formatters'
import { restoreListItem } from '@/features/account/utils/optimistic-list'
import {
  isAccountCollectionDetail,
  isAccountIssueList,
  isAccountOverview,
  isAccountRecommendationPage,
} from '@/features/account/utils/account-response-validation'
import { useAuth } from '@/features/auth/providers/auth-provider'
import type { RepositoryApiItem } from '@/features/repositories/types/repository'
import { isRecord } from '@/lib/api/input-normalization'
import { apiErrorMessage } from '@/lib/api/errors'

export function useAccountHub() {
  const { user, isLoading: authLoading, openAuth, refreshSession, signOut } = useAuth()
  const activeUserIdRef = useRef<string | null>(null)
  const [activeTab, setActiveTab] = useState<AccountHubTabId>('home')
  const router = useRouter()
  const searchParams = useSearchParams()

  const [overview, setOverview] = useState<AccountOverview | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [collectionName, setCollectionName] = useState('')
  const [collectionDescription, setCollectionDescription] = useState('')
  const [profileName, setProfileName] = useState('')
  const [profileEmail, setProfileEmail] = useState('')
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
  const [collectionDetail, setCollectionDetail] = useState<AccountHubCollectionDetail | null>(null)
  const [collectionDetailLoading, setCollectionDetailLoading] = useState(false)
  const [searchPreview, setSearchPreview] = useState<AccountHubSearchPreview | null>(null)
  const [searchPreviewLoading, setSearchPreviewLoading] = useState(false)
  const [issues, setIssues] = useState<NonNullable<AccountOverview['issues']>>([])
  const [issuesLoaded, setIssuesLoaded] = useState(false)
  const [issuesLoading, setIssuesLoading] = useState(false)
  const [preferencesDraft, setPreferencesDraft] = useState<AccountOverview['preferences'] | null>(
    null,
  )
  const [recommendationsPage, setRecommendationsPage] = useState(1)
  const [recommendationsHasMore, setRecommendationsHasMore] = useState(false)
  const [isLoadingMoreRecommendations, setIsLoadingMoreRecommendations] = useState(false)
  const recommendationsPageRef = useRef(1)
  const loadMoreRecommendationsInFlightRef = useRef(false)
  const collectionRequestRef = useRef(0)

  useEffect(() => {
    const tab = searchParams.get('tab')
    setActiveTab(
      tab && ACCOUNT_HUB_TABS.some((item) => item.id === tab) ? (tab as AccountHubTabId) : 'home',
    )
  }, [searchParams])

  const selectTab = useCallback(
    (tab: AccountHubTabId) => {
      setActiveTab(tab)
      setOpenCollectionId(null)
      setCollectionDetail(null)
      collectionRequestRef.current += 1
      router.replace(appRoute.accountTab(tab), {
        scroll: false,
      })
    },
    [router],
  )

  const loadCollectionDetail = useCallback(async (id: string) => {
    const requestId = collectionRequestRef.current + 1
    collectionRequestRef.current = requestId
    setCollectionDetailLoading(true)
    try {
      const response = await fetch(withQuery(API_ROUTES.account.collections, { id }), {
        credentials: 'include',
        cache: 'no-store',
      })
      const payload: unknown = await response.json().catch(() => null)
      if (!response.ok) throw new Error(apiErrorMessage(payload, 'Unable to load collection.'))
      if (!isAccountCollectionDetail(payload)) {
        throw new Error('Account API returned an invalid collection response.')
      }
      if (collectionRequestRef.current === requestId) setCollectionDetail(payload)
    } catch (nextError) {
      if (collectionRequestRef.current !== requestId) return
      toast(nextError instanceof Error ? nextError.message : 'Unable to load collection', {
        tone: 'error',
      })
      setOpenCollectionId(null)
    } finally {
      if (collectionRequestRef.current === requestId) setCollectionDetailLoading(false)
    }
  }, [])

  const loadOverview = useCallback(async () => {
    if (!user) {
      setIsLoading(false)
      return
    }

    const requestedUserId = user.id
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(API_ROUTES.account.overview, {
        credentials: 'include',
        cache: 'no-store',
      })
      const payload: unknown = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(apiErrorMessage(payload, 'Unable to load account.'))
      }
      if (!isRecord(payload) || !isAccountOverview(payload.account)) {
        throw new Error('Account API returned an invalid overview response.')
      }
      if (activeUserIdRef.current !== requestedUserId) return

      const account = payload.account
      const hasPaginatedRecommendations = recommendationsPageRef.current > 1
      setOverview((current) =>
        hasPaginatedRecommendations && current
          ? { ...account, recommendations: current.recommendations }
          : account,
      )
      setProfileName(account.user.name)
      setProfileEmail(account.user.email)
      setPreferencesDraft(account.preferences)
      setOnboardingSkill(account.onboarding.skillLevel)
      setOnboardingHours(String(account.onboarding.weeklyHours))
      setOnboardingGoals(account.onboarding.goals.join(', '))
      setOnboardingLanguages(account.onboarding.languages.join(', '))
      setOnboardingTopics(account.onboarding.topics.join(', '))
      if (!hasPaginatedRecommendations) {
        setRecommendationsPage(1)
        setRecommendationsHasMore(account.recommendationsHasMore)
      }
    } catch (nextError) {
      if (activeUserIdRef.current !== requestedUserId) return
      setError(nextError instanceof Error ? nextError.message : 'Unable to load account.')
    } finally {
      if (activeUserIdRef.current === requestedUserId) setIsLoading(false)
    }
  }, [user])

  useEffect(() => {
    activeUserIdRef.current = user?.id ?? null
    setOverview(null)
    setPreferencesDraft(null)
    setOpenCollectionId(null)
    setCollectionDetail(null)
    collectionRequestRef.current += 1
    setIssues([])
    setIssuesLoaded(false)
    setIssuesLoading(false)
    setError(null)
    setIsLoading(Boolean(user?.id))
    recommendationsPageRef.current = 1
    loadMoreRecommendationsInFlightRef.current = false
    setRecommendationsPage(1)
    setRecommendationsHasMore(false)
    setIsLoadingMoreRecommendations(false)
  }, [user?.id])

  useEffect(() => {
    if (!authLoading) void loadOverview()
  }, [authLoading, loadOverview])

  const pipelineGroups = useMemo(() => {
    const groups = new Map<string, AccountHubRepoWithState[]>()
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
    () => collectionDetail?.items.map((repo) => repositoryName(repo)) ?? [],
    [collectionDetail?.items],
  )

  const loadIssues = useCallback(async () => {
    const requestedUserId = user?.id
    if (!requestedUserId) {
      setIssues([])
      setIssuesLoaded(true)
      setIssuesLoading(false)
      return
    }

    setIssuesLoading(true)
    try {
      const response = await fetch(API_ROUTES.account.issues, {
        credentials: 'include',
        cache: 'no-store',
      })
      const payload: unknown = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(apiErrorMessage(payload, 'Unable to load issue recommendations.'))
      }
      if (!isRecord(payload) || !isAccountIssueList(payload.items)) {
        throw new Error('Account API returned an invalid issue response.')
      }
      if (activeUserIdRef.current !== requestedUserId) return
      setIssues(payload.items)
    } catch (nextError) {
      if (activeUserIdRef.current !== requestedUserId) return
      toast(
        nextError instanceof Error ? nextError.message : 'Unable to load issue recommendations',
        { tone: 'error' },
      )
    } finally {
      if (activeUserIdRef.current === requestedUserId) {
        setIssuesLoaded(true)
        setIssuesLoading(false)
      }
    }
  }, [user?.id])

  useEffect(() => {
    if (activeTab === 'issues' && !issuesLoaded && !issuesLoading) void loadIssues()
  }, [activeTab, issuesLoaded, issuesLoading, loadIssues])

  const updateRepo = async (repo: RepositoryApiItem, patch: Record<string, unknown>) => {
    const key = recommendationKey(repo)
    const leavesRecommendations = patch.dismissed === true || patch.saved === true
    const leavesLibrary = patch.saved === false

    const recommendationIndex =
      overview?.recommendations.findIndex((item) => recommendationKey(item) === key) ?? -1
    const libraryIndex =
      overview?.savedRepos.findIndex((item) => recommendationKey(item.repo) === key) ?? -1
    const libraryEntry = libraryIndex >= 0 ? overview?.savedRepos[libraryIndex] : undefined

    const dropsRecommendation = leavesRecommendations && recommendationIndex >= 0
    const dropsLibraryEntry = leavesLibrary && libraryIndex >= 0

    if (dropsRecommendation || dropsLibraryEntry) {
      setOverview((current) =>
        current
          ? {
              ...current,
              recommendations: dropsRecommendation
                ? current.recommendations.filter((item) => recommendationKey(item) !== key)
                : current.recommendations,
              savedRepos: dropsLibraryEntry
                ? current.savedRepos.filter((item) => recommendationKey(item.repo) !== key)
                : current.savedRepos,
            }
          : current,
      )
    }

    try {
      await postAccountApi(API_ROUTES.account.repository, {
        repoId: repo.opendeck_id,
        fullName: repositoryName(repo),
        ...patch,
      })
      toast(repositoryUpdateMessage(patch))
      void loadOverview()
    } catch {
      setOverview((current) =>
        current
          ? {
              ...current,
              recommendations: dropsRecommendation
                ? restoreListItem(current.recommendations, recommendationIndex, repo)
                : current.recommendations,
              savedRepos:
                dropsLibraryEntry && libraryEntry
                  ? restoreListItem(current.savedRepos, libraryIndex, libraryEntry)
                  : current.savedRepos,
            }
          : current,
      )
    }
  }

  const resetRecommendationsPagination = useCallback(() => {
    recommendationsPageRef.current = 1
  }, [])

  const loadMoreRecommendations = useCallback(async () => {
    if (!user || loadMoreRecommendationsInFlightRef.current || !recommendationsHasMore) return

    const requestedUserId = user.id
    loadMoreRecommendationsInFlightRef.current = true
    setIsLoadingMoreRecommendations(true)
    const nextPage = recommendationsPage + 1
    try {
      const response = await fetch(
        withQuery(API_ROUTES.account.recommendations, { page: nextPage }),
        { credentials: 'include', cache: 'no-store' },
      )
      const payload: unknown = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(apiErrorMessage(payload, 'Unable to load more recommendations.'))
      }
      if (!isAccountRecommendationPage(payload)) {
        throw new Error('Account API returned an invalid recommendations response.')
      }
      if (activeUserIdRef.current !== requestedUserId) return

      setOverview((current) =>
        current
          ? {
              ...current,
              recommendations: [...current.recommendations, ...payload.items],
            }
          : current,
      )
      recommendationsPageRef.current = nextPage
      setRecommendationsPage(nextPage)
      setRecommendationsHasMore(payload.hasMore)
    } catch (nextError) {
      if (activeUserIdRef.current !== requestedUserId) return
      toast(
        nextError instanceof Error ? nextError.message : 'Unable to load more recommendations',
        { tone: 'error' },
      )
    } finally {
      loadMoreRecommendationsInFlightRef.current = false
      setIsLoadingMoreRecommendations(false)
    }
  }, [recommendationsHasMore, recommendationsPage, user])

  const removeCollection = async (id: string) => {
    const index = overview?.collections.findIndex((item) => item.id === id) ?? -1
    const entry = index >= 0 ? overview?.collections[index] : undefined
    if (!entry) return

    setOverview((current) =>
      current
        ? { ...current, collections: current.collections.filter((item) => item.id !== id) }
        : current,
    )
    if (openCollectionId === id) {
      setOpenCollectionId(null)
      setCollectionDetail(null)
      collectionRequestRef.current += 1
    }

    try {
      await postAccountApi(API_ROUTES.account.collectionDelete, { id })
      toast('Collection deleted')
      void loadOverview()
    } catch {
      setOverview((current) =>
        current
          ? { ...current, collections: restoreListItem(current.collections, index, entry) }
          : current,
      )
    }
  }

  const removeSavedSearch = async (id: string) => {
    const index = overview?.savedSearches.findIndex((item) => item.id === id) ?? -1
    const entry = index >= 0 ? overview?.savedSearches[index] : undefined
    if (!entry) return

    setOverview((current) =>
      current
        ? { ...current, savedSearches: current.savedSearches.filter((item) => item.id !== id) }
        : current,
    )

    try {
      await postAccountApi(API_ROUTES.account.savedSearchDelete, { id })
      toast('Saved search deleted')
      void loadOverview()
    } catch {
      setOverview((current) =>
        current
          ? { ...current, savedSearches: restoreListItem(current.savedSearches, index, entry) }
          : current,
      )
    }
  }

  const removeCollectionItem = async (repo: RepositoryApiItem) => {
    const collectionId = openCollectionId
    if (!collectionId) return

    const key = recommendationKey(repo)
    const index = collectionDetail?.items.findIndex((item) => recommendationKey(item) === key) ?? -1
    if (index < 0) return

    setCollectionDetail((current) =>
      current
        ? { ...current, items: current.items.filter((item) => recommendationKey(item) !== key) }
        : current,
    )

    try {
      await postAccountApi(API_ROUTES.account.collectionItem, {
        collectionId,
        repoId: repo.opendeck_id,
        fullName: repositoryName(repo),
        action: 'remove',
      })
      toast('Removed from collection')
      void loadOverview()
    } catch {
      setCollectionDetail((current) =>
        current ? { ...current, items: restoreListItem(current.items, index, repo) } : current,
      )
    }
  }

  const removeFollow = async (follow: AccountOverview['follows'][number]) => {
    const index = overview?.follows.findIndex((item) => item.id === follow.id) ?? -1
    if (index < 0) return

    setOverview((current) =>
      current
        ? { ...current, follows: current.follows.filter((item) => item.id !== follow.id) }
        : current,
    )

    try {
      await postAccountApi(API_ROUTES.account.follows, {
        targetType: follow.targetType,
        targetKey: follow.targetKey,
        following: false,
      })
      toast('Follow removed')
      void loadOverview()
    } catch {
      setOverview((current) =>
        current
          ? { ...current, follows: restoreListItem(current.follows, index, follow) }
          : current,
      )
    }
  }

  const removeSession = async (session: AccountOverview['sessions'][number]) => {
    const index = overview?.sessions.findIndex((item) => item.id === session.id) ?? -1
    if (index < 0) return

    setOverview((current) =>
      current
        ? { ...current, sessions: current.sessions.filter((item) => item.id !== session.id) }
        : current,
    )

    try {
      await postAccountApi(API_ROUTES.account.sessionRevoke, { sessionId: session.id })
      toast('Session signed out')
      void loadOverview()
    } catch {
      setOverview((current) =>
        current
          ? { ...current, sessions: restoreListItem(current.sessions, index, session) }
          : current,
      )
    }
  }

  return {
    activeTab,
    authLoading,
    collectionDescription,
    collectionDetail,
    collectionDetailLoading,
    collectionExcludedRepoNames,
    collectionName,
    deleteConfirm,
    error,
    isInitialLoading: authLoading || Boolean(user && isLoading && !overview),
    isLoadingMoreRecommendations,
    issues,
    issuesLoading,
    loadCollectionDetail,
    loadIssues,
    loadMoreRecommendations,
    loadOverview,
    onboardingGoals,
    onboardingHours,
    onboardingLanguages,
    onboardingSkill,
    onboardingTopics,
    openAuth,
    openCollectionId,
    overview,
    pipelineGroups,
    preferencesDraft,
    profileEmail,
    profileName,
    recommendationsHasMore,
    refreshSession,
    resetRecommendationsPagination,
    removeCollection,
    removeCollectionItem,
    removeFollow,
    removeSavedSearch,
    removeSession,
    searchAlertsEnabled,
    searchLanguage,
    searchMinStars,
    searchName,
    searchPreview,
    searchPreviewLoading,
    searchQuery,
    searchTopic,
    selectTab,
    setCollectionDescription,
    setCollectionDetail,
    setCollectionName,
    setDeleteConfirm,
    setOnboardingGoals,
    setOnboardingHours,
    setOnboardingLanguages,
    setOnboardingSkill,
    setOnboardingTopics,
    setOpenCollectionId,
    setOverview,
    setPreferencesDraft,
    setProfileEmail,
    setProfileName,
    setSearchAlertsEnabled,
    setSearchLanguage,
    setSearchMinStars,
    setSearchName,
    setSearchPreview,
    setSearchPreviewLoading,
    setSearchQuery,
    setSearchTopic,
    signOut,
    updateRepo,
    user,
  }
}
