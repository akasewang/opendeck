import type { Metadata } from 'next'
import AuthPage from '@/features/auth/auth-page'
import { createPageMetadata } from '@/lib/seo/metadata'

export const metadata: Metadata = createPageMetadata({
  title: 'Sign in',
  description: 'Sign in to OpenDeck to unlock repository and organization row details.',
  path: '/auth',
})

export default function Page() {
  return <AuthPage />
}
