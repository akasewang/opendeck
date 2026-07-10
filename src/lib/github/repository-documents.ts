import { githubFetch } from '@/lib/github/client'
import { absolutizeReadmeHtml, sanitizeRepositoryHtml } from '@/lib/github/markdown'

const GITHUB_DOCUMENT_REVALIDATE_SECONDS = 3600

export const DOC_PATTERNS = {
  security: /^security(\.(md|markdown|rst|txt))?$/i,
  contributing: /^contributing(\.(md|markdown|rst|txt))?$/i,
  code_of_conduct: /^code[-_]of[-_]conduct(\.(md|markdown|rst|txt))?$/i,
} as const

const LICENSE_PATTERN = /^(unlicense|licen[sc]e|copying)([-_.][\w.-]+)?$/i

const MARKDOWN_EXTENSION_RE = /\.(md|markdown|mdown|mkd|mkdn)$/i
const README_PATTERN = /^readme(\.(md|markdown|mdown|mkd|mkdn))?$/i

export type MarkdownDoc = keyof typeof DOC_PATTERNS

type GithubRepository = { default_branch?: string }
type GithubContentItem = { name?: string; path?: string; type?: string }
type GithubContentFile = {
  encoding?: string
  content?: string
  html_url?: string
  name?: string
  path?: string
}
type GithubReadmeMetadata = { path?: string; html_url?: string }

export type RepositoryDocument = {
  id: string
  label: string
  kind: 'readme' | 'license' | 'markdown'
  path: string
  htmlUrl: string
}

type RepositoryDocumentManifest = {
  documents: RepositoryDocument[]
  defaultBranch: string
}

type RepositoryLicenseDocument = {
  id: 'license'
  spdx: string | null
  name: string | null
  text: string
  htmlUrl: string | null
}

export function baseName(path: string) {
  return path.split('/').pop() ?? path
}

function encodeRepositoryPath(path: string) {
  return path.split('/').map(encodeURIComponent).join('/')
}

export function isSafeRepositoryPath(path: string) {
  const segments = path.split('/')
  return (
    path.length > 0 &&
    path.length <= 512 &&
    !path.includes('\\') &&
    !path.startsWith('/') &&
    segments.every((segment) => segment && segment !== '.' && segment !== '..')
  )
}

export function isMarkdownPath(path: string) {
  const name = baseName(path)
  return README_PATTERN.test(name) || MARKDOWN_EXTENSION_RE.test(name)
}

function pathRank(path: string) {
  const lower = path.toLowerCase()
  if (!path.includes('/')) return 0
  if (lower.startsWith('.github/')) return 1
  if (lower.startsWith('docs/')) return 2
  return 3
}

function isPrimaryDocumentPath(path: string) {
  const lower = path.toLowerCase()
  if (!path.includes('/')) return true
  const segments = path.split('/')
  return (lower.startsWith('.github/') || lower.startsWith('docs/')) && segments.length === 2
}

function sortPaths(a: string, b: string) {
  return pathRank(a) - pathRank(b) || a.localeCompare(b)
}

