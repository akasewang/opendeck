import { REPOSITORY_TABLE_COLUMNS } from '@/features/repositories/data/repository-table-columns'
import type { RepositoryTableColumnKey } from '@/features/repositories/types/repository-table'
import { cn } from '@/utils/cn'

const HEADER_CELL_CLASS =
  'sticky top-0 z-20 whitespace-nowrap border-b border-b-row-divider bg-sidebar px-3 py-2 text-left text-2xs font-semibold uppercase tracking-normal text-muted-foreground/70 transition-shadow group-data-[scrolled]/scroll:shadow-table-header sm:px-4'
const NAME_COLUMN_BOUNDS =
  'w-auto min-w-[11rem] max-w-[22rem] sm:min-w-[18rem] sm:max-w-[28rem] md:min-w-[20rem] md:max-w-[34rem] lg:min-w-[24rem] lg:max-w-[42rem] xl:max-w-[50rem] 2xl:max-w-[58rem]'
const COLUMN_BOUNDS: Partial<Record<RepositoryTableColumnKey, string>> = {
  language: 'min-w-[8rem]',
  topics: 'min-w-[16rem]',
  open_issues_count: 'min-w-[7.5rem]',
  stargazers_count: 'min-w-[7rem]',
  contribution_score: 'min-w-[10.75rem]',
}

export function TableHeadRow() {
  return (
    <tr>
      {REPOSITORY_TABLE_COLUMNS.map(({ key, label }) => (
        <th
          key={key}
          scope="col"
          className={cn(
            HEADER_CELL_CLASS,
            COLUMN_BOUNDS[key],
            key === 'name' && ['left-0 z-30 border-r border-r-row-divider', NAME_COLUMN_BOUNDS],
            key === 'topics' && 'w-full',
          )}
        >
          {label}
        </th>
      ))}
    </tr>
  )
}
