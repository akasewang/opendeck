import type { Metadata } from 'next'
import { Suspense } from 'react'
import AccountHub from '@/features/account/components/account-hub/account-hub'
import { createPageMetadata } from '@/lib/seo/metadata'

export const metadata: Metadata = {
  ...createPageMetadata({
    title: 'My Deck',
    description:
      'Manage saved repositories, collections, follows, preferences and account security.',
    path: '/dashboard/home',
  }),
  robots: { index: false, follow: false, nocache: true },
}

export default function MyDeckPage() {
  return (
    <Suspense fallback={null}>
      <AccountHub />
    </Suspense>
  )
}
