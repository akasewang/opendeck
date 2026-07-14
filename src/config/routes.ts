export const APP_ROUTES = {
  landing: '/',
  info: '/info',
  dashboard: '/dashboard',
  dashboardAdmin: '/dashboard/admin',
  dashboardCompare: '/dashboard/compare',
  dashboardDiscover: '/dashboard/discover',
  dashboardHome: '/dashboard/home',
  dashboardOrganizations: '/dashboard/organizations',
  dashboardTrending: '/dashboard/trending',
} as const

export const appRoute = {
  accountTab(tab: string) {
    return tab === 'home' ? APP_ROUTES.dashboardHome : `${APP_ROUTES.dashboardHome}?tab=${tab}`
  },
  compareRepositories(repositories: string[]) {
    const query = new URLSearchParams({ repos: repositories.join(',') })
    return `${APP_ROUTES.dashboardCompare}?${query.toString()}`
  },
  discoverRepository(fullName: string) {
    const query = new URLSearchParams({ repo: fullName })
    return `${APP_ROUTES.dashboardDiscover}?${query.toString()}`
  },
  organization(owner: string) {
    const query = new URLSearchParams({ owner })
    return `${APP_ROUTES.dashboardOrganizations}?${query.toString()}`
  },
  repository(fullName: string) {
    const path = fullName.split('/').map(encodeURIComponent).join('/')
    return `${APP_ROUTES.dashboard}/repos/${path}`
  },
  sharedCollection(slug: string) {
    return `/shared/collections/${slug}`
  },
} as const

export const API_ROUTES = {
  account: {
    alertsRead: '/api/account/alerts/read',
    collections: '/api/account/collections',
    collectionDelete: '/api/account/collections/delete',
    collectionItem: '/api/account/collections/item',
    collectionShare: '/api/account/collections/share',
    collectionTemplate: '/api/account/collections/template',
    delete: '/api/account/delete',
    export: '/api/account/export',
    follows: '/api/account/follows',
    followsBatch: '/api/account/follows/batch',
    issues: '/api/account/issues',
    journal: '/api/account/journal',
    journalDelete: '/api/account/journal/delete',
    onboarding: '/api/account/onboarding',
    overview: '/api/account/overview',
    preferences: '/api/account/preferences',
    profile: '/api/account/profile',
    recent: '/api/account/recent',
    recommendations: '/api/account/recommendations',
    repository: '/api/account/repo',
    repositoryBatch: '/api/account/repo/batch',
    savedSearches: '/api/account/saved-searches',
    savedSearchDelete: '/api/account/saved-searches/delete',
    savedSearchPreview: '/api/account/saved-searches/preview',
    sessionRevoke: '/api/account/sessions/revoke',
    sessionsSignOut: '/api/account/sessions/sign-out-all',
  },
  admin: {
    allowlist: '/api/admin/allowlist',
    allowlistDelete: '/api/admin/allowlist/delete',
    ingestion: '/api/admin/ingestion',
    invites: '/api/admin/invites',
    security: '/api/admin/security',
    users: '/api/admin/users',
    userDelete: '/api/admin/users/delete',
  },
  auth: {
    magicLink: '/api/auth/magic-link',
    magicLinkCallback: '/api/auth/magic-link/callback',
    session: '/api/auth/session',
    signOut: '/api/auth/sign-out',
  },
  curated: '/api/curated',
  githubStars: '/api/github-stars',
  githubTrending: '/api/github-trending',
  organizations: '/api/organizations',
  organizationProfile: '/api/organizations/profile',
  repositories: {
    compare: '/api/repos/compare',
    contributors: '/api/repos/contributors',
    detail: '/api/repos/detail',
    document: '/api/repos/document',
  },
  search: '/api/search',
} as const

export function withQuery(
  path: string,
  values: Record<string, string | number | boolean | null | undefined>,
) {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined && value !== null && value !== '') query.set(key, String(value))
  }
  const serialized = query.toString()
  return serialized ? `${path}?${serialized}` : path
}
