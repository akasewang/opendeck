import { Skeleton } from '@/components/ui/skeleton'
import { RepoTableSkeleton } from '@/features/repositories/components/repo-table'

export default function DiscoverLoading() {
  return (
    <section className="relative z-10 min-h-full w-full p-4 sm:px-6 sm:py-5 md:pl-0">
      <div className="mb-6 flex w-full flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-3">
            <Skeleton className="h-6 w-28" />
            <Skeleton className="h-5 w-9 rounded-sm" />
          </div>
          <Skeleton className="h-3.5 w-80 max-w-full" />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-7">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full rounded-md" />
          ))}
        </div>
      </div>

      <RepoTableSkeleton />
    </section>
  )
}
