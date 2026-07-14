'use client'

import Select from '@/components/ui/select'
import PageHeader from '@/features/dashboard/components/page-header'
import PageShell from '@/features/dashboard/components/page-shell'
import RepoTable from '@/features/repositories/components/repo-table'
import { useRepoFeed } from '@/features/repositories/hooks/use-repo-feed'

export default function Page() {
  const feed = useRepoFeed('/api/github-trending')

  return (
    <PageShell className="flex h-full min-h-0 flex-col gap-5">
      <PageHeader
        title="Trending"
        description="Repositories gaining significant traction and activity this month."
        count={feed.total}
        actions={
          <Select
            value={feed.language}
            onChange={(e) => feed.setLanguage(e.target.value)}
            options={feed.languageOptions}
            placeholder="All Languages"
            ariaLabel="Filter trending repositories by language"
            className="sm:w-44"
          />
        }
      />

      <RepoTable
        data={feed.filtered}
        isLoading={feed.isLoading}
        error={feed.error}
        query={feed.query}
        onQueryChange={feed.setQuery}
        searchPlaceholder="Trending GitHub projects this month"
        onRefresh={feed.refresh}
        hasMore={feed.hasMore}
        isLoadingMore={feed.isLoadingMore}
        onLoadMore={feed.loadMore}
        className="min-h-0 flex-1"
      />
    </PageShell>
  )
}
