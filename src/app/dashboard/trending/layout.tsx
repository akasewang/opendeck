import type { Metadata } from 'next'
import { createPageMetadata } from '@/lib/seo/metadata'

export const metadata: Metadata = createPageMetadata({
  title: 'Trending',
  description: 'Browse recently active open source repositories ranked for contribution readiness.',
  path: '/dashboard/trending',
})

export default function TrendingLayout({ children }: { children: React.ReactNode }) {
  return children
}
