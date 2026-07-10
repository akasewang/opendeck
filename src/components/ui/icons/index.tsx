import { Icon, type IconProps as IconifyIconProps } from '@iconify/react'
import type { ComponentType } from 'react'

type IconProps = Omit<IconifyIconProps, 'icon'> & { size?: number }
type IconType = ComponentType<IconProps>

function icon(name: string): IconType {
  const Component = ({ size, width, height, ...props }: IconProps) => (
    <Icon icon={name} width={width ?? size} height={height ?? size} {...props} />
  )
  Component.displayName = name
  return Component
}

export const Bell = icon('ri:notification-3-line')
export const Bookmark = icon('ri:bookmark-line')
export const Bug = icon('ri:bug-line')
export const Building2 = icon('ri:building-2-line')
export const Check = icon('ri:check-line')
export const Folder = icon('ri:folder-line')
export const GitPullRequest = icon('ri:git-pull-request-line')
export const Lock = icon('ri:lock-line')
export const Scales = icon('ri:scales-3-line')
export const SearchEye = icon('ri:search-eye-line')
export const ChevronDown = icon('ri:arrow-down-s-line')
export const Dashboard = icon('ri:dashboard-line')
export const ExternalLink = icon('ri:external-link-line')
export const Flame = icon('ri:fire-line')
export const Github = icon('ri:github-line')
export const Menu = icon('ri:menu-line')
export const ShieldUser = icon('ri:shield-user-line')
export const Search = icon('ri:search-line')
export const SquareArrowOutUpRight = icon('ri:arrow-right-up-line')
export const UserStar = icon('ri:user-star-line')
export const Volume2 = icon('ri:volume-up-line')
export const VolumeX = icon('ri:volume-mute-line')
export const X = icon('ri:close-line')
