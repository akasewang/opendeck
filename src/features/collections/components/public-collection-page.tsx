import Link from 'next/link'
import { notFound } from 'next/navigation'
import SiteHeader from '@/components/layout/site-header'
import { cardVariants } from '@/components/ui/card'
import CountPill from '@/components/ui/count-pill'
import { getPublicCollection } from '@/features/collections/services/public-collection-service'
import { formatNumber } from '@/utils/format-number'

export default async function PublicCollectionPage({ slug }: { slug: string }) {
  const payload = await getPublicCollection(slug)
  if (!payload) notFound()

  return (
    <main id="main-content" className="min-h-dvh bg-background text-foreground">
      <SiteHeader />
      <section className="mx-auto max-w-6xl px-4 py-24">
        <div className="space-y-6">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-3">
              <h1 className="text-balance text-2xl font-medium text-primary">
                {payload.collection.name}
              </h1>
              <CountPill count={payload.items.length} />
            </div>
            <p className="max-w-2xl text-pretty text-sm text-muted-foreground">
              {payload.collection.description || 'A shared OpenDeck repository collection.'}
            </p>
          </div>
          {payload.items.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border/60 px-6 py-12 text-center text-sm text-muted-foreground">
              This collection is empty so far.
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {payload.items.map((repo) => (
                <a
                  key={repo.opendeck_id}
                  href={repo.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cardVariants({
                    interactive: true,
                    className: 'group flex flex-col p-4',
                  })}
                >
                  <div className="truncate text-sm font-semibold text-foreground transition-colors group-hover:text-primary">
                    {repo.full_name}
                  </div>
                  <p className="mt-1 line-clamp-2 flex-1 text-pretty text-sm text-muted-foreground">
                    {repo.description || 'No description.'}
                  </p>
                  <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                    {repo.language && (
                      <span className="rounded-sm border border-border/40 px-1.5 py-0.5 font-mono text-2xs">
                        {repo.language}
                      </span>
                    )}
                    <span className="font-mono tabular-nums">
                      {formatNumber(repo.stargazers_count ?? 0)} stars
                    </span>
                  </div>
                </a>
              ))}
            </div>
          )}
          <Link
            href="/dashboard"
            className="inline-flex h-9 items-center gap-2 whitespace-nowrap rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:opacity-90 active:scale-[0.98]"
          >
            Explore OpenDeck
          </Link>
        </div>
      </section>
    </main>
  )
}
