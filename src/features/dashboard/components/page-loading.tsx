import { Skeleton } from '@/components/ui/skeleton'
import { RepoTableSkeleton } from '@/features/repositories/components/repo-table'

export default function DashboardLoading() {
  return (
    <section className="relative z-10 min-h-full w-full p-4 sm:px-6 sm:py-5 md:pl-0">
      <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:flex-wrap">
        <div className="flex min-w-0 flex-col gap-1.5">
          <div className="flex items-center gap-3">
            <Skeleton className="h-6 w-28" />
            <Skeleton className="h-5 w-9 rounded-sm" />
          </div>
          <Skeleton className="h-3.5 w-80 max-w-full" />
        </div>
        <Skeleton className="h-9 w-full rounded-md sm:w-44" />
      </div>

      <RepoTableSkeleton />
    </section>
  )
}
