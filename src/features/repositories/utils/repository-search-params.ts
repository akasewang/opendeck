import { REPOSITORY_SEARCH_SORTS } from '@/features/repositories/constants/repository-options'
import type { RepoSearchParams } from '@/features/repositories/types/repository-query'
import {
  invalidEnumMessage,
  parseDate,
  parseEnum,
  parseOptionalInteger,
  parseOptionalTextParameter,
} from '@/lib/api/query-parameters'

type RepositorySearchDefaults = {
  sort: NonNullable<RepoSearchParams['sort']>
  perPage?: number
  contributionReadyOnly?: boolean
  includeQueryAlias?: boolean
}

export function parseRepositorySearchParams(
  searchParams: URLSearchParams,
  defaults: RepositorySearchDefaults,
) {
  const sortParam = searchParams.get('sort')
  const sort = parseEnum(sortParam, REPOSITORY_SEARCH_SORTS)

  if (sortParam && !sort) {
    return {
      error: invalidEnumMessage('sort', sortParam, REPOSITORY_SEARCH_SORTS),
      params: null,
    } as const
  }

  const integerParams = [
    ['minStars', 0, undefined],
    ['maxStars', 0, undefined],
    ['minForks', 0, undefined],
    ['maxForks', 0, undefined],
    ['minContributors', 0, undefined],
    ['page', 1, 10_000],
    ['per_page', 1, 100],
  ] as const
  const integers = new Map<string, number | undefined>()
  for (const [name, min, max] of integerParams) {
    const parsed = parseOptionalInteger(name, searchParams.get(name), { min, max })
    if (parsed.error) return { error: parsed.error, params: null } as const
    integers.set(name, parsed.value)
  }

  const minStars = integers.get('minStars')
  const maxStars = integers.get('maxStars')
  const minForks = integers.get('minForks')
  const maxForks = integers.get('maxForks')
  if (minStars !== undefined && maxStars !== undefined && minStars > maxStars) {
    return { error: 'minStars cannot be greater than maxStars.', params: null } as const
  }
  if (minForks !== undefined && maxForks !== undefined && minForks > maxForks) {
    return { error: 'minForks cannot be greater than maxForks.', params: null } as const
  }

  const booleanNames = [
    'activeOnly',
    'contributionReadyOnly',
    'starterFriendlyOnly',
    'hasGoodFirstIssues',
  ] as const
  for (const name of booleanNames) {
    const value = searchParams.get(name)
    if (value !== null && value !== 'true' && value !== 'false') {
      return { error: `${name} must be true or false.`, params: null } as const
    }
  }

  const dateNames = ['pushedAfter', 'createdAfter', 'updatedAfter'] as const
  const dates = new Map<string, Date | undefined>()
  for (const name of dateNames) {
    const value = searchParams.get(name)
    const parsed = parseDate(value)
    if (value && !parsed) return { error: `${name} must be a valid date.`, params: null } as const
    dates.set(name, parsed)
  }

  const textLimits = {
    q: 200,
    query: 200,
    language: 80,
    topic: 500,
    license: 80,
  } as const
  const texts = new Map<string, string | undefined>()
  for (const [name, maxLength] of Object.entries(textLimits)) {
    const parsed = parseOptionalTextParameter(name, searchParams.get(name), maxLength)
    if (parsed.error) return { error: parsed.error, params: null } as const
    texts.set(name, parsed.value)
  }

  return {
    error: null,
    params: {
      query:
        texts.get('q') ||
        (defaults.includeQueryAlias ? texts.get('query') : undefined) ||
        undefined,
      language: texts.get('language'),
      topic: texts.get('topic'),
      license: texts.get('license'),
      minStars,
      maxStars,
      minForks,
      maxForks,
      minContributors: integers.get('minContributors'),
      pushedAfter: dates.get('pushedAfter'),
      createdAfter: dates.get('createdAfter'),
      updatedAfter: dates.get('updatedAfter'),
      activeOnly: searchParams.get('activeOnly') === 'true',
      contributionReadyOnly:
        searchParams.get('contributionReadyOnly') === null
          ? defaults.contributionReadyOnly
          : searchParams.get('contributionReadyOnly') === 'true',
      starterFriendlyOnly: searchParams.get('starterFriendlyOnly') === 'true',
      hasGoodFirstIssues:
        searchParams.get('hasGoodFirstIssues') === null
          ? undefined
          : searchParams.get('hasGoodFirstIssues') === 'true',
      page: integers.get('page'),
      perPage: integers.get('per_page') ?? defaults.perPage,
      sort: sort || defaults.sort,
    } satisfies RepoSearchParams,
  } as const
}
