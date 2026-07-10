'use client'

import { Icon } from '@iconify/react'
import { AnimatePresence, motion, type Variants } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import {
  Fragment,
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import CountPill from '@/components/ui/count-pill'
import { SearchBar } from '@/components/ui/search-bar'
import Select from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { ColorfulTag, SimpleTag } from '@/components/ui/tag'
import { toast } from '@/components/ui/toast'
import { useAuth } from '@/features/auth/auth-provider'
import PageShell from '@/features/dashboard/components/page-shell'
import { formatDate, formatNumber, getLanguageTagStyle } from '@/features/repositories/utils'
import { cn } from '@/utils/cn'

const ORGANIZATION_HEADERS = ['Organization', 'Language', 'Repos', 'Stars', 'Top repo']
const HEADER_CELL_CLASS =
  'whitespace-nowrap border-b border-row-divider bg-background/30 px-3 py-3 text-left text-xs font-semibold text-muted-foreground/70 sm:px-4'
const TABLE_CELL_CLASS = 'border-b border-row-divider px-3 py-3 text-sm sm:px-4'
const TABLE_SURFACE_CLASS =
  'overflow-hidden rounded-xl border border-border/50 bg-background/40 backdrop-blur-sm'
const ORGANIZATION_COLUMN_CLASS =
  'sticky left-0 z-10 min-w-[14rem] border-r border-row-divider bg-background sm:min-w-[16rem] md:min-w-[18rem]'
const ORGANIZATION_HEADER_CLASS =
  'sticky left-0 z-20 min-w-[14rem] border-r border-row-divider bg-background sm:min-w-[16rem] md:min-w-[18rem]'
const TOP_REPO_COLUMN_CLASS = 'min-w-[16rem] max-w-[26rem] md:min-w-[20rem] md:max-w-[34rem]'
const ORGANIZATION_COLUMN_RESPONSIVE: Record<string, string> = {
  Repos: 'hidden sm:table-cell',
  Language: 'hidden md:table-cell',
  'Top repo': 'hidden lg:table-cell',
}

const gridStagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04 } },
}
const rowItem: Variants = {
  hidden: { opacity: 0, y: 6 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 28 } },
}
const sectionStagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
}
const sectionItem: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 30 } },
}
const groupStagger: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 300, damping: 30, staggerChildren: 0.04 },
  },
}
const chipItem: Variants = {
  hidden: { opacity: 0, scale: 0.9, y: 4 },
  show: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', stiffness: 420, damping: 28 } },
}

const MotionLink = motion.create(Link)

type Organization = {
  owner: string
  avatarUrl?: string | null
  repoCount: number
  totalStars: number
  totalForks?: number
  totalOpenIssues?: number
  totalContributors?: number
  goodFirstIssueRepos?: number
  archivedRepos?: number
  activeRepos?: number
  homepageRepos?: number
  topRepo: string
  topLanguage?: string | null
  newestRepo?: string | null
  latestPushedAt?: string | null
  latestUpdatedAt?: string | null
}

type OrganizationProfile = {
  name?: string | null
  description?: string | null
  company?: string | null
  website?: string | null
  location?: string | null
  email?: string | null
  twitterUsername?: string | null
  type?: string | null
  publicRepos?: number | null
  publicGists?: number | null
  followers?: number | null
  following?: number | null
  createdAt?: string | null
  updatedAt?: string | null
  htmlUrl?: string | null
}

type TopOrganizationRepo = {
  fullName: string
  stars: number
  forks: number
  openIssues: number
  language?: string | null
}

type OrganizationMirrorDetails = {
  topRepos?: TopOrganizationRepo[]
  latestPushedAt?: string | null
  latestUpdatedAt?: string | null
  newestRepo?: string | null
  mostActiveRepo?: string | null
}

type OrganizationDetailsResponse = {
  profile: OrganizationProfile | null
  mirror: OrganizationMirrorDetails | null
}

const organizationProfileCache = new Map<string, OrganizationDetailsResponse>()
const organizationProfileRequests = new Map<string, Promise<OrganizationDetailsResponse>>()

const organizationKey = (organization: Organization) => organization.owner

const detailsIdFor = (organization: Organization) =>
  `organization-details-${organization.owner.replace(/[^a-zA-Z0-9_-]/g, '-')}`

