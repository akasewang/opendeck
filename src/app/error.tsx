'use client'

import { Icon } from '@iconify/react'
import SiteHeader from '@/components/layout/site-header'

export default function AppError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <SiteHeader />

      <div className="relative z-10 w-full px-4 pb-24 pt-12 sm:pt-[60px]">
        <h1 className="max-w-4xl text-balance text-lg font-normal leading-tight tracking-tight text-primary sm:text-2xl lg:text-[2rem] lg:leading-[1.1]">
          Something went wrong.
        </h1>

        <div className="mt-6">
          <button
            type="button"
            onClick={reset}
            className="group inline-flex items-center gap-1.5 rounded-full border border-border bg-transparent px-4 py-1.5 text-sm text-primary transition-colors hover:bg-border/50 focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <Icon
              icon="ri:refresh-line"
              className="h-4 w-4 opacity-60 transition-transform duration-700 ease-in-out group-hover:rotate-[360deg]"
            />
            Try again
          </button>
        </div>
      </div>
    </main>
  )
}
