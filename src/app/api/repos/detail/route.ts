import { type NextRequest, NextResponse } from 'next/server'
import { getRepoInsight } from '@/lib/account-features'
import { getUserFromRequest } from '@/lib/auth'
import {
  getRepositoryDocumentManifest,
  type RepositoryDocument,
  renderRepositoryReadme,
} from '@/lib/github/repository-documents'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string) {
  return new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`${label} timed out`)), timeoutMs)
    promise.then(
      (value) => {
        clearTimeout(timeout)
        resolve(value)
      },
      (error) => {
        clearTimeout(timeout)
        reject(error)
      },
    )
  })
}

export async function GET(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const fullName = request.nextUrl.searchParams.get('fullName')?.trim()
  if (!fullName || !/^[\w.-]+\/[\w.-]+$/.test(fullName)) {
    return NextResponse.json({ error: 'Invalid repository name.' }, { status: 400 })
  }

  try {
    const insight = await getRepoInsight(fullName)
    if (!insight) return NextResponse.json({ error: 'Repository not found.' }, { status: 404 })

    const repo = insight.repo as { default_branch?: string | null; readme_content?: string }
    const [documentManifest, renderedReadme] = await Promise.allSettled([
      withTimeout(getRepositoryDocumentManifest(fullName), 6_000, 'Repository document manifest'),
      withTimeout(
        renderRepositoryReadme(fullName, repo.default_branch?.trim() || 'HEAD'),
        6_000,
        'Repository README render',
      ),
    ])

    if (documentManifest.status === 'fulfilled') {
      ;(insight as { documents?: RepositoryDocument[] }).documents =
        documentManifest.value.documents
    } else {
      console.error('Repository document manifest query failed', documentManifest.reason)
    }

    if (renderedReadme.status === 'fulfilled' && renderedReadme.value) {
      repo.readme_content = renderedReadme.value
    } else if (renderedReadme.status === 'rejected') {
      console.error('Repository README render failed', renderedReadme.reason)
    }

    return NextResponse.json(insight)
  } catch (error) {
    console.error('Repository detail query failed', error)
    return NextResponse.json(
      { error: 'Repository details are temporarily unavailable.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}
