import Link from 'next/link'
import SiteHeader from '@/components/layout/site-header'
import { formatNumber } from '@/features/repositories/utils'
import { getPublicCollection } from '@/lib/account-features'

export default async function PublicCollectionPage({ slug }: { slug: string }) {
  const payload = await getPublicCollection(slug)

  return (
    <main className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <section className="mx-auto max-w-6xl px-4 py-24">
        {!payload ? (
          <div className="mx-auto flex max-w-xl flex-col items-center gap-3 rounded-lg border border-dashed border-border/60 px-6 py-14 text-center">
            <p className="text-balance text-sm font-medium text-foreground">Collection not found</p>
            <p className="text-pretty text-sm text-muted-foreground">
              This shared collection may have been made private or deleted.
            </p>
            <Link
              href="/dashboard"
              className="mt-2 inline-flex h-9 items-center gap-2 rounded-md border border-border/40 bg-background px-3 text-sm font-medium text-foreground transition hover:border-border/70 hover:bg-muted-hover active:scale-[0.98]"
            >
              Explore OpenDeck
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <h1 className="text-balance text-2xl font-medium text-primary">
                {payload.collection.name}
              </h1>
              <p className="mt-2 max-w-2xl text-pretty text-sm text-muted-foreground">
                {payload.collection.description || 'A shared OpenDeck repository collection.'}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                {payload.items.length} {payload.items.length === 1 ? 'repository' : 'repositories'}
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
                    className="group flex flex-col rounded-lg border border-border/50 bg-card/40 p-4 transition-colors hover:border-border/80 hover:bg-card/70"
                  >
                    <div className="truncate text-sm font-semibold text-foreground transition-colors group-hover:text-primary">
                      {repo.full_name}
                    </div>
                    <p className="mt-1 line-clamp-2 flex-1 text-pretty text-sm text-muted-foreground">
                      {repo.description || 'No description.'}
                    </p>
                    <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                      {repo.language && (
                        <span className="rounded-sm border border-border/40 px-1.5 py-0.5 font-mono text-[11px]">
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
        )}
      </section>
    </main>
  )
}
