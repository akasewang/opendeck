import type { Metadata } from 'next'
import { Toaster } from '@/components/ui/toast'
import { APP_CONFIG } from '@/config/application'
import DashboardScroll from '@/features/dashboard/components/dashboard-scroll'
import Sidenav from '@/features/dashboard/components/sidenav'
import { createPageMetadata } from '@/lib/seo/metadata'

export const metadata: Metadata = {
  ...createPageMetadata({
    title: 'Dashboard',
    description:
      'Browse curated, trending, discoverable and organization-level open source projects.',
    path: '/dashboard',
  }),
  title: {
    default: 'Dashboard',
    template: `%s | ${APP_CONFIG.name}`,
  },
}

export default async function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="dashboard relative flex h-dvh flex-col overflow-hidden bg-background text-foreground">
      <div className="relative z-10 flex min-h-0 flex-1 flex-col md:flex-row">
        <Sidenav />
        <main id="main-content" className="relative flex min-h-0 min-w-0 flex-1 flex-col">
          <DashboardScroll>{children}</DashboardScroll>
        </main>
      </div>
      <Toaster />
    </div>
  )
}
