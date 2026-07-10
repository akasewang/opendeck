import type { MetadataRoute } from 'next'
import { APP_CONFIG } from '@/config/app'

const ROUTES = [
  '/',
  '/info',
  '/dashboard',
  '/dashboard/trending',
  '/dashboard/discover',
  '/dashboard/compare',
  '/dashboard/organizations',
]

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()

  return ROUTES.map((route) => ({
    url: `${APP_CONFIG.url}${route === '/' ? '' : route}`,
    lastModified: now,
    changeFrequency: route === '/' ? 'daily' : 'hourly',
    priority: route === '/' ? 1 : 0.8,
  }))
}
