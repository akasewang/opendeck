import type { MetadataRoute } from 'next'
import { APP_CONFIG } from '@/config/application'
import { APP_ROUTES } from '@/config/routes'

const ROUTES = [
  APP_ROUTES.landing,
  APP_ROUTES.info,
  APP_ROUTES.dashboard,
  APP_ROUTES.dashboardTrending,
  APP_ROUTES.dashboardDiscover,
  APP_ROUTES.dashboardCompare,
  APP_ROUTES.dashboardOrganizations,
] as const

export default function sitemap(): MetadataRoute.Sitemap {
  return ROUTES.map((route) => ({
    url: `${APP_CONFIG.url}${route === APP_ROUTES.landing ? '' : route}`,
    changeFrequency: route === APP_ROUTES.landing ? 'daily' : 'hourly',
    priority: route === APP_ROUTES.landing ? 1 : 0.8,
  }))
}
