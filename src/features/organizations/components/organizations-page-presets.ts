import type { Variants } from 'framer-motion'
import { cardVariants } from '@/components/ui/card'
import { MOTION_SPRING } from '@/config/motion'
import type { Organization } from '@/features/organizations/types/organization'

export const TABLE_HEADERS = [
  'Organization',
  'Language',
  'Repos',
  'Stars',
  'Top repository',
] as const

export const TABLE_SURFACE_CLASS = cardVariants({
  className: 'flex min-h-0 flex-col overflow-hidden backdrop-blur-sm',
})

export const HEADER_CELL_CLASS =
  'sticky top-0 z-20 whitespace-nowrap border-b border-b-row-divider bg-sidebar px-3 py-2 text-left text-2xs font-semibold uppercase tracking-normal text-muted-foreground/70 transition-shadow group-data-[scrolled]/scroll:shadow-table-header sm:px-4'

export const TABLE_CELL_CLASS = 'border-b border-b-row-divider px-3 py-3 text-sm sm:px-4'

export const OWNER_COLUMN_CLASS =
  'sticky left-0 z-10 min-w-[14rem] border-r border-r-row-divider bg-background sm:min-w-[16rem] md:min-w-[18rem]'

export const OWNER_HEADER_CLASS =
  'left-0 z-30 min-w-[14rem] border-r border-r-row-divider bg-sidebar sm:min-w-[16rem] md:min-w-[18rem]'

export const TOP_REPOSITORY_COLUMN_CLASS =
  'min-w-[16rem] max-w-[26rem] md:min-w-[20rem] md:max-w-[34rem]'

export const SKELETON_OWNER_WIDTHS = [
  'w-32',
  'w-24',
  'w-40',
  'w-28',
  'w-44',
  'w-36',
  'w-24',
  'w-40',
]
export const SKELETON_LANGUAGE_WIDTHS = ['w-20', 'w-14', 'w-16', 'w-24']
export const SKELETON_COUNT_WIDTHS = ['w-10', 'w-14', 'w-8', 'w-12']
export const SKELETON_REPO_WIDTHS = ['w-44', 'w-64', 'w-36', 'w-56', 'w-48']
export const SKELETON_FIELD_WIDTHS = [
  'max-w-48',
  'max-w-36',
  'max-w-56',
  'max-w-40',
  'max-w-52',
  'max-w-32',
]

export const GRID_STAGGER: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04 } },
}

export const ROW_ITEM: Variants = {
  hidden: { opacity: 0, y: 6 },
  show: { opacity: 1, y: 0, transition: MOTION_SPRING.soft },
}

export const SECTION_STAGGER: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
}

export const SECTION_ITEM: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: MOTION_SPRING.standard },
}

export const GROUP_STAGGER: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: {
    opacity: 1,
    y: 0,
    transition: { ...MOTION_SPRING.standard, staggerChildren: 0.04 },
  },
}

export const CHIP_ITEM: Variants = {
  hidden: { opacity: 0, scale: 0.9, y: 4 },
  show: { opacity: 1, scale: 1, y: 0, transition: MOTION_SPRING.firmSoft },
}

export const organizationKey = (organization: Organization) => organization.owner

export const detailsIdFor = (organization: Organization) =>
  `organization-details-${organization.owner.replace(/[^a-zA-Z0-9_-]/g, '-')}`
