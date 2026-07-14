import type { RepositoryTableColumnKey } from '@/features/repositories/types/repository-table'

export const REPOSITORY_TABLE_COLUMNS: {
  key: RepositoryTableColumnKey
  label: string
}[] = [
  { key: 'name', label: 'Repository' },
  { key: 'language', label: 'Language' },
  { key: 'topics', label: 'Tags' },
  { key: 'open_issues_count', label: 'Issues' },
  { key: 'stargazers_count', label: 'Stars' },
  { key: 'contribution_score', label: 'Fit' },
]

export const REPOSITORY_TABLE_NAME_COLUMN_BOUNDS =
  'w-auto min-w-[11rem] max-w-[22rem] sm:min-w-[18rem] sm:max-w-[28rem] md:min-w-[20rem] md:max-w-[34rem] lg:min-w-[24rem] lg:max-w-[42rem] xl:max-w-[50rem] 2xl:max-w-[58rem]'

export const REPOSITORY_TABLE_COLUMN_BOUNDS: Partial<Record<RepositoryTableColumnKey, string>> = {
  language: 'min-w-[8rem]',
  topics: 'min-w-[16rem]',
  open_issues_count: 'min-w-[7.5rem]',
  stargazers_count: 'min-w-[7rem]',
  contribution_score: 'min-w-[10.75rem]',
}
