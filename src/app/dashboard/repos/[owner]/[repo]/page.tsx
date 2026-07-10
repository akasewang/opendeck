import type { Metadata } from 'next'
import RepoDetailWorkspace from '@/features/repositories/components/repo-detail-workspace'
import { createPageMetadata } from '@/lib/seo/metadata'

type PageProps = {
  params: Promise<{ owner: string; repo: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { owner, repo } = await params
  const fullName = `${decodeURIComponent(owner)}/${decodeURIComponent(repo)}`
  return createPageMetadata({
    title: fullName,
    description: `Contribution readiness, health timeline and recommended issues for ${fullName}.`,
    path: `/dashboard/repos/${owner}/${repo}`,
  })
}

export default async function RepoDetailPage({ params }: PageProps) {
  const { owner, repo } = await params
  return (
    <RepoDetailWorkspace fullName={`${decodeURIComponent(owner)}/${decodeURIComponent(repo)}`} />
  )
}
