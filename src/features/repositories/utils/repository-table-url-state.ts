import type { RepositoryListItem } from '@/features/repositories/types/repository'

export const repoKey = (record: RepositoryListItem, index: number) =>
  record.id ?? record.full_name ?? record.html_url ?? `${record.name}-${index}`
