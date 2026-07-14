import { type NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/features/auth/services/authentication-service'
import { REPOSITORY_FULL_NAME_PATTERN } from '@/features/repositories/constants/repository-validation'
import { getRepoByFullName } from '@/features/repositories/services/repository-query-service'
import {
  baseName,
  DOC_PATTERNS,
  getRepositoryDefaultBranch,
  getRepositoryDocumentManifest,
  getRepositoryLicenseDocument,
  isMarkdownPath,
  isSafeRepositoryPath,
  type MarkdownDoc,
  renderRepositoryMarkdownDocument,
  renderRepositoryReadme,
} from '@/lib/github/repository-documents'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const fullName = searchParams.get('fullName')?.trim()
  if (!fullName || !REPOSITORY_FULL_NAME_PATTERN.test(fullName)) {
    return NextResponse.json({ error: 'Invalid repository name.' }, { status: 400 })
  }

  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401, headers: { 'Cache-Control': 'no-store' } },
    )
  }

  const doc = searchParams.get('doc')?.trim()

  try {
    if (!(await getRepoByFullName(fullName))) {
      return NextResponse.json({ error: 'Repository not found.' }, { status: 404 })
    }

    if (!doc) {
      return NextResponse.json(await getRepositoryDocumentManifest(fullName))
    }

    const branch = await getRepositoryDefaultBranch(fullName)

    if (doc === 'readme') {
      const html = await renderRepositoryReadme(fullName, branch)
      if (!html) return NextResponse.json({ error: 'README not found.' }, { status: 404 })
      return NextResponse.json({
        id: 'readme',
        html,
        htmlUrl: `https://github.com/${fullName}#readme`,
      })
    }

    if (doc === 'license') {
      const path = searchParams.get('path')?.trim()
      const license = await getRepositoryLicenseDocument(fullName, branch, path)
      if (!license) return NextResponse.json({ error: 'License not found.' }, { status: 404 })
      return NextResponse.json(license)
    }

    if (doc === 'markdown' || doc in DOC_PATTERNS) {
      const path = searchParams.get('path')?.trim()
      const base = path ? baseName(path) : ''
      if (
        !path ||
        !isSafeRepositoryPath(path) ||
        (doc === 'markdown' && !isMarkdownPath(path)) ||
        (doc in DOC_PATTERNS && !DOC_PATTERNS[doc as MarkdownDoc].test(base))
      ) {
        return NextResponse.json({ error: 'Invalid document path.' }, { status: 400 })
      }

      const html = await renderRepositoryMarkdownDocument(fullName, branch, path)
      if (!html) return NextResponse.json({ error: 'Document not found.' }, { status: 404 })
      return NextResponse.json({
        id: doc,
        html,
        htmlUrl: `https://github.com/${fullName}/blob/${encodeURIComponent(branch)}/${path
          .split('/')
          .map(encodeURIComponent)
          .join('/')}`,
      })
    }

    return NextResponse.json({ error: 'Unknown document.' }, { status: 400 })
  } catch (error) {
    console.error('Repository document query failed', error)
    return NextResponse.json(
      { error: 'Repository documents are temporarily unavailable.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}
