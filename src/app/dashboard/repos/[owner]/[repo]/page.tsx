import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { appRoute } from '@/config/routes'
import RepoDetailWorkspace from '@/features/repositories/components/repo-detail-workspace'
import { REPOSITORY_FULL_NAME_PATTERN } from '@/features/repositories/constants/repository-validation'
import { createPageMetadata } from '@/lib/seo/metadata'

type PageProps = {
  params: Promise<{ owner: string; repo: string }>
}

function resolveFullName(owner: string, repo: string) {
  const fullName = `${owner}/${repo}`
  if (!REPOSITORY_FULL_NAME_PATTERN.test(fullName)) notFound()
  return fullName
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { owner, repo } = await params
  const fullName = resolveFullName(owner, repo)
  return {
    ...createPageMetadata({
      title: fullName,
      description: `Contribution readiness, health timeline and recommended issues for ${fullName}.`,
      path: appRoute.repository(fullName),
    }),
    robots: { index: false, follow: false, nocache: true },
  }
}

export default async function RepoDetailPage({ params }: PageProps) {
  const { owner, repo } = await params
  return <RepoDetailWorkspace fullName={resolveFullName(owner, repo)} />
}