const clearUrlParam = (param: string) => {
  const url = new URL(window.location.href)
  if (!url.searchParams.has(param)) return

  url.searchParams.delete(param)
  window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`)
}

function loadOrganizationProfile(owner: string) {
  const cached = organizationProfileCache.get(owner)
  if (cached) return Promise.resolve(cached)

  const pending = organizationProfileRequests.get(owner)
  if (pending) return pending

  const request = fetch(`/api/organizations/profile?owner=${encodeURIComponent(owner)}`, {
    cache: 'no-store',
  })
    .then(async (response) => {
      const data = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(data?.error || 'Unable to load organization profile details.')
      }
      return data
    })
    .then((data) => {
      const payload = {
        profile: data?.profile ?? null,
        mirror: data?.mirror ?? null,
      }
      organizationProfileCache.set(owner, payload)
      return payload
    })
    .finally(() => {
      organizationProfileRequests.delete(owner)
    })

  organizationProfileRequests.set(owner, request)
  return request
}

function useOrganizationProfile(owner: string) {
  const [payload, setPayload] = useState<OrganizationDetailsResponse | null>(
    () => organizationProfileCache.get(owner) ?? null,
  )
  const [isLoading, setIsLoading] = useState(() => !organizationProfileCache.has(owner))
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (organizationProfileCache.has(owner)) {
      setPayload(organizationProfileCache.get(owner) ?? null)
      setError(null)
      setIsLoading(false)
      return
    }

    let cancelled = false
    setPayload(null)
    setError(null)
    setIsLoading(true)

    loadOrganizationProfile(owner)
      .then((nextPayload) => {
        if (!cancelled) {
          setPayload(nextPayload)
          setError(null)
        }
      })
      .catch((nextError) => {
        if (!cancelled) {
          setPayload(null)
          setError(
            nextError instanceof Error
              ? nextError.message
              : 'Unable to load organization profile details.',
          )
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [owner])

  return { profile: payload?.profile ?? null, mirror: payload?.mirror ?? null, isLoading, error }
}

function DetailMetric({
  icon,
  leading,
  value,
  label,
}: {
  icon?: string
  leading?: ReactNode
  value: string
  label?: string
}) {
  return (
    <motion.span
      variants={chipItem}
      className="inline-flex items-center gap-1.5 text-sm text-muted-foreground"
    >
      {leading ?? (icon ? <Icon icon={icon} className="h-4 w-4 text-muted-foreground/70" /> : null)}
      <span className="font-medium text-foreground">{value}</span>
      {label}
    </motion.span>
  )
}

function DetailField({
  icon,
  label,
  value,
  href,
}: {
  icon: string
  label: string
  value?: ReactNode
  href?: string
}) {
  if (!value) return null

  const isExternal = href ? /^https?:\/\//.test(href) : false
  const copyText = !href && typeof value === 'string' ? value : null

  return (
    <motion.span
      variants={chipItem}
      className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground"
    >
      <Icon icon={icon} className="h-4 w-4 shrink-0 text-muted-foreground/70" />
      <span className="shrink-0 text-xs font-medium text-muted-foreground/80">{label}</span>
      {href ? (
        <Link
          href={href}
          target={isExternal ? '_blank' : undefined}
          rel={isExternal ? 'noopener noreferrer' : undefined}
          onClick={(event) => event.stopPropagation()}
          className="inline-flex min-w-0 items-center gap-1 font-medium text-foreground transition-colors hover:text-primary"
        >
          <span className="min-w-0 truncate">{value}</span>
          <Icon
            icon="ri:external-link-line"
            className="h-3 w-3 shrink-0 text-muted-foreground/60"
          />
        </Link>
      ) : copyText !== null ? (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            if (!copyText || !navigator.clipboard) return
            navigator.clipboard.writeText(copyText).then(
              () => toast(`${label} copied`),
              () => {},
            )
          }}
          className="group inline-flex min-w-0 items-center gap-1 text-left font-medium text-foreground transition-colors hover:text-primary focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <span className="min-w-0 truncate">{value}</span>
          <Icon
            icon="ri:file-copy-line"
            className="h-3 w-3 shrink-0 text-muted-foreground/50 opacity-0 transition-opacity group-hover:opacity-100"
          />
        </button>
      ) : (
        <span className="min-w-0 truncate font-medium text-foreground">{value}</span>
      )}
    </motion.span>
  )
}

function DetailSection({
  title,
  children,
  className,
}: {
  title: string
  children: ReactNode
  className?: string
}) {
  return (
    <motion.section
      variants={sectionItem}
      className={cn('@container min-w-0 space-y-2.5', className)}
    >
      <h4 className="text-balance text-xs font-semibold text-muted-foreground">{title}</h4>
      {children}
    </motion.section>
  )
}

function OrganizationPersonalPanel({ organization }: { organization: Organization }) {
  const { user } = useAuth()
  const [isFollowing, setIsFollowing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoadingState, setIsLoadingState] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  const loadFollowState = useCallback(async () => {
    if (!user) {
      setIsFollowing(false)
      setIsLoadingState(false)
      setLoadError(null)
      return
    }

    setIsLoadingState(true)
    setLoadError(null)
    try {
      const params = new URLSearchParams({
        targetType: 'organization',
        targetKey: organization.owner,
      })
      const response = await fetch(`/api/account/follows?${params.toString()}`, {
        credentials: 'include',
        cache: 'no-store',
      })
      const data = await response.json().catch(() => null)
      if (!response.ok) throw new Error(data?.error || 'Unable to load follow state.')
      setIsFollowing(Boolean(data?.following))
      setLoadError(null)
    } catch (error) {
      setIsFollowing(false)
      setLoadError(error instanceof Error ? error.message : 'Unable to load follow state.')
    } finally {
      setIsLoadingState(false)
    }
  }, [organization.owner, user])

  useEffect(() => {
    void loadFollowState()
  }, [loadFollowState])

  useEffect(() => {
    if (!user) return
    void fetch('/api/account/recent', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        targetType: 'organization',
        targetKey: organization.owner,
        metadata: { topRepo: organization.topRepo },
      }),
    }).catch(() => null)
  }, [organization.owner, organization.topRepo, user])

  if (!user) return null

  return (
    <motion.div
      variants={sectionItem}
      className="rounded-lg border border-border/50 bg-background/35 p-3"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h4 className="text-balance text-xs font-semibold text-muted-foreground">My Deck</h4>
          <p className="mt-1 text-sm text-muted-foreground">
            Follow this organization for alerts and personalized recommendations.
          </p>
          {loadError && (
            <p className="mt-2 text-xs text-destructive">
              {loadError}{' '}
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation()
                  void loadFollowState()
                }}
                className="font-medium underline underline-offset-2"
              >
                Retry
              </button>
            </p>
          )}
        </div>
        <button
          type="button"
          disabled={isSaving || isLoadingState || Boolean(loadError)}
          onClick={async (event) => {
            event.stopPropagation()
            setIsSaving(true)
            try {
              const response = await fetch('/api/account/follows', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                  targetType: 'organization',
                  targetKey: organization.owner,
                  following: !isFollowing,
                }),
              })
              const data = await response.json().catch(() => null)
              if (!response.ok) throw new Error(data?.error || 'Unable to update follow state.')
              setIsFollowing(Boolean(data.following))
              toast(data.following ? 'Organization followed' : 'Organization unfollowed')
            } catch (error) {
              toast(error instanceof Error ? error.message : 'Unable to update follow state', {
                tone: 'error',
              })
            } finally {
              setIsSaving(false)
            }
          }}
          className={cn(
            'inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm font-medium transition-colors disabled:opacity-60',
            isFollowing
              ? 'border-success/30 bg-success/10 text-success'
              : 'border-border/40 bg-background text-foreground hover:bg-muted-hover',
          )}
        >
          <Icon
            icon={isFollowing ? 'ri:notification-3-fill' : 'ri:notification-3-line'}
            className="h-4 w-4"
          />
          {isFollowing ? 'Following' : 'Follow'}
        </button>
      </div>
    </motion.div>
  )
}

function OrganizationToolbar({
  query,
  onQueryChange,
  onRefresh,
  isRefreshing,
}: {
  query: string
  onQueryChange: (value: string) => void
  onRefresh: () => void
  isRefreshing?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border/50 px-3 py-2.5">
      <motion.button
        type="button"
        onClick={onRefresh}
        aria-label="Refresh organizations"
        disabled={isRefreshing}
        whileHover={{ scale: isRefreshing ? 1 : 1.05 }}
        whileTap={{ scale: isRefreshing ? 1 : 0.92 }}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border/50 bg-background/40 text-muted-foreground transition-colors hover:border-border hover:text-foreground disabled:pointer-events-none disabled:opacity-60"
      >
        <Icon icon="ri:refresh-line" className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
      </motion.button>

      <div className="relative w-full max-w-md">
        <SearchBar
          value={query}
          onSearchChange={onQueryChange}
          placeholder="Search organizations"
          aria-label="Search organizations"
          inputClassName="border-border/50 bg-background/40"
        />
      </div>
    </div>
  )
}

function OrganizationSkeleton() {
  return (
    <tr>
      <td className={`${TABLE_CELL_CLASS} ${ORGANIZATION_COLUMN_CLASS}`}>
        <div className="flex items-center gap-2.5">
          <Skeleton className="h-6 w-6 shrink-0" />
          <Skeleton className="h-3.5 w-32 max-w-full" />
        </div>
      </td>
      <td className={cn(TABLE_CELL_CLASS, ORGANIZATION_COLUMN_RESPONSIVE.Language)}>
        <Skeleton className="h-5 w-20" />
      </td>
      <td className={cn(TABLE_CELL_CLASS, ORGANIZATION_COLUMN_RESPONSIVE.Repos)}>
        <Skeleton className="h-3.5 w-12" />
      </td>
      <td className={TABLE_CELL_CLASS}>
        <Skeleton className="h-3.5 w-12" />
      </td>
      <td
        className={cn(
          TABLE_CELL_CLASS,
          TOP_REPO_COLUMN_CLASS,
          ORGANIZATION_COLUMN_RESPONSIVE['Top repo'],
        )}
      >
        <Skeleton className="h-3.5 w-44 max-w-full" />
      </td>
    </tr>
  )
}

function OrganizationDetails({ organization }: { organization: Organization }) {
  const {
    profile,
    mirror,
    isLoading: isProfileLoading,
    error: profileError,
  } = useOrganizationProfile(organization.owner)
  const ownerUrl = profile?.htmlUrl || `https://github.com/${organization.owner}`
  const languageStyle = organization.topLanguage
    ? getLanguageTagStyle(organization.topLanguage)
    : null
  const website =
    profile?.website && /^https?:\/\//.test(profile.website)
      ? profile.website
      : profile?.website
        ? `https://${profile.website}`
        : null
  const twitterUrl = profile?.twitterUsername
    ? `https://x.com/${profile.twitterUsername.replace(/^@/, '')}`
    : null
  const latestPushedAt = formatDate(mirror?.latestPushedAt || organization.latestPushedAt)
  const latestUpdatedAt = formatDate(mirror?.latestUpdatedAt || organization.latestUpdatedAt)
  const joinedAt = formatDate(profile?.createdAt)
  const profileUpdatedAt = formatDate(profile?.updatedAt)
  const hasProfileDetails = Boolean(
    profile?.name ||
      profile?.type ||
      profile?.company ||
      website ||
      profile?.location ||
      profile?.email ||
      profile?.twitterUsername ||
      profile?.publicRepos != null ||
      profile?.publicGists != null ||
      profile?.followers != null ||
      profile?.following != null ||
      joinedAt ||
      profileUpdatedAt,
  )
  return (
    <div className="@container p-4 md:p-6">
      <motion.div
        className="space-y-6 pr-1"
        initial="hidden"
        animate="show"
        variants={sectionStagger}
      >
        <motion.div variants={sectionItem}>
          {isProfileLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-3.5 w-full max-w-2xl" />
              <Skeleton className="h-3.5 w-3/4 max-w-xl" />
            </div>
          ) : profileError ? (
            <p className="line-clamp-3 text-pretty text-sm leading-relaxed text-muted-foreground">
              {profileError}
            </p>
          ) : (
            <p className="line-clamp-3 text-pretty text-sm leading-relaxed text-foreground/90">
              {profile?.description || 'No organization description available.'}
            </p>
          )}
        </motion.div>

        <motion.div variants={groupStagger} className="flex flex-wrap items-center gap-x-5 gap-y-2">
          {organization.topLanguage && languageStyle && (
            <DetailMetric
              leading={
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: languageStyle.color }}
                />
              }
              value={organization.topLanguage}
            />
          )}
          <DetailMetric
            icon="ri:git-repository-line"
            value={formatNumber(organization.repoCount)}
            label="repos"
          />
          <DetailMetric
            icon="ri:star-line"
            value={formatNumber(organization.totalStars)}
            label="stars"
          />
          <DetailMetric
            icon="ri:git-fork-line"
            value={formatNumber(organization.totalForks ?? 0)}
            label="forks"
          />
          <DetailMetric
            icon="ri:record-circle-line"
            value={formatNumber(organization.totalOpenIssues ?? 0)}
            label="open issues"
          />
          <DetailMetric
            icon="ri:team-line"
            value={formatNumber(organization.totalContributors ?? 0)}
            label="contributors"
          />
        </motion.div>

        <OrganizationPersonalPanel organization={organization} />

        <DetailSection title="GitHub profile">
          {isProfileLoading ? (
            <div className="grid gap-x-6 gap-y-2 @sm:grid-cols-2">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="h-4 w-full max-w-48" />
              ))}
            </div>
          ) : profileError ? (
            <p className="text-sm text-muted-foreground">{profileError}</p>
          ) : hasProfileDetails ? (
            <motion.div
              variants={groupStagger}
              initial="hidden"
              animate="show"
              className="grid gap-x-6 gap-y-2 @sm:grid-cols-2"
            >
              <DetailField
                icon="ri:profile-line"
                label="Name"
                value={profile?.name}
                href={ownerUrl}
              />
              <DetailField icon="ri:building-line" label="Type" value={profile?.type} />
              <DetailField icon="ri:briefcase-line" label="Company" value={profile?.company} />
              <DetailField
                icon="ri:global-line"
                label="Website"
                value={profile?.website}
                href={website ?? undefined}
              />
              <DetailField icon="ri:map-pin-line" label="Location" value={profile?.location} />
              <DetailField
                icon="ri:mail-line"
                label="Email"
                value={profile?.email}
                href={profile?.email ? `mailto:${profile.email}` : undefined}
              />
              <DetailField
                icon="ri:twitter-x-line"
                label="Twitter"
                value={profile?.twitterUsername}
                href={twitterUrl ?? undefined}
              />
              <DetailField
                icon="ri:git-repository-line"
                label="Public repos"
                value={
                  profile?.publicRepos === null || profile?.publicRepos === undefined
                    ? undefined
                    : formatNumber(profile.publicRepos)
                }
              />
              <DetailField
                icon="ri:file-list-3-line"
                label="Public gists"
                value={
                  profile?.publicGists === null || profile?.publicGists === undefined
                    ? undefined
                    : formatNumber(profile.publicGists)
                }
              />
              <DetailField
                icon="ri:user-follow-line"
                label="Followers"
                value={
                  profile?.followers === null || profile?.followers === undefined
                    ? undefined
                    : formatNumber(profile.followers)
                }
              />
              <DetailField
                icon="ri:user-shared-line"
                label="Following"
                value={
                  profile?.following === null || profile?.following === undefined
                    ? undefined
                    : formatNumber(profile.following)
                }
              />
              <DetailField icon="ri:calendar-line" label="Joined" value={joinedAt} />
              <DetailField
                icon="ri:refresh-line"
                label="Profile updated"
                value={profileUpdatedAt}
              />
            </motion.div>
          ) : (
            <p className="text-sm text-muted-foreground">No GitHub profile metadata available.</p>
          )}
        </DetailSection>

        <DetailSection title="Mirror coverage">
          <motion.div variants={groupStagger} className="grid gap-x-6 gap-y-2 @sm:grid-cols-2">
            <DetailField
              icon="ri:checkbox-circle-line"
              label="Active repos"
              value={formatNumber(organization.activeRepos ?? 0)}
            />
            <DetailField
              icon="ri:archive-line"
              label="Archived repos"
              value={formatNumber(organization.archivedRepos ?? 0)}
            />
            <DetailField
              icon="ri:hand-heart-line"
              label="Good first repos"
              value={formatNumber(organization.goodFirstIssueRepos ?? 0)}
            />
            <DetailField
              icon="ri:global-line"
              label="Homepage repos"
              value={formatNumber(organization.homepageRepos ?? 0)}
            />
            <DetailField
              icon="ri:seedling-line"
              label="Newest repo"
              value={mirror?.newestRepo || organization.newestRepo}
            />
            <DetailField icon="ri:pulse-line" label="Most active" value={mirror?.mostActiveRepo} />
            <DetailField icon="ri:upload-cloud-line" label="Latest push" value={latestPushedAt} />
            <DetailField icon="ri:refresh-line" label="Latest update" value={latestUpdatedAt} />
          </motion.div>
        </DetailSection>

        {mirror?.topRepos && mirror.topRepos.length > 0 && (
          <DetailSection title="Top mirrored repositories">
            <motion.div
              variants={groupStagger}
              initial="hidden"
              animate="show"
              className="space-y-1.5"
            >
              {mirror.topRepos.map((repo) => {
                const repoLanguageStyle = repo.language ? getLanguageTagStyle(repo.language) : null

                return (
                  <MotionLink
                    key={repo.fullName}
                    variants={rowItem}
                    href={`/dashboard/discover?repo=${encodeURIComponent(repo.fullName)}`}
                    onClick={(event) => event.stopPropagation()}
                    whileHover={{ x: 2 }}
                    className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 rounded-lg border border-border/40 bg-background/30 px-3 py-2.5 transition-colors hover:bg-muted-hover focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <span className="flex min-w-0 flex-1 items-center gap-2">
                      <Icon
                        icon="ri:git-repository-line"
                        className="h-4 w-4 shrink-0 text-muted-foreground/70"
                      />
                      <span className="min-w-0 truncate text-sm font-medium text-foreground">
                        {repo.fullName}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-3.5 text-xs text-muted-foreground">
                      {repo.language && (
                        <span className="inline-flex items-center gap-1.5">
                          <span
                            className="h-2 w-2 shrink-0 rounded-full"
                            style={{ backgroundColor: repoLanguageStyle?.color ?? 'currentColor' }}
                          />
                          {repo.language}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 tabular-nums">
                        <Icon icon="ri:star-line" className="h-3.5 w-3.5" />
                        {formatNumber(repo.stars)}
                      </span>
                      <span className="inline-flex items-center gap-1 tabular-nums">
                        <Icon icon="ri:git-fork-line" className="h-3.5 w-3.5" />
                        {formatNumber(repo.forks)}
                      </span>
                      <span className="inline-flex items-center gap-1 tabular-nums">
                        <Icon icon="ri:record-circle-line" className="h-3.5 w-3.5" />
                        {formatNumber(repo.openIssues)}
                      </span>
                    </span>
                  </MotionLink>
                )
              })}
            </motion.div>
          </DetailSection>
        )}
      </motion.div>
    </div>
  )
}
function OrganizationRow({
  organization,
  isExpanded,
  onToggle,
  detailsId,
}: {
  organization: Organization
  isExpanded: boolean
  onToggle: () => void
  detailsId: string
}) {
  const languageStyle = organization.topLanguage
    ? getLanguageTagStyle(organization.topLanguage)
    : null

  return (
    <motion.tr
      variants={rowItem}
      data-org-row={organization.owner}
      onClick={onToggle}
      aria-expanded={isExpanded}
      aria-controls={detailsId}
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onToggle()
        }
      }}
      className="group cursor-pointer transition-colors hover:bg-muted-hover"
    >
      <td
        className={cn(
          TABLE_CELL_CLASS,
          ORGANIZATION_COLUMN_CLASS,
          'transition-colors group-hover:bg-row-hover',
          isExpanded ? 'bg-row-hover' : 'bg-background',
        )}
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="h-6 w-6 shrink-0 overflow-hidden rounded-md border border-border/70 bg-background">
            {organization.avatarUrl ? (
              <Image
                src={organization.avatarUrl}
                alt=""
                width={24}
                height={24}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full bg-muted" />
            )}
          </span>
          <span className="block min-w-0 max-w-[13rem] truncate font-medium text-foreground sm:max-w-[15rem] md:max-w-[17rem]">
            {organization.owner}
          </span>
        </div>
      </td>
      <td className={cn(TABLE_CELL_CLASS, ORGANIZATION_COLUMN_RESPONSIVE.Language)}>
        {organization.topLanguage && languageStyle ? (
          <ColorfulTag style={languageStyle}>{organization.topLanguage}</ColorfulTag>
        ) : (
          <SimpleTag>-</SimpleTag>
        )}
      </td>
      <td className={cn(TABLE_CELL_CLASS, ORGANIZATION_COLUMN_RESPONSIVE.Repos)}>
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap font-mono font-medium tabular-nums tracking-wider text-sm text-foreground">
          <Icon
            icon="ri:git-repository-line"
            className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70"
          />
          {formatNumber(organization.repoCount)}
        </span>
      </td>
      <td className={TABLE_CELL_CLASS}>
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap font-mono font-medium tabular-nums tracking-wider text-sm text-foreground">
          <Icon icon="ri:star-line" className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
          {formatNumber(organization.totalStars)}
        </span>
      </td>
      <td
        className={cn(
          TABLE_CELL_CLASS,
          TOP_REPO_COLUMN_CLASS,
          ORGANIZATION_COLUMN_RESPONSIVE['Top repo'],
        )}
      >
        <span className="block truncate text-foreground">{organization.topRepo}</span>
      </td>
    </motion.tr>
  )
}

