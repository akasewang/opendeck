import type { Metadata } from 'next'
import './globals.css'
import ScrollEndShake from '@/components/effects/scroll-end-shake'
import { MotionProvider } from '@/components/providers/motion-provider'
import CurtainProvider from '@/components/transitions/page-curtain'
import { Toaster } from '@/components/ui/toast'
import { TooltipProvider } from '@/components/ui/tooltip'
import { APP_CONFIG } from '@/config/application'
import { badeenDisplay, geistMono, geistSans } from '@/config/fonts'
import { MOTION_DURATION_MS } from '@/config/motion'
import { APP_ROUTES } from '@/config/routes'
import { AuthProvider } from '@/features/auth/providers/auth-provider'
import { createPageMetadata } from '@/lib/seo/metadata'

const rootMetadata = createPageMetadata({
  title: `${APP_CONFIG.name} - Open Source Discovery`,
  description: APP_CONFIG.description,
  path: APP_ROUTES.landing,
})

const websiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: APP_CONFIG.name,
  url: APP_CONFIG.url,
  description: APP_CONFIG.description,
  creator: {
    '@type': 'Person',
    name: APP_CONFIG.author.name,
    url: APP_CONFIG.links.github,
  },
}
const websiteJsonLdScript = JSON.stringify(websiteJsonLd).replaceAll('<', '\\u003c')

export const metadata: Metadata = {
  ...rootMetadata,
  metadataBase: new URL(APP_CONFIG.url),
  title: {
    default: `${APP_CONFIG.name} - Open Source Discovery`,
    template: `%s | ${APP_CONFIG.name}`,
  },
  keywords: ['open source', 'GitHub repositories', 'developer tools', 'repository search'],
  icons: {
    icon: [{ url: '/icon.svg', type: 'image/svg+xml', sizes: 'any' }],
    shortcut: [{ url: '/icon.svg', type: 'image/svg+xml' }],
  },
  manifest: '/manifest.webmanifest',
  other: {
    'theme-color': APP_CONFIG.themeColor,
    'msapplication-TileColor': APP_CONFIG.themeColor,
  },
  robots: {
    index: true,
    follow: true,
    nocache: true,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: APP_CONFIG.url,
  },
  applicationName: APP_CONFIG.name,
  authors: [{ name: APP_CONFIG.author.name, url: APP_CONFIG.links.github }],
  category: 'Technology',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${badeenDisplay.variable}`}
    >
      <body className="antialiased">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground"
        >
          Skip to main content
        </a>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: websiteJsonLdScript }}
        />
        <MotionProvider>
          <TooltipProvider delayDuration={MOTION_DURATION_MS.tooltipDelay}>
            <AuthProvider>
              <CurtainProvider>{children}</CurtainProvider>
            </AuthProvider>
          </TooltipProvider>
          <Toaster />
        </MotionProvider>
        <ScrollEndShake />
      </body>
    </html>
  )
}
