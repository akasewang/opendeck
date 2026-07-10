'use client'

import CountPill from '@/components/ui/count-pill'
import Select from '@/components/ui/select'
import PageShell from '@/features/dashboard/components/page-shell'
import RepoTable from '@/features/repositories/components/repo-table'
import { useRepoFeed } from '@/features/repositories/hooks/use-repo-feed'

export default function Page() {
  const feed = useRepoFeed('/api/curated?source=github', 'No description available')

  return (
    <PageShell>
      <div className="mb-6 flex flex-col sm:flex-row sm:flex-wrap justify-between items-start gap-4">
        <div className="flex min-w-0 flex-col gap-1.5">
          <div className="flex items-center gap-3">
            <h1 className="text-balance text-lg sm:text-xl font-medium leading-[100%] text-primary">
              Overview
            </h1>
            <CountPill count={feed.total} />
          </div>
          <p className="text-pretty text-[13px] text-muted-foreground max-w-md">
            High quality repositories curated for contribution readiness and clarity.
          </p>
        </div>

        <div className="flex w-full shrink-0 flex-col sm:w-auto sm:flex-row gap-3">
          <Select
            value={feed.language}
            onChange={(e) => feed.setLanguage(e.target.value)}
            options={feed.languageOptions}
            placeholder="All Languages"
            ariaLabel="Filter overview by language"
            className="sm:w-44"
          />
        </div>
      </div>

      <RepoTable
        data={feed.filtered}
        isLoading={feed.isLoading}
        error={feed.error}
        query={feed.query}
        onQueryChange={feed.setQuery}
        searchPlaceholder="Search indexed open source projects"
        onRefresh={feed.refresh}
        hasMore={feed.hasMore}
        isLoadingMore={feed.isLoadingMore}
        onLoadMore={feed.loadMore}
      />
    </PageShell>
  )
}
