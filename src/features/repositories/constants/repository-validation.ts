export const GITHUB_OWNER_PATTERN = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/

export const REPOSITORY_FULL_NAME_PATTERN = new RegExp(
  `^${GITHUB_OWNER_PATTERN.source.slice(1, -1)}/(?!\\.{1,2}$)[A-Za-z0-9._-]{1,100}$`,
)

export const REPOSITORY_QUERY_LIMITS = {
  defaultPageSize: 20,
  maximumPageSize: 100,
} as const
