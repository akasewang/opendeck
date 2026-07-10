import type { ColumnKey } from '@/features/repositories/types'

export const REPOSITORY_COLUMN_BOUNDS =
  'w-auto min-w-[11rem] max-w-[22rem] sm:min-w-[18rem] sm:max-w-[28rem] md:min-w-[20rem] md:max-w-[34rem] lg:min-w-[24rem] lg:max-w-[42rem] xl:max-w-[50rem] 2xl:max-w-[58rem]'
export const TABLE_CELL_BORDER = 'border-b border-row-divider'
export const REPOSITORY_COLUMN_DIVIDER = 'border-r border-row-divider'
export const LOADING_MORE_SKELETON_COUNT = 5

export const COLUMN_BOUNDS: Partial<Record<ColumnKey, string>> = {
  language: 'min-w-[8rem]',
  topics: 'min-w-[16rem]',
  open_issues_count: 'min-w-[7.5rem]',
  stargazers_count: 'min-w-[7rem]',
  contribution_score: 'min-w-[10.75rem]',
}

