import type { Metadata } from 'next'
import { createPageMetadata } from '@/lib/seo/metadata'

export const metadata: Metadata = createPageMetadata({
  title: 'Compare',
  description:
    'Compare open source repositories side by side on contribution fit, responsiveness, activity and setup difficulty.',
  path: '/dashboard/compare',
})

export default function CompareLayout({ children }: { children: React.ReactNode }) {
  return children
}
