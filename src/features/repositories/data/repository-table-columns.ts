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
