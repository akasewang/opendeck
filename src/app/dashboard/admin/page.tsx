import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import AdminHub from '@/features/admin/components/admin-hub'
import {
  getUserFromSessionToken,
  SESSION_COOKIE,
} from '@/features/auth/services/authentication-service'
import { createPageMetadata } from '@/lib/seo/metadata'

export const metadata: Metadata = {
  ...createPageMetadata({
    title: 'Admin',
    description: 'Manage OpenDeck users, invites and allowlist access.',
    path: '/dashboard/admin',
  }),
  robots: { index: false, follow: false, nocache: true },
}

export default async function AdminPage() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  const user = await getUserFromSessionToken(token)

  if (!user) redirect(`/?redirect=${encodeURIComponent('/dashboard/admin')}`)
  if (user.role !== 'admin') notFound()

  return <AdminHub />
}
