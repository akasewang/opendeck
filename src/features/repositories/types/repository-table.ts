import type { RepositoryListItem } from '@/features/repositories/types/repository'

export type RepositoryTableColumnKey = keyof Pick<
  RepositoryListItem,
  'name' | 'language' | 'topics' | 'open_issues_count' | 'stargazers_count' | 'contribution_score'
>
