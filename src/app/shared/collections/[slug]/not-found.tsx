import Link from 'next/link'
import SiteHeader from '@/components/layout/site-header'
import { buttonVariants } from '@/components/ui/button'

export default function SharedCollectionNotFound() {
  return (
    <main id="main-content" className="min-h-dvh bg-background text-foreground">
      <SiteHeader />
      <section className="mx-auto max-w-6xl px-4 py-24">
        <div className="mx-auto flex max-w-xl flex-col items-center gap-3 rounded-lg border border-dashed border-border/60 px-6 py-14 text-center">
          <h1 className="text-balance text-sm font-medium text-foreground">Collection not found</h1>
          <p className="text-pretty text-sm text-muted-foreground">
            This shared collection may have been made private or deleted.
          </p>
          <Link href="/dashboard" className={buttonVariants({ className: 'mt-2' })}>
            Explore OpenDeck
          </Link>
        </div>
      </section>
    </main>
  )
}
