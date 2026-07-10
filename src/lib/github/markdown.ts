function encodePath(path: string) {
  return path
    .split('/')
    .filter(Boolean)
    .map((part) => encodeURIComponent(part))
    .join('/')
}

const BLOCKED_TAGS =
  'script|style|iframe|object|embed|link|meta|base|form|input|button|textarea|select|option|svg|math|video|audio|source|track|canvas|template'
const PAIRED_BLOCKED_TAG_RE = new RegExp(
  `<\\s*(${BLOCKED_TAGS})\\b[^>]*>[\\s\\S]*?<\\s*\\/\\s*\\1\\s*>`,
  'gi',
)
const BLOCKED_TAG_RE = new RegExp(`<\\s*\\/?\\s*(?:${BLOCKED_TAGS})\\b[^>]*>`, 'gi')
const EVENT_HANDLER_ATTR_RE = /\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi
const STRIPPED_ATTR_RE =
  /\s+(?:style|srcdoc|formaction)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi
const URL_ATTR_RE =
  /\s+(href|src|xlink:href|action|poster)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi

function normalizeProtocol(value: string) {
  return value.replace(/^[\s"'`]+|[\s"'`]+$/g, '').replace(/[\u0000-\u001F\u007F\s]+/g, '')
}

function hasUnsafeProtocol(value: string) {
  const normalized = normalizeProtocol(value).toLowerCase()
  return (
    normalized.startsWith('javascript:') ||
    normalized.startsWith('vbscript:') ||
    normalized.startsWith('data:')
  )
}

export function sanitizeRepositoryHtml(html: string) {
  return html
    .replace(PAIRED_BLOCKED_TAG_RE, '')
    .replace(BLOCKED_TAG_RE, '')
    .replace(EVENT_HANDLER_ATTR_RE, '')
    .replace(STRIPPED_ATTR_RE, '')
    .replace(URL_ATTR_RE, (match, attr: string, value: string) =>
      hasUnsafeProtocol(value) ? '' : ` ${attr}=${value}`,
    )
}

export function absolutizeReadmeHtml(
  html: string,
  fullName: string,
  branch: string,
  sourcePath?: string | null,
): string {
  const encodedFullName = encodePath(fullName)
  const encodedBranch = encodeURIComponent(branch)
  const sourceDir = sourcePath?.split('/').slice(0, -1).join('/') ?? ''
  const encodedSourceDir = encodePath(sourceDir)
  const rawRoot = `https://raw.githubusercontent.com/${encodedFullName}/${encodedBranch}/`
  const blobRoot = `https://github.com/${encodedFullName}/blob/${encodedBranch}/`
  const rawBase = encodedSourceDir ? `${rawRoot}${encodedSourceDir}/` : rawRoot
  const blobBase = encodedSourceDir ? `${blobRoot}${encodedSourceDir}/` : blobRoot

  const isAbsolute = (url: string) =>
    /^(?:https?:)?\/\//i.test(url) ||
    url.startsWith('data:') ||
    url.startsWith('#') ||
    url.startsWith('mailto:')

  const resolve = (base: string, root: string, url: string) => {
    const targetBase = url.startsWith('/') ? root : base
    const target = url.startsWith('/') ? url.slice(1) : url
    try {
      return new URL(target, targetBase).toString()
    } catch {
      return `${targetBase}${target.replace(/^\.?\//, '')}`
    }
  }

  return html
    .replace(/(<img\b[^>]*?\bsrc=)"([^"]*)"/gi, (match, prefix, url) =>
      isAbsolute(url) ? match : `${prefix}"${resolve(rawBase, rawRoot, url)}"`,
    )
    .replace(/(<a\b[^>]*?\bhref=)"([^"]*)"/gi, (match, prefix, url) =>
      isAbsolute(url) ? match : `${prefix}"${resolve(blobBase, blobRoot, url)}"`,
    )
}
