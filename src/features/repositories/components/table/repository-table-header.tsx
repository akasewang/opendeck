import {
  REPOSITORY_TABLE_COLUMN_BOUNDS,
  REPOSITORY_TABLE_COLUMNS,
  REPOSITORY_TABLE_NAME_COLUMN_BOUNDS,
} from '@/features/repositories/data/repository-table-columns'
import { cn } from '@/utils/cn'

const HEADER_CELL_CLASS =
  'sticky top-0 z-20 whitespace-nowrap border-b border-b-row-divider bg-sidebar px-3 py-2 text-left text-2xs font-semibold uppercase tracking-normal text-muted-foreground/70 transition-shadow group-data-[scrolled]/scroll:shadow-table-header sm:px-4'

export function TableHeadRow() {
  return (
    <tr>
      {REPOSITORY_TABLE_COLUMNS.map(({ key, label }) => (
        <th
          key={key}
          scope="col"
          className={cn(
            HEADER_CELL_CLASS,
            REPOSITORY_TABLE_COLUMN_BOUNDS[key],
            key === 'name' && [
              'left-0 z-30 border-r border-r-row-divider',
              REPOSITORY_TABLE_NAME_COLUMN_BOUNDS,
            ],
            key === 'topics' && 'w-full',
          )}
        >
          {label}
        </th>
      ))}
    </tr>
  )
}
