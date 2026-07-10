import type { Metadata } from 'next'
import './globals.css'
import ScrollEndShake from '@/components/effects/scroll-end-shake'
import CurtainProvider from '@/components/transition/curtain'
import { TooltipProvider } from '@/components/ui/tooltip'
import { APP_CONFIG } from '@/config/app'
import { AuthProvider } from '@/features/auth/auth-provider'
import { badeenDisplay, geistMono, geistSans } from '@/lib/fonts'
import { createPageMetadata } from '@/lib/seo/metadata'

const rootMetadata = createPageMetadata({
  title: `${APP_CONFIG.name} - Open Source Discovery`,
  description: APP_CONFIG.description,
  path: '/',
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
    'theme-color': '#0a0a0a',
    'msapplication-TileColor': '#0a0a0a',
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
      <body className="antialiased" suppressHydrationWarning>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: websiteJsonLdScript }}
        />
        <TooltipProvider delayDuration={150}>
          <AuthProvider>
            <CurtainProvider>{children}</CurtainProvider>
          </AuthProvider>
        </TooltipProvider>
        <ScrollEndShake />
      </body>
    </html>
  )
}
