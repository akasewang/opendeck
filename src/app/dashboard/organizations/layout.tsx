import type { Metadata } from 'next'
import { createPageMetadata } from '@/lib/seo/metadata'

export const metadata: Metadata = createPageMetadata({
  title: 'Organizations',
  description: 'Explore open source organizations represented in the OpenDeck repository mirror.',
  path: '/dashboard/organizations',
})

export default function OrganizationsLayout({ children }: { children: React.ReactNode }) {
  return children
}
