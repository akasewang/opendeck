import type { Metadata } from 'next'
import { Suspense } from 'react'
import AccountHub from '@/features/account/account-hub'
import { createPageMetadata } from '@/lib/seo/metadata'

export const metadata: Metadata = createPageMetadata({
  title: 'My Deck',
  description: 'Manage saved repositories, collections, follows, preferences and account security.',
  path: '/dashboard/home',
})

export default function MyDeckPage() {
  return (
    <Suspense fallback={null}>
      <AccountHub />
    </Suspense>
  )
}
