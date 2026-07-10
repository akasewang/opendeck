'use client'

import { Icon } from '@iconify/react'

export default function DashboardError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <section className="relative z-10 flex min-h-full w-full flex-col items-start p-4 sm:px-6 pt-6">
      <div className="max-w-xl">
        <h1 className="text-balance text-lg font-normal leading-tight tracking-tight text-primary sm:text-2xl">
          Dashboard tripped. oops.
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
    </section>
  )
}
