'use client'

import { Icon } from '@iconify/react'
import { AnimatePresence, motion, type Variants, useReducedMotion } from 'framer-motion'
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
import { cardVariants } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorBanner } from '@/components/ui/error-banner'
import { RefreshButton } from '@/components/ui/refresh-button'
import { ScrollShadow } from '@/components/ui/scroll-shadow'
import { SearchBar } from '@/components/ui/search-bar'
import Select from '@/components/ui/select'
import { Skeleton, skeletonStagger } from '@/components/ui/skeleton'
import { ColorfulTag, SimpleTag } from '@/components/ui/tag'
import { toast } from '@/components/ui/toast'
import { API_ROUTES, appRoute, withQuery } from '@/config/routes'
import { MOTION_DURATION_SECONDS, MOTION_EASING, MOTION_SPRING } from '@/config/motion'
import { useAuth } from '@/features/auth/providers/auth-provider'
import PageHeader from '@/features/dashboard/components/page-header'
import PageShell from '@/features/dashboard/components/page-shell'
import { useOrganizationProfile } from '@/features/organizations/hooks/use-organization-profile'
import {
  organizationFollowCache,
  prefetchOrganizationFollowStates,
} from '@/features/organizations/api/organization-follow-cache'
import type { Organization } from '@/features/organizations/types/organization'
import { isOrganization } from '@/features/organizations/utils/organization-response-validation'
import { formatDate, getLanguageTagStyle } from '@/features/repositories/utils/repository-display'
import { useSkeletonRowCount } from '@/hooks/use-skeleton-row-count'
import { isRecord } from '@/lib/api/input-normalization'
import { apiErrorMessage } from '@/lib/api/errors'
import { cn } from '@/utils/cn'
import { formatNumber } from '@/utils/format-number'
import { clearUrlParameter } from '@/lib/browser/url-state'

const MotionLink = motion.create(Link)

const TABLE_HEADERS = ['Organization', 'Language', 'Repos', 'Stars', 'Top repository'] as const

const TABLE_SURFACE_CLASS = cardVariants({
  className: 'flex min-h-0 flex-col overflow-hidden backdrop-blur-sm',
})

const HEADER_CELL_CLASS =
  'sticky top-0 z-20 whitespace-nowrap border-b border-b-row-divider bg-sidebar px-3 py-2 text-left text-2xs font-semibold uppercase tracking-normal text-muted-foreground/70 transition-shadow group-data-[scrolled]/scroll:shadow-table-header sm:px-4'

const TABLE_CELL_CLASS = 'border-b border-b-row-divider px-3 py-3 text-sm sm:px-4'

const OWNER_COLUMN_CLASS =
  'sticky left-0 z-10 min-w-[14rem] border-r border-r-row-divider bg-background sm:min-w-[16rem] md:min-w-[18rem]'

const OWNER_HEADER_CLASS =
  'left-0 z-30 min-w-[14rem] border-r border-r-row-divider bg-sidebar sm:min-w-[16rem] md:min-w-[18rem]'

const TOP_REPOSITORY_COLUMN_CLASS = 'min-w-[16rem] max-w-[26rem] md:min-w-[20rem] md:max-w-[34rem]'

const SKELETON_OWNER_WIDTHS = ['w-32', 'w-24', 'w-40', 'w-28', 'w-44', 'w-36', 'w-24', 'w-40']
const SKELETON_LANGUAGE_WIDTHS = ['w-20', 'w-14', 'w-16', 'w-24']
const SKELETON_COUNT_WIDTHS = ['w-10', 'w-14', 'w-8', 'w-12']
const SKELETON_REPO_WIDTHS = ['w-44', 'w-64', 'w-36', 'w-56', 'w-48']
const SKELETON_FIELD_WIDTHS = [
  'max-w-48',
  'max-w-36',
  'max-w-56',
  'max-w-40',
  'max-w-52',
  'max-w-32',
]

const GRID_STAGGER: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04 } },
}

const ROW_ITEM: Variants = {
  hidden: { opacity: 0, y: 6 },
  show: { opacity: 1, y: 0, transition: MOTION_SPRING.soft },
}

const SECTION_STAGGER: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
}

const SECTION_ITEM: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: MOTION_SPRING.standard },
}

const GROUP_STAGGER: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: {
    opacity: 1,
    y: 0,
    transition: { ...MOTION_SPRING.standard, staggerChildren: 0.04 },
  },
}

const CHIP_ITEM: Variants = {
  hidden: { opacity: 0, scale: 0.9, y: 4 },
  show: { opacity: 1, scale: 1, y: 0, transition: MOTION_SPRING.firmSoft },
}

const organizationKey = (organization: Organization) => organization.owner

