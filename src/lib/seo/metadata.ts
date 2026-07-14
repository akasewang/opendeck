import type { Metadata } from 'next'
import { APP_CONFIG } from '@/config/application'

type PageImage = {
  url: string
  width: number
  height: number
  alt: string
}

type PageMeta = {
  title: string
  description: string
  path?: string
  image?: PageImage
}

function absoluteUrl(path = '/') {
  if (/^https?:\/\//.test(path)) return path
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${APP_CONFIG.url}${normalizedPath === '/' ? '' : normalizedPath}`
}

function absoluteImage(image?: PageImage) {
  return image ? { ...image, url: absoluteUrl(image.url) } : undefined
}

export function createOpenGraph({
  title,
  description,
  path = '/',
  image,
}: PageMeta): Metadata['openGraph'] {
  const previewImage = absoluteImage(image)

  return {
    title,
    description,
    url: absoluteUrl(path),
    siteName: APP_CONFIG.name,
    locale: 'en_US',
    type: 'website',
    ...(previewImage ? { images: [previewImage] } : {}),
  }
}

export function createPageMetadata({ title, description, path = '/', image }: PageMeta): Metadata {
  const previewImage = absoluteImage(image)

  return {
    title,
    description,
    alternates: {
      canonical: absoluteUrl(path),
    },
    openGraph: createOpenGraph({ title, description, path, image: previewImage }),
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      creator: `@${APP_CONFIG.author.twitter}`,
      ...(previewImage ? { images: [previewImage] } : {}),
    },
  }
}
