import {
  Bell,
  Bookmark,
  Bug,
  Building2,
  Dashboard,
  Flame,
  Folder,
  GitPullRequest,
  Scales,
  Search,
  SearchEye,
  ShieldUser,
  UserStar,
} from '@/components/ui/icons'
import { APP_ROUTES, appRoute } from '@/config/routes'
import type { DashboardNavGroup } from '@/features/dashboard/types/dashboard-navigation'

export const DASHBOARD_NAV_GROUPS = [
  {
    title: 'General',
    items: [
      { name: 'Overview', link: APP_ROUTES.dashboard, icon: Dashboard },
      { name: 'Trending', link: APP_ROUTES.dashboardTrending, icon: Flame },
      { name: 'Discover', link: APP_ROUTES.dashboardDiscover, icon: Search },
      { name: 'Organizations', link: APP_ROUTES.dashboardOrganizations, icon: Building2 },
      { name: 'Compare', link: APP_ROUTES.dashboardCompare, icon: Scales },
    ],
  },
  {
    title: 'My Deck',
    items: [
      { name: 'Home', link: APP_ROUTES.dashboardHome, icon: UserStar, auth: true },
      { name: 'Library', link: appRoute.accountTab('library'), icon: Bookmark, auth: true },
      { name: 'Pipeline', link: appRoute.accountTab('pipeline'), icon: GitPullRequest, auth: true },
      { name: 'Issues', link: appRoute.accountTab('issues'), icon: Bug, auth: true },
      { name: 'Collections', link: appRoute.accountTab('collections'), icon: Folder, auth: true },
      { name: 'Searches', link: appRoute.accountTab('searches'), icon: SearchEye, auth: true },
      { name: 'Follows', link: appRoute.accountTab('follows'), icon: Bell, auth: true },
    ],
  },
  {
    title: 'Account',
    items: [{ name: 'Admin', link: APP_ROUTES.dashboardAdmin, icon: ShieldUser, admin: true }],
  },
] as const satisfies readonly DashboardNavGroup[]
