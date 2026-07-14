import type { IconType } from '@/components/ui/icons'

export type DashboardNavItem = {
  name: string
  link: string
  icon: IconType
  auth?: boolean
  admin?: boolean
}

export type DashboardNavGroup = {
  title: string
  items: readonly DashboardNavItem[]
}
