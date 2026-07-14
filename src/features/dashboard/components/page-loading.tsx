import { PageHeaderSkeleton } from '@/features/dashboard/components/page-header'
import { RepoTableSkeleton } from '@/features/repositories/components/repo-table'

export default function DashboardLoading() {
  return (
    <section
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="relative z-10 flex h-full min-h-0 w-full flex-col gap-5 p-4 sm:px-6 sm:py-5 md:pl-0"
    >
      <span className="sr-only">Loading dashboard</span>
      <PageHeaderSkeleton actionClassName="h-9 w-full rounded-md sm:w-44" />
      <RepoTableSkeleton className="min-h-0 flex-1" />
    </section>
  )
}
