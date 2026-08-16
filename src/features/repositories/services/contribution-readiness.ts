import { DAY_MS, toDate } from '@/utils/time'

export const CONTRIBUTION_ACTIVE_WITHIN_DAYS = 365
export const CONTRIBUTION_RECENT_ACTIVITY_DAYS = 90
export const CONTRIBUTION_FRESH_ACTIVITY_DAYS = 30
export const CONTRIBUTION_READY_MIN_OPEN_ISSUES = 1
export const CONTRIBUTION_STRONG_ISSUE_COUNT = 5
export const CONTRIBUTION_ISSUE_BACKLOG_LIMIT = 2000
export const CONTRIBUTION_POPULAR_STARS_MIN = 10
export const CONTRIBUTION_POPULAR_STARS_MAX = 50_000
export const CONTRIBUTION_SWEET_SPOT_STARS_MIN = 50
export const CONTRIBUTION_SWEET_SPOT_STARS_MAX = 20_000

export const STARTER_FRIENDLY_TOPICS = [
  'good-first-issue',
  'good first issue',
  'help-wanted',
  'help wanted',
  'up-for-grabs',
  'first-timers-only',
  'beginner-friendly',
  'starter-issues',
  'hacktoberfest',
] as const

export const NON_PROJECT_TOPICS = [
  'awesome-list',
  'awesome-lists',
  'lists',
  'curated-list',
  'resource-list',
  'learning-resources',
  'roadmap',
  'interview-preparation',
  'books',
  'tutorials',
] as const

const NON_PROJECT_DESCRIPTION_PATTERNS = [
  'awesome list',
  'awesome lists',
  'curated list',
  'curated collection',
  'collection of resources',
  'list of resources',
  'roadmap to',
  'interview questions',
] as const

type ContributionCandidate = {
  fullName?: string | null
  name?: string | null
  isArchived?: boolean | null
  isFork?: boolean | null
  isMirror?: boolean | null
  isTemplate?: boolean | null
  license?: string | null
  language?: string | null
  openIssues?: number | null
  hasGoodFirstIssues?: boolean | null
  helpWantedIssues?: number | boolean | null
  topics?: string[] | null
  stars?: number | null
  forks?: number | null
  defaultBranch?: string | null
  description?: string | null
  readmeExcerpt?: string | null
  pushedAt?: Date | string | null
}

type ContributionReadiness = {
  isReady: boolean
  starterFriendly: boolean
  score: number
  blockers: string[]
}

function daysSince(value?: Date | string | null, now = new Date()) {
  const date = toDate(value)
  if (!date) return null

  return Math.floor((now.getTime() - date.getTime()) / DAY_MS)
}

function hasStarterFriendlyTopic(candidate: ContributionCandidate) {
  const topics = new Set((candidate.topics || []).map((topic) => topic.toLowerCase()))
  return STARTER_FRIENDLY_TOPICS.some((topic) => topics.has(topic))
}

function hasNonProjectTopic(candidate: ContributionCandidate) {
  const topics = new Set((candidate.topics || []).map((topic) => topic.toLowerCase()))
  return NON_PROJECT_TOPICS.some((topic) => topics.has(topic))
}

function hasProjectContext(candidate: ContributionCandidate) {
  return Boolean(candidate.description?.trim() || candidate.readmeExcerpt?.trim())
}

export function looksLikeResourceCollection(candidate: ContributionCandidate) {
  if (hasNonProjectTopic(candidate)) return true

  const text = [candidate.name, candidate.fullName, candidate.description]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  return NON_PROJECT_DESCRIPTION_PATTERNS.some((pattern) => text.includes(pattern))
}

export function getSetupDifficulty(candidate: ContributionCandidate) {
  const signals = [candidate.readmeExcerpt, candidate.description, candidate.topics?.join(' ')]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  if (signals.includes('docker') || signals.includes('monorepo')) return 'advanced' as const
  if (
    signals.includes('quickstart') ||
    signals.includes('getting started') ||
    candidate.hasGoodFirstIssues
  ) {
    return 'easy' as const
  }
  return 'medium' as const
}

function hasHelpWantedIssues(candidate: ContributionCandidate) {
  const value = candidate.helpWantedIssues
  return typeof value === 'number' ? value > 0 : Boolean(value)
}

export function getContributionReadiness(
  candidate: ContributionCandidate,
  now = new Date(),
): ContributionReadiness {
  const openIssues = candidate.openIssues ?? 0
  const stars = candidate.stars ?? 0
  const forks = candidate.forks ?? 0
  const lastPushedDaysAgo = daysSince(candidate.pushedAt, now)
  const active = lastPushedDaysAgo !== null && lastPushedDaysAgo <= CONTRIBUTION_ACTIVE_WITHIN_DAYS
  const starterTopic = hasStarterFriendlyTopic(candidate)
  const starterFriendly =
    Boolean(candidate.hasGoodFirstIssues) || hasHelpWantedIssues(candidate) || starterTopic
  const projectContext = hasProjectContext(candidate)

  const blockers: string[] = []
  let score = 0

  if (candidate.isArchived) blockers.push('Archived')
  else score += 10

  if (candidate.isFork) blockers.push('Fork')
  if (candidate.isMirror) blockers.push('Mirror')
  if (candidate.isTemplate) blockers.push('Template')
  if (looksLikeResourceCollection(candidate)) blockers.push('Resource list')

  if (candidate.language) {
    score += 10
  } else {
    blockers.push('No primary language')
  }

  if (candidate.license) {
    score += 15
  } else {
    blockers.push('No license')
  }

  if (candidate.defaultBranch) score += 5

  if (active) {
    if (lastPushedDaysAgo !== null && lastPushedDaysAgo <= CONTRIBUTION_FRESH_ACTIVITY_DAYS) {
      score += 18
    } else if (
      lastPushedDaysAgo !== null &&
      lastPushedDaysAgo <= CONTRIBUTION_RECENT_ACTIVITY_DAYS
    ) {
      score += 15
    } else {
      score += 10
    }
  } else {
    blockers.push('Inactive')
  }

  if (openIssues >= CONTRIBUTION_READY_MIN_OPEN_ISSUES) {
    score += openIssues >= CONTRIBUTION_STRONG_ISSUE_COUNT ? 15 : 8
    if (openIssues > CONTRIBUTION_ISSUE_BACKLOG_LIMIT) score -= 8
  } else {
    blockers.push('No open issues')
  }

  if (candidate.hasGoodFirstIssues) {
    score += 25
  } else if (hasHelpWantedIssues(candidate)) {
    score += 20
  } else if (starterTopic) {
    score += 12
  }

  if (projectContext) {
    score += 10
  } else {
    blockers.push('No project context')
  }

  if (stars >= CONTRIBUTION_SWEET_SPOT_STARS_MIN && stars <= CONTRIBUTION_SWEET_SPOT_STARS_MAX)
    score += 12
  else if (stars >= CONTRIBUTION_POPULAR_STARS_MIN && stars <= CONTRIBUTION_POPULAR_STARS_MAX)
    score += 8
  else if (stars > 0) score += 4

  if (forks > 0) score += 5

  return {
    isReady: blockers.length === 0,
    starterFriendly,
    score: Math.max(0, Math.min(score, 100)),
    blockers,
  }
}

export function shouldIngestContributionCandidate(candidate: ContributionCandidate) {
  return getContributionReadiness(candidate).isReady
}
