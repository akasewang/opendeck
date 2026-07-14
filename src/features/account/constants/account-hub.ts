export const ACCOUNT_HUB_TABS = [
  { id: 'home', label: 'Home', icon: 'ri:dashboard-line' },
  { id: 'library', label: 'Library', icon: 'ri:bookmark-line' },
  { id: 'pipeline', label: 'Pipeline', icon: 'ri:git-pull-request-line' },
  { id: 'issues', label: 'Issues', icon: 'ri:bug-line' },
  { id: 'collections', label: 'Collections', icon: 'ri:folder-line' },
  { id: 'searches', label: 'Searches', icon: 'ri:search-eye-line' },
  { id: 'follows', label: 'Follows', icon: 'ri:notification-3-line' },
  { id: 'integrations', label: 'Email', icon: 'ri:mail-send-line' },
  { id: 'preferences', label: 'Preferences', icon: 'ri:equalizer-line' },
  { id: 'security', label: 'Security', icon: 'ri:shield-user-line' },
] as const

export type AccountHubTabId = (typeof ACCOUNT_HUB_TABS)[number]['id']
