import type { Metadata } from 'next'
import { APP_CONFIG } from '@/config/app'

function absoluteUrl(path = '/') {
  if (/^https?:\/\//.test(path)) return path
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${APP_CONFIG.url}${normalizedPath === '/' ? '' : normalizedPath}`
}

export function createPageMetadata({
  title,
  description,
  path = '/',
}: {
  title: string
  description: string
  path?: string
}): Metadata {
  const url = absoluteUrl(path)

  return {
    title,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title,
      description,
      url,
      siteName: APP_CONFIG.name,
      locale: 'en_US',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      creator: `@${APP_CONFIG.author.twitter}`,
    },
  }
}
