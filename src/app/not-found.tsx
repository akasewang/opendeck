import type { Metadata } from 'next'
import ExploreButton from '@/components/brand/explore-button'
import SiteHeader from '@/components/layout/site-header'
import { createOpenGraph } from '@/lib/seo/metadata'

const NOT_FOUND_TITLE = 'Page Not Found'
const NOT_FOUND_DESCRIPTION =
  'This page does not exist. Head back to OpenDeck to keep discovering open source repositories.'

export const metadata: Metadata = {
  title: NOT_FOUND_TITLE,
  description: NOT_FOUND_DESCRIPTION,
  openGraph: createOpenGraph({
    title: NOT_FOUND_TITLE,
    description: NOT_FOUND_DESCRIPTION,
  }),
  robots: {
    index: false,
    follow: false,
  },
}

export default function NotFound() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <SiteHeader />

      <div className="relative z-10 w-full px-4 pb-24 pt-16 sm:pt-20">
        <h1 className="max-w-4xl text-balance text-lg font-normal leading-tight tracking-tight text-primary sm:text-2xl lg:text-[2rem] lg:leading-[1.1]">
          Page not found
        </h1>
      </div>
      <ExploreButton />
    </main>
  )
}