const detailsIdFor = (organization: Organization) =>
  `organization-details-${organization.owner.replace(/[^a-zA-Z0-9_-]/g, '-')}`

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
      variants={CHIP_ITEM}
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
      variants={CHIP_ITEM}
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
            if (!copyText || !navigator.clipboard) {
              toast(`${label} could not be copied in this browser.`, { tone: 'error' })
              return
            }
            navigator.clipboard.writeText(copyText).then(
              () => toast(`${label} copied`),
              () => toast(`Unable to copy ${label.toLowerCase()}.`, { tone: 'error' }),
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
      variants={SECTION_ITEM}
      className={cn('@container min-w-0 space-y-2.5', className)}
    >
      <h2 className="text-balance text-xs font-semibold text-muted-foreground">{title}</h2>
      {children}
    </motion.section>
  )
}

function OrganizationPersonalPanel({ organization }: { organization: Organization }) {
  const { user } = useAuth()
  const userId = user?.id
  const [isFollowing, setIsFollowing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoadingState, setIsLoadingState] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const followRequestRef = useRef(0)

  const loadFollowState = useCallback(async () => {
    const requestId = followRequestRef.current + 1
    followRequestRef.current = requestId
    if (!userId) {
      setIsFollowing(false)
      setIsLoadingState(false)
      setLoadError(null)
      return
    }

    const cached = organizationFollowCache.get(organization.owner)
    if (cached !== undefined) {
      setIsFollowing(cached)
    } else {
      setIsLoadingState(true)
    }
    setLoadError(null)
    try {
      const params = new URLSearchParams({
        targetType: 'organization',
        targetKey: organization.owner,
      })
      const response = await fetch(`${API_ROUTES.account.follows}?${params.toString()}`, {
        credentials: 'include',
        cache: 'no-store',
      })
      const data: unknown = await response.json().catch(() => null)
      if (!response.ok) throw new Error(apiErrorMessage(data, 'Unable to load follow state.'))
      if (!isRecord(data) || typeof data.following !== 'boolean') {
        throw new Error('Account API returned an invalid follow response.')
      }
      if (followRequestRef.current !== requestId) return
      organizationFollowCache.set(organization.owner, data.following)
      setIsFollowing(data.following)
      setLoadError(null)
    } catch (error) {
      if (followRequestRef.current !== requestId) return
      if (cached === undefined) {
        setIsFollowing(false)
        setLoadError(error instanceof Error ? error.message : 'Unable to load follow state.')
      }
    } finally {
      if (followRequestRef.current === requestId) setIsLoadingState(false)
    }
  }, [organization.owner, userId])

  useEffect(() => {
    void loadFollowState()
  }, [loadFollowState])

  useEffect(() => {
    if (!userId) return
    void fetch(API_ROUTES.account.recent, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        targetType: 'organization',
        targetKey: organization.owner,
        metadata: { topRepo: organization.topRepo },
      }),
    }).catch(() => null)
  }, [organization.owner, organization.topRepo, userId])

  if (!userId) return null

  return (
    <motion.div variants={SECTION_ITEM} className={cardVariants({ className: 'p-4' })}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-balance text-xs font-semibold text-muted-foreground">My Deck</h2>
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
              const response = await fetch(API_ROUTES.account.follows, {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                  targetType: 'organization',
                  targetKey: organization.owner,
                  following: !isFollowing,
                }),
              })
              const data: unknown = await response.json().catch(() => null)
              if (!response.ok) {
                throw new Error(apiErrorMessage(data, 'Unable to update follow state.'))
              }
              if (!isRecord(data) || typeof data.following !== 'boolean') {
                throw new Error('Account API returned an invalid follow response.')
              }
              organizationFollowCache.set(organization.owner, data.following)
              setIsFollowing(data.following)
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
    <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border/50 px-3 py-2.5">
      <RefreshButton
        onClick={onRefresh}
        isRefreshing={isRefreshing}
        ariaLabel="Refresh organizations"
      />

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

