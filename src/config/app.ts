const PRODUCTION_APP_URL = 'https://opendeck.akasewang.me'
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0', '[::1]', '::1'])

function getPublicAppUrl() {
  const rawUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || PRODUCTION_APP_URL
  let url: URL

  try {
    url = new URL(rawUrl)
  } catch {
    throw new Error('NEXT_PUBLIC_APP_URL must be an absolute URL.')
  }

  if (process.env.NODE_ENV === 'production') {
    if (url.protocol !== 'https:') {
      throw new Error('NEXT_PUBLIC_APP_URL must use https in production.')
    }

    if (LOCAL_HOSTS.has(url.hostname)) {
      throw new Error('NEXT_PUBLIC_APP_URL cannot point to localhost in production.')
    }
  }

  if (url.pathname !== '/' || url.search || url.hash) {
    throw new Error('NEXT_PUBLIC_APP_URL must be an origin without a path, query, or hash.')
  }

  return url.origin
}

function getDomain(url: string) {
  return new URL(url).hostname
}

const appUrl = getPublicAppUrl()

export const APP_CONFIG = {
  name: 'OpenDeck',
  version: '0.1.0',
  email: 'hi@akasewang.me',
  domain: getDomain(appUrl),
  url: appUrl,
  description:
    "Free, fast open source discovery with curated repositories served from OpenDeck's own repository mirror.",
  author: {
    name: 'Akash Dewangan',
    username: 'akasewang',
    twitter: 'akasewang',
  },
  links: {
    github: 'https://github.com/akasewang/opendeck',
    x: 'https://x.com/akasewang',
    email: 'hi@akasewang.me',
  },
}
