import { COLUMNS } from '@/features/repositories/types'
import { cn } from '@/utils/cn'
import {
  COLUMN_BOUNDS,
  REPOSITORY_COLUMN_BOUNDS,
  REPOSITORY_COLUMN_DIVIDER,
  TABLE_CELL_BORDER,
} from './constants'

export function TableHeadRow() {
  return (
    <tr>
      {COLUMNS.map(({ key, label }) => (
        <th
          key={key}
          className={cn(
            'whitespace-nowrap px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-normal text-muted-foreground/70 sm:px-4',
            TABLE_CELL_BORDER,
            COLUMN_BOUNDS[key],
            key === 'name'
              ? [
                  'sticky left-0 z-20 bg-background',
                  REPOSITORY_COLUMN_BOUNDS,
                  REPOSITORY_COLUMN_DIVIDER,
                ]
              : 'bg-background/30',
            key === 'topics' && 'w-full',
          )}
        >
          {label}
        </th>
      ))}
    </tr>
  )
}