function labelForPath(path: string) {
  const withoutExtension = path.replace(MARKDOWN_EXTENSION_RE, '')
  const parts = withoutExtension.split('/')
  const file = parts.pop() ?? withoutExtension
  const readableFile = file.replace(/[-_]+/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
  return parts.length > 0 ? `${parts.join('/')}/${readableFile}` : readableFile
}

function decodeGithubContent(json: GithubContentFile | null) {
  if (!json?.content) return ''
  return json.encoding === 'base64'
    ? Buffer.from(json.content, 'base64').toString('utf8')
    : json.content
}

function htmlUrlForPath(fullName: string, branch: string, path: string) {
  return `https://github.com/${fullName}/blob/${encodeURIComponent(branch)}/${encodeRepositoryPath(path)}`
}

export async function getRepositoryDefaultBranch(fullName: string) {
  const res = await githubFetch(`/repos/${fullName}`, {
    next: { revalidate: GITHUB_DOCUMENT_REVALIDATE_SECONDS },
  })
  if (!res.ok) return 'HEAD'
  const json = (await res.json().catch(() => null)) as GithubRepository | null
  return json?.default_branch?.trim() || 'HEAD'
}

async function listRepositoryFilePaths(fullName: string) {
  const listDir = async (dir: string): Promise<string[]> => {
    const res = await githubFetch(`/repos/${fullName}/contents${dir}`, {
      next: { revalidate: GITHUB_DOCUMENT_REVALIDATE_SECONDS },
    })
    if (!res.ok) return []
    const json = (await res.json().catch(() => null)) as GithubContentItem[] | null
    return (Array.isArray(json) ? json : [])
      .filter((item) => item?.type === 'file' && item.path)
      .map((item) => item.path as string)
      .filter(isSafeRepositoryPath)
  }

  const [root, dotGithub, docs] = await Promise.all([
    listDir(''),
    listDir('/.github'),
    listDir('/docs'),
  ])
  return [...new Set([...root, ...dotGithub, ...docs])]
}

function buildDocumentManifest(
  fullName: string,
  branch: string,
  filePaths: string[],
): RepositoryDocument[] {
  const markdownPaths = [...new Set(filePaths.filter(isMarkdownPath))].sort(sortPaths)
  const primaryFilePaths = [...new Set(filePaths.filter(isPrimaryDocumentPath))].sort(sortPaths)
  const primaryMarkdownPaths = primaryFilePaths.filter(isMarkdownPath)
  const specialDocPaths = [
    ...new Set(
      primaryFilePaths.filter((path) => {
        const name = baseName(path)
        return (
          isMarkdownPath(path) || Object.values(DOC_PATTERNS).some((pattern) => pattern.test(name))
        )
      }),
    ),
  ].sort(sortPaths)
  const usedPaths = new Set<string>()
  const documents: RepositoryDocument[] = []

  const addDocument = (doc: RepositoryDocument) => {
    if (usedPaths.has(doc.path)) return
    documents.push(doc)
    usedPaths.add(doc.path)
  }

  const readmePath = primaryMarkdownPaths.find((path) => README_PATTERN.test(baseName(path)))
  if (readmePath) {
    addDocument({
      id: 'readme',
      label: 'README',
      kind: 'readme',
      path: readmePath,
      htmlUrl: htmlUrlForPath(fullName, branch, readmePath),
    })
  }

  const licensePath = primaryFilePaths.find((path) => LICENSE_PATTERN.test(baseName(path)))
  if (licensePath) {
    addDocument({
      id: 'license',
      label: 'License',
      kind: 'license',
      path: licensePath,
      htmlUrl: htmlUrlForPath(fullName, branch, licensePath),
    })
  }

  for (const [id, pattern] of Object.entries(DOC_PATTERNS)) {
    const path = specialDocPaths.find((candidate) => pattern.test(baseName(candidate)))
    if (path) {
      addDocument({
        id,
        label:
          id === 'code_of_conduct' ? 'Code of conduct' : id.charAt(0).toUpperCase() + id.slice(1),
        kind: 'markdown',
        path,
        htmlUrl: htmlUrlForPath(fullName, branch, path),
      })
    }
  }

  for (const path of markdownPaths) {
    addDocument({
      id: `markdown:${path}`,
      label: labelForPath(path),
      kind: 'markdown',
      path,
      htmlUrl: htmlUrlForPath(fullName, branch, path),
    })
  }

  return documents
}

async function fetchContentPath(fullName: string, endpoint: 'readme' | 'license') {
  const res = await githubFetch(`/repos/${fullName}/${endpoint}`, {
    next: { revalidate: GITHUB_DOCUMENT_REVALIDATE_SECONDS },
  })
  if (!res.ok) return null
  const json = (await res.json().catch(() => null)) as GithubContentFile | null
  return json?.path && isSafeRepositoryPath(json.path) ? json.path : null
}

export async function getRepositoryDocumentManifest(
  fullName: string,
): Promise<RepositoryDocumentManifest> {
  const [branch, filePaths, readmePath, licensePath] = await Promise.all([
    getRepositoryDefaultBranch(fullName),
    listRepositoryFilePaths(fullName),
    fetchContentPath(fullName, 'readme'),
    fetchContentPath(fullName, 'license'),
  ])

  return {
    documents: buildDocumentManifest(
      fullName,
      branch,
      [...filePaths, readmePath, licensePath].filter((path): path is string => Boolean(path)),
    ),
    defaultBranch: branch,
  }
}

export async function renderRepositoryMarkdownDocument(
  fullName: string,
  branch: string,
  path: string,
) {
  const res = await githubFetch(`/repos/${fullName}/contents/${encodeRepositoryPath(path)}`, {
    accept: 'application/vnd.github.html',
    next: { revalidate: GITHUB_DOCUMENT_REVALIDATE_SECONDS },
  })
  if (!res.ok) return null
  return sanitizeRepositoryHtml(absolutizeReadmeHtml(await res.text(), fullName, branch, path))
}

export async function renderRepositoryReadme(fullName: string, branch: string) {
  const [metaRes, htmlRes] = await Promise.all([
    githubFetch(`/repos/${fullName}/readme`, {
      next: { revalidate: GITHUB_DOCUMENT_REVALIDATE_SECONDS },
    }),
    githubFetch(`/repos/${fullName}/readme`, {
      accept: 'application/vnd.github.v3.html',
      next: { revalidate: GITHUB_DOCUMENT_REVALIDATE_SECONDS },
    }),
  ])
  if (!htmlRes.ok) return null

  const metadata = metaRes.ok
    ? ((await metaRes.json().catch(() => null)) as GithubReadmeMetadata | null)
    : null
  return sanitizeRepositoryHtml(
    absolutizeReadmeHtml(await htmlRes.text(), fullName, branch, metadata?.path),
  )
}

export async function getRepositoryLicenseDocument(
  fullName: string,
  branch: string,
  path?: string | null,
): Promise<RepositoryLicenseDocument | null> {
  if (path) {
    const base = baseName(path)
    if (!isSafeRepositoryPath(path) || !LICENSE_PATTERN.test(base)) return null

    const res = await githubFetch(`/repos/${fullName}/contents/${encodeRepositoryPath(path)}`, {
      next: { revalidate: GITHUB_DOCUMENT_REVALIDATE_SECONDS },
    })
    if (!res.ok) return null
    const json = (await res.json().catch(() => null)) as GithubContentFile | null
    return {
      id: 'license',
      spdx: null,
      name: labelForPath(path),
      text: decodeGithubContent(json),
      htmlUrl: json?.html_url ?? htmlUrlForPath(fullName, branch, path),
    }
  }

  const res = await githubFetch(`/repos/${fullName}/license`, {
    next: { revalidate: GITHUB_DOCUMENT_REVALIDATE_SECONDS },
  })
  if (!res.ok) return null
  const json = (await res.json()) as GithubContentFile & {
    license?: { spdx_id?: string | null; name?: string | null } | null
  }
  return {
    id: 'license',
    spdx: json.license?.spdx_id ?? null,
    name: json.license?.name ?? null,
    text: decodeGithubContent(json),
    htmlUrl: json.html_url ?? null,
  }
}
