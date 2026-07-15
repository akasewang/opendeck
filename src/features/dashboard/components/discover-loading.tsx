import { Skeleton, skeletonStagger } from '@/components/ui/skeleton'
import { PageHeaderSkeleton } from '@/features/dashboard/components/page-header'
import { RepoTableSkeleton } from '@/features/repositories/components/repo-table'

export default function DiscoverLoading() {
  return (
    <section
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="relative z-10 flex h-full min-h-0 w-full flex-col gap-5 p-4 sm:px-6 sm:py-5 md:pl-0"
    >
      <span className="sr-only">Loading discover</span>
      <PageHeaderSkeleton />

      <div className="grid shrink-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-7">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} style={skeletonStagger(i)} className="h-9 w-full rounded-md" />
        ))}
      </div>

      <RepoTableSkeleton className="min-h-0 flex-1" />
    </section>
  )
}
