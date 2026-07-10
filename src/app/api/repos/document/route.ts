import { type NextRequest, NextResponse } from 'next/server'
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

const FULLNAME_RE = /^[\w.-]+\/[\w.-]+$/

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const fullName = searchParams.get('fullName')?.trim()
  if (!fullName || !FULLNAME_RE.test(fullName)) {
    return NextResponse.json({ error: 'Invalid repository name.' }, { status: 400 })
  }

  const doc = searchParams.get('doc')?.trim()

  try {
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
