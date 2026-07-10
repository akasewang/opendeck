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

export const navLinks = [
  {
    title: 'General',
    items: [
      { name: 'Overview', link: '/dashboard', icon: Dashboard },
      { name: 'Trending', link: '/dashboard/trending', icon: Flame },
      { name: 'Discover', link: '/dashboard/discover', icon: Search },
      { name: 'Organizations', link: '/dashboard/organizations', icon: Building2 },
      { name: 'Compare', link: '/dashboard/compare', icon: Scales },
    ],
  },
  {
    title: 'My Deck',
    items: [
      { name: 'Home', link: '/dashboard/home', icon: UserStar, auth: true },
      { name: 'Library', link: '/dashboard/home?tab=library', icon: Bookmark, auth: true },
      { name: 'Pipeline', link: '/dashboard/home?tab=pipeline', icon: GitPullRequest, auth: true },
      { name: 'Issues', link: '/dashboard/home?tab=issues', icon: Bug, auth: true },
      { name: 'Collections', link: '/dashboard/home?tab=collections', icon: Folder, auth: true },
      { name: 'Searches', link: '/dashboard/home?tab=searches', icon: SearchEye, auth: true },
      { name: 'Follows', link: '/dashboard/home?tab=follows', icon: Bell, auth: true },
    ],
  },
  {
    title: 'Account',
    items: [{ name: 'Admin', link: '/dashboard/admin', icon: ShieldUser, admin: true }],
  },
]
