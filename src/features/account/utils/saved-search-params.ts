import type { RepoSearchParams } from '@/features/repositories/types/repository-query'
import {
  cleanOptionalText,
  normalizeNumber,
  parseIntegerValue,
} from '@/lib/api/input-normalization'

const SAVED_SEARCH_SORTS = [
  'stars',
  'forks',
  'recent',
  'updated',
  'relevance',
  'contribution',
] as const

export function savedSearchParams(
  filters: Record<string, unknown>,
  query?: string | null,
): RepoSearchParams {
  return {
    query: query || undefined,
    language: cleanOptionalText(filters.language, 80) ?? undefined,
    topic: cleanOptionalText(filters.topic, 160) ?? undefined,
    minStars: filters.minStars === undefined ? undefined : normalizeNumber(filters.minStars),
    maxStars: filters.maxStars === undefined ? undefined : normalizeNumber(filters.maxStars),
    activeOnly: filters.activeOnly === true,
    contributionReadyOnly: filters.contributionReadyOnly !== false,
    starterFriendlyOnly: filters.starterFriendlyOnly === true,
    hasGoodFirstIssues:
      filters.hasGoodFirstIssues === true ||
      (filters.hasGoodFirstIssues === false && filters.hasGoodFirstIssuesSet === true)
        ? filters.hasGoodFirstIssues
        : undefined,
    sort:
      filters.sort === 'stars' ||
      filters.sort === 'forks' ||
      filters.sort === 'recent' ||
      filters.sort === 'updated' ||
      filters.sort === 'relevance'
        ? filters.sort
        : 'contribution',
    perPage: 12,
  }
}

export function savedSearchFilters(filters: Record<string, unknown>) {
  const minStars = parseIntegerValue(filters.minStars ?? 0)
  const maxStars = filters.maxStars === undefined ? undefined : parseIntegerValue(filters.maxStars)
  if (minStars === undefined || minStars < 0) {
    throw new Error('Minimum stars must be a non-negative integer.')
  }
  if (maxStars !== undefined && maxStars < 0) {
    throw new Error('Maximum stars must be a non-negative integer.')
  }
  if (maxStars !== undefined && minStars > maxStars) {
    throw new Error('Minimum stars cannot exceed maximum stars.')
  }
  for (const name of ['activeOnly', 'contributionReadyOnly', 'starterFriendlyOnly'] as const) {
    if (filters[name] !== undefined && typeof filters[name] !== 'boolean') {
      throw new Error(`${name} must be true or false.`)
    }
  }
  if (filters.hasGoodFirstIssues !== undefined && typeof filters.hasGoodFirstIssues !== 'boolean') {
    throw new Error('hasGoodFirstIssues must be true or false.')
  }
  const sort = filters.sort ?? 'contribution'
  if (!SAVED_SEARCH_SORTS.some((candidate) => candidate === sort)) {
    throw new Error('Invalid saved-search sort.')
  }

  const next: Record<string, unknown> = {
    language: cleanOptionalText(filters.language, 80),
    topic: cleanOptionalText(filters.topic, 160),
    minStars,
    activeOnly: filters.activeOnly === true,
    contributionReadyOnly: filters.contributionReadyOnly !== false,
    starterFriendlyOnly: filters.starterFriendlyOnly === true,
    sort,
  }

  if (maxStars !== undefined) next.maxStars = maxStars
  if (typeof filters.hasGoodFirstIssues === 'boolean') {
    next.hasGoodFirstIssues = filters.hasGoodFirstIssues
    next.hasGoodFirstIssuesSet = true
  }

  return next
}