export default function OrganizationsPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [expandedOrganization, setExpandedOrganization] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [language, setLanguage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [scrollNode, setScrollNode] = useState<HTMLDivElement | null>(null)
  const [panelWidth, setPanelWidth] = useState<number>()
  const deepLinkApplied = useRef(false)
  const pendingExpansion = useRef<string | null>(null)
  const pendingAuthMessage = useRef<string | null>(null)
  const authPromptWasOpen = useRef(false)
  const { user, isLoading: isAuthLoading, isAuthOpen, openAuth } = useAuth()

  useEffect(() => {
    const controller = new AbortController()

    async function fetchOrganizations() {
      setIsLoading(true)

      try {
        const response = await fetch('/api/organizations?limit=150', {
          signal: controller.signal,
          cache: refreshKey > 0 ? 'no-store' : 'default',
        })

        if (!response.ok) throw new Error('Failed to fetch organizations')

        const data = await response.json()
        setOrganizations(Array.isArray(data?.items) ? data.items : [])
        setError(null)
      } catch {
        if (!controller.signal.aborted) {
          setError('Unable to load organizations right now.')
          setOrganizations([])
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false)
      }
    }

    fetchOrganizations()

    return () => controller.abort()
  }, [refreshKey])

  useLayoutEffect(() => {
    if (!scrollNode) return
    const update = () => setPanelWidth(scrollNode.clientWidth)
    update()
    const observer = new ResizeObserver(update)
    observer.observe(scrollNode)
    return () => observer.disconnect()
  }, [scrollNode])

  const expandOrganization = useCallback((rowId: string) => {
    setExpandedOrganization((current) => (current === rowId ? null : rowId))
  }, [])

  const requestOrganizationExpansion = useCallback(
    (
      rowId: string,
      message = 'Sign in to expand organization rows and inspect mirrored repository details.',
    ) => {
      clearUrlParam('owner')

      if (!user) {
        pendingExpansion.current = rowId
        pendingAuthMessage.current = message
        if (!isAuthLoading) openAuth({ message })
        return
      }

      expandOrganization(rowId)
    },
    [expandOrganization, isAuthLoading, openAuth, user],
  )

  useEffect(() => {
    if (!user) setExpandedOrganization(null)
  }, [user])

  useEffect(() => {
    if (isAuthOpen) {
      authPromptWasOpen.current = true
      return
    }

    if (authPromptWasOpen.current && !user) {
      pendingExpansion.current = null
      pendingAuthMessage.current = null
    }

    authPromptWasOpen.current = false
  }, [isAuthOpen, user])

  useEffect(() => {
    if (isAuthLoading) return
    const nextOrganization = pendingExpansion.current
    if (!nextOrganization) return

    if (user) {
      pendingExpansion.current = null
      pendingAuthMessage.current = null
      setExpandedOrganization(nextOrganization)
      return
    }

    const message = pendingAuthMessage.current
    if (message) {
      pendingAuthMessage.current = null
      openAuth({ message })
    }
  }, [isAuthLoading, openAuth, user])

  useEffect(() => {
    if (deepLinkApplied.current || isLoading) return
    const ownerParam = new URLSearchParams(window.location.search).get('owner')
    if (!ownerParam) return
    if (organizations.length === 0) {
      deepLinkApplied.current = true
      clearUrlParam('owner')
      return
    }
    const match = organizations.find(
      (organization) => organization.owner.toLowerCase() === ownerParam.toLowerCase(),
    )
    if (!match) {
      deepLinkApplied.current = true
      clearUrlParam('owner')
      return
    }
    deepLinkApplied.current = true
    requestOrganizationExpansion(match.owner, 'Sign in to expand the linked organization details.')
    clearUrlParam('owner')
    const frameId = requestAnimationFrame(() => {
      document
        .querySelector(`[data-org-row="${CSS.escape(match.owner)}"]`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
    return () => cancelAnimationFrame(frameId)
  }, [isLoading, organizations, requestOrganizationExpansion])

  const languageOptions = useMemo(() => {
    const languages = new Set(
      organizations
        .map((organization) => organization.topLanguage)
        .filter((value): value is string => Boolean(value)),
    )

    return Array.from(languages)
      .sort((a, b) => a.localeCompare(b))
      .map((value) => ({
        value: value.toLowerCase(),
        label: value,
      }))
  }, [organizations])

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase()

    return organizations.filter((organization) => {
      const matchesLanguage =
        language === '' || organization.topLanguage?.toLowerCase() === language
      const matchesQuery =
        normalized === '' ||
        organization.owner.toLowerCase().includes(normalized) ||
        organization.topRepo.toLowerCase().includes(normalized) ||
        organization.topLanguage?.toLowerCase().includes(normalized)

      return matchesLanguage && matchesQuery
    })
  }, [language, organizations, query])

  const emptyMessage =
    organizations.length === 0
      ? 'Run discovery ingestion to populate indexed GitHub organizations.'
      : 'No organizations match the current search.'

  const toggleOrganization = (rowId: string) => {
    clearUrlParam('owner')
    requestOrganizationExpansion(rowId)
  }

  return (
    <PageShell className="flex flex-col gap-6" aria-busy={isLoading}>
      <div role="status" aria-live="polite" className="sr-only">
        {isLoading
          ? 'Loading organizations'
          : error
            ? error
            : `${filtered.length} organizations loaded`}
      </div>
      <div className="flex flex-col sm:flex-row sm:flex-wrap justify-between items-start gap-4">
        <div className="flex min-w-0 flex-col gap-1.5 mb-2">
          <div className="flex items-center gap-3">
            <h1 className="text-balance text-lg sm:text-xl font-medium text-primary">
              Organizations
            </h1>
            <CountPill count={filtered.length} />
          </div>
          <p className="text-pretty text-[13px] text-muted-foreground max-w-md">
            Top open source organizations shaping the developer ecosystem.
          </p>
        </div>

        <Select
          value={language}
          onChange={(event) => setLanguage(event.target.value)}
          options={languageOptions}
          placeholder="All Languages"
          ariaLabel="Filter organizations by language"
          className="w-full sm:w-44"
        />
      </div>

      {isLoading ? (
        <div className={TABLE_SURFACE_CLASS}>
          <OrganizationToolbar
            query={query}
            onQueryChange={setQuery}
            onRefresh={() => setRefreshKey((key) => key + 1)}
            isRefreshing={isLoading}
          />
          <div className="hide-scrollbar w-full overflow-x-auto">
            <table className="w-max min-w-full table-auto border-separate border-spacing-0">
              <thead>
                <tr>
                  {ORGANIZATION_HEADERS.map((label, index) => (
                    <th
                      key={label}
                      className={`${HEADER_CELL_CLASS} ${index === 0 ? ORGANIZATION_HEADER_CLASS : ''} ${label === 'Top repo' ? TOP_REPO_COLUMN_CLASS : ''} ${ORGANIZATION_COLUMN_RESPONSIVE[label] ?? ''}`}
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 9 }).map((_, i) => (
                  <OrganizationSkeleton key={i} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : error ? (
        <div className={TABLE_SURFACE_CLASS}>
          <OrganizationToolbar
            query={query}
            onQueryChange={setQuery}
            onRefresh={() => setRefreshKey((key) => key + 1)}
            isRefreshing={isLoading}
          />
          <section className="p-6 text-sm text-muted-foreground">{error}</section>
        </div>
      ) : filtered.length === 0 ? (
        <div className={TABLE_SURFACE_CLASS}>
          <OrganizationToolbar
            query={query}
            onQueryChange={setQuery}
            onRefresh={() => setRefreshKey((key) => key + 1)}
            isRefreshing={isLoading}
          />
          <section className="p-6 text-sm text-muted-foreground">{emptyMessage}</section>
        </div>
      ) : (
        <div className={TABLE_SURFACE_CLASS}>
          <OrganizationToolbar
            query={query}
            onQueryChange={setQuery}
            onRefresh={() => setRefreshKey((key) => key + 1)}
            isRefreshing={isLoading}
          />
          <div ref={setScrollNode} className="hide-scrollbar w-full overflow-x-auto">
            <table
              aria-label="Organizations"
              className="w-max min-w-full table-auto border-separate border-spacing-0"
            >
              <thead>
                <tr>
                  {ORGANIZATION_HEADERS.map((label, index) => (
                    <th
                      key={label}
                      className={`${HEADER_CELL_CLASS} ${index === 0 ? ORGANIZATION_HEADER_CLASS : ''} ${label === 'Top repo' ? TOP_REPO_COLUMN_CLASS : ''} ${ORGANIZATION_COLUMN_RESPONSIVE[label] ?? ''}`}
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <motion.tbody initial="hidden" animate="show" variants={gridStagger}>
                {filtered.map((organization) => {
                  const rowId = organizationKey(organization)
                  const isExpanded = expandedOrganization === rowId
                  const detailsId = detailsIdFor(organization)

                  return (
                    <Fragment key={rowId}>
                      <OrganizationRow
                        organization={organization}
                        isExpanded={isExpanded}
                        detailsId={detailsId}
                        onToggle={() => toggleOrganization(rowId)}
                      />
                      <AnimatePresence>
                        {isExpanded && (
                          <tr>
                            <td
                              colSpan={ORGANIZATION_HEADERS.length}
                              className="p-0 border-b border-row-divider bg-background/10 shadow-inner-sm"
                            >
                              <motion.div
                                id={detailsId}
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2, ease: 'easeInOut' }}
                                className="overflow-hidden"
                              >
                                <div className="sticky left-0" style={{ width: panelWidth }}>
                                  <OrganizationDetails organization={organization} />
                                </div>
                              </motion.div>
                            </td>
                          </tr>
                        )}
                      </AnimatePresence>
                    </Fragment>
                  )
                })}
              </motion.tbody>
            </table>
          </div>
        </div>
      )}
    </PageShell>
  )
}
