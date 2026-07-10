import type { Metadata } from 'next'
import { createPageMetadata } from '@/lib/seo/metadata'

export const metadata: Metadata = createPageMetadata({
  title: 'Discover',
  description:
    'Search and filter mirrored GitHub repositories by language, topic, activity and fit.',
  path: '/dashboard/discover',
})

export default function DiscoverLayout({ children }: { children: React.ReactNode }) {
  return children
}