function OrganizationSkeleton({ index = 0 }: { index?: number }) {
  const ownerWidth = SKELETON_OWNER_WIDTHS[index % SKELETON_OWNER_WIDTHS.length]
  const languageWidth = SKELETON_LANGUAGE_WIDTHS[index % SKELETON_LANGUAGE_WIDTHS.length]
  const reposWidth = SKELETON_COUNT_WIDTHS[index % SKELETON_COUNT_WIDTHS.length]
  const starsWidth = SKELETON_COUNT_WIDTHS[(index + 2) % SKELETON_COUNT_WIDTHS.length]
  const repoWidth = SKELETON_REPO_WIDTHS[index % SKELETON_REPO_WIDTHS.length]

  return (
    <tr style={skeletonStagger(index)}>
      <td className={`${TABLE_CELL_CLASS} ${OWNER_COLUMN_CLASS}`}>
        <div className="flex items-center gap-2.5">
          <Skeleton className="h-6 w-6 shrink-0" />
          <Skeleton className={cn('h-3.5 max-w-full', ownerWidth)} />
        </div>
      </td>
      <td className={TABLE_CELL_CLASS}>
        <Skeleton className={cn('h-5', languageWidth)} />
      </td>
      <td className={TABLE_CELL_CLASS}>
        <Skeleton className={cn('h-3.5', reposWidth)} />
      </td>
      <td className={TABLE_CELL_CLASS}>
        <Skeleton className={cn('h-3.5', starsWidth)} />
      </td>
      <td className={cn(TABLE_CELL_CLASS, TOP_REPOSITORY_COLUMN_CLASS)}>
        <Skeleton className={cn('h-3.5 max-w-full', repoWidth)} />
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
    <div className="@container p-4 md:p-5">
      <motion.div className="space-y-5" initial="hidden" animate="show" variants={SECTION_STAGGER}>
        <motion.div variants={SECTION_ITEM}>
          {isProfileLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-3.5 w-full max-w-2xl" />
              <Skeleton style={skeletonStagger(1)} className="h-3.5 w-3/4 max-w-xl" />
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

        <motion.div
          variants={GROUP_STAGGER}
          className="flex flex-wrap items-center gap-x-5 gap-y-2"
        >
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
                <Skeleton
                  key={index}
                  style={skeletonStagger(index)}
                  className={cn(
                    'h-4 w-full',
                    SKELETON_FIELD_WIDTHS[index % SKELETON_FIELD_WIDTHS.length],
                  )}
                />
              ))}
            </div>
          ) : profileError ? (
            <p className="text-sm text-muted-foreground">{profileError}</p>
          ) : hasProfileDetails ? (
            <motion.div
              variants={GROUP_STAGGER}
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
          <motion.div variants={GROUP_STAGGER} className="grid gap-x-6 gap-y-2 @sm:grid-cols-2">
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
              variants={GROUP_STAGGER}
              initial="hidden"
              animate="show"
              className="space-y-1.5"
            >
              {mirror.topRepos.map((repo) => {
                const repoLanguageStyle = repo.language ? getLanguageTagStyle(repo.language) : null

                return (
                  <MotionLink
                    key={repo.fullName}
                    variants={ROW_ITEM}
                    href={appRoute.discoverRepository(repo.fullName)}
                    onClick={(event) => event.stopPropagation()}
                    whileHover={{ x: 2 }}
                    className={cardVariants({
                      interactive: true,
                      className:
                        'flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-ring',
                    })}
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
      variants={ROW_ITEM}
      data-org-row={organization.owner}
      onClick={onToggle}
      aria-expanded={isExpanded}
      aria-controls={detailsId}
      aria-label={`${organization.owner}, ${isExpanded ? 'collapse' : 'expand'} details`}
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onToggle()
        }
      }}
      className="group cursor-pointer transition-colors hover:bg-row-hover"
    >
      <td
        className={cn(
          TABLE_CELL_CLASS,
          OWNER_COLUMN_CLASS,
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
      <td className={TABLE_CELL_CLASS}>
        {organization.topLanguage && languageStyle ? (
          <ColorfulTag style={languageStyle}>{organization.topLanguage}</ColorfulTag>
        ) : (
          <SimpleTag>-</SimpleTag>
        )}
      </td>
      <td className={TABLE_CELL_CLASS}>
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
      <td className={cn(TABLE_CELL_CLASS, TOP_REPOSITORY_COLUMN_CLASS)}>
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
  const prefersReducedMotion = useReducedMotion()
  const skeletonRowCount = useSkeletonRowCount({ node: scrollNode })

  useEffect(() => {
    const controller = new AbortController()

    async function fetchOrganizations() {
      setIsLoading(true)

      try {
        const response = await fetch(withQuery(API_ROUTES.organizations, { limit: 150 }), {
          signal: controller.signal,
          cache: refreshKey > 0 ? 'no-store' : 'default',
        })

        if (!response.ok) throw new Error('Failed to fetch organizations')

        const data: unknown = await response.json().catch(() => null)
        if (!isRecord(data) || !Array.isArray(data.items) || !data.items.every(isOrganization)) {
          throw new Error('Organization API returned an invalid response.')
        }
        setOrganizations(data.items)
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

  useEffect(() => {
    if (!user) return
    void prefetchOrganizationFollowStates(organizations.map((organization) => organization.owner))
  }, [organizations, user])

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
      clearUrlParameter('owner')

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
      clearUrlParameter('owner')
      return
    }
    const match = organizations.find(
      (organization) => organization.owner.toLowerCase() === ownerParam.toLowerCase(),
    )
    if (!match) {
      deepLinkApplied.current = true
      clearUrlParameter('owner')
      return
    }
    deepLinkApplied.current = true
    requestOrganizationExpansion(match.owner, 'Sign in to expand the linked organization details.')
    clearUrlParameter('owner')
    const frameId = requestAnimationFrame(() => {
      document
        .querySelector(`[data-org-row="${CSS.escape(match.owner)}"]`)
        ?.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'center' })
    })
    return () => cancelAnimationFrame(frameId)
  }, [isLoading, organizations, prefersReducedMotion, requestOrganizationExpansion])

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
    clearUrlParameter('owner')
    requestOrganizationExpansion(rowId)
  }

  return (
    <PageShell className="flex h-full min-h-0 flex-col gap-5" aria-busy={isLoading}>
      <div role="status" aria-live="polite" className="sr-only">
        {isLoading
          ? 'Loading organizations'
          : error
            ? error
            : `${filtered.length} organizations loaded`}
      </div>
      <PageHeader
        title="Organizations"
        description="Top open source organizations shaping the developer ecosystem."
        count={filtered.length}
        actions={
          <Select
            value={language}
            onChange={(event) => setLanguage(event.target.value)}
            options={languageOptions}
            placeholder="All Languages"
            ariaLabel="Filter organizations by language"
            className="w-full sm:w-44"
          />
        }
      />

      {isLoading ? (
        <div className={cn(TABLE_SURFACE_CLASS, 'flex-1')}>
          <OrganizationToolbar
            query={query}
            onQueryChange={setQuery}
            onRefresh={() => setRefreshKey((key) => key + 1)}
            isRefreshing={isLoading}
          />
          <ScrollShadow
            wrapperClassName="min-h-0 flex-1"
            className="w-full"
            viewportRef={setScrollNode}
          >
            <table
              aria-hidden="true"
              className="w-max min-w-full table-auto border-separate border-spacing-0"
            >
              <thead>
                <tr>
                  {TABLE_HEADERS.map((label, index) => (
                    <th
                      key={label}
                      scope="col"
                      className={`${HEADER_CELL_CLASS} ${index === 0 ? OWNER_HEADER_CLASS : ''} ${label === 'Top repository' ? TOP_REPOSITORY_COLUMN_CLASS : ''}`}
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: skeletonRowCount }).map((_, i) => (
                  <OrganizationSkeleton key={i} index={i} />
                ))}
              </tbody>
            </table>
          </ScrollShadow>
        </div>
      ) : error ? (
        <div className={cn(TABLE_SURFACE_CLASS, 'flex-1')}>
          <OrganizationToolbar
            query={query}
            onQueryChange={setQuery}
            onRefresh={() => setRefreshKey((key) => key + 1)}
            isRefreshing={isLoading}
          />
          <section className="p-4">
            <ErrorBanner message={error} onRetry={() => setRefreshKey((key) => key + 1)} />
          </section>
        </div>
      ) : filtered.length === 0 ? (
        <div className={cn(TABLE_SURFACE_CLASS, 'flex-1')}>
          <OrganizationToolbar
            query={query}
            onQueryChange={setQuery}
            onRefresh={() => setRefreshKey((key) => key + 1)}
            isRefreshing={isLoading}
          />
          <section className="p-4">
            <EmptyState
              icon="ri:building-line"
              title={
                organizations.length === 0
                  ? 'No organizations indexed'
                  : 'No matching organizations'
              }
              description={emptyMessage}
            />
          </section>
        </div>
      ) : (
        <div className={cn(TABLE_SURFACE_CLASS, 'flex-1')}>
          <OrganizationToolbar
            query={query}
            onQueryChange={setQuery}
            onRefresh={() => setRefreshKey((key) => key + 1)}
            isRefreshing={isLoading}
          />
          <ScrollShadow
            wrapperClassName="min-h-0 flex-1"
            className="w-full"
            viewportRef={setScrollNode}
            backToTop
          >
            <table
              aria-label="Organizations"
              className="w-max min-w-full table-auto border-separate border-spacing-0"
            >
              <thead>
                <tr>
                  {TABLE_HEADERS.map((label, index) => (
                    <th
                      key={label}
                      scope="col"
                      className={`${HEADER_CELL_CLASS} ${index === 0 ? OWNER_HEADER_CLASS : ''} ${label === 'Top repository' ? TOP_REPOSITORY_COLUMN_CLASS : ''}`}
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <motion.tbody initial="hidden" animate="show" variants={GRID_STAGGER}>
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
                              colSpan={TABLE_HEADERS.length}
                              className="p-0 border-b border-b-row-divider bg-background/10 shadow-inner-sm"
                            >
                              <motion.div
                                id={detailsId}
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{
                                  duration: MOTION_DURATION_SECONDS.quick,
                                  ease: MOTION_EASING.symmetric,
                                }}
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
          </ScrollShadow>
        </div>
      )}
    </PageShell>
  )
}
