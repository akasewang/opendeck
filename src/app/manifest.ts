import type { MetadataRoute } from 'next'
import { APP_CONFIG } from '@/config/application'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: APP_CONFIG.name,
    short_name: APP_CONFIG.name,
    description: APP_CONFIG.description,
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: APP_CONFIG.themeColor,
    theme_color: APP_CONFIG.themeColor,
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
    ],
  }
}
