import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { cleanOptionalText } from '@/lib/api/normalize'
import { getUserFromRequest } from '@/lib/auth'
import { githubFetchJson } from '@/lib/github/client'
import { getOrganizationDetails } from '@/lib/repositories'

export const dynamic = 'force-dynamic'

const CACHE_CONTROL = 'private, max-age=0, must-revalidate'
const GITHUB_LOGIN_PATTERN = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,38})$/

type GithubOwnerProfile = {
  name?: string | null
  description?: string | null
  bio?: string | null
  company?: string | null
  blog?: string | null
  location?: string | null
  email?: string | null
  twitter_username?: string | null
  type?: string | null
  public_repos?: number | null
  public_gists?: number | null
  followers?: number | null
  following?: number | null
  created_at?: string | null
  updated_at?: string | null
  html_url?: string | null
}

async function loadMirrorDetails(owner: string) {
  return getOrganizationDetails(owner)
}

async function loadGithubProfile(owner: string) {
  try {
    const result = await githubFetchJson<GithubOwnerProfile>(
      `/users/${encodeURIComponent(owner)}`,
      { retries: 1 },
    )
    return result.data
      ? {
          name: cleanOptionalText(result.data.name),
          description:
            cleanOptionalText(result.data.description) || cleanOptionalText(result.data.bio),
          company: cleanOptionalText(result.data.company),
          website: cleanOptionalText(result.data.blog),
          location: cleanOptionalText(result.data.location),
          email: cleanOptionalText(result.data.email),
          twitterUsername: cleanOptionalText(result.data.twitter_username),
          type: cleanOptionalText(result.data.type),
          publicRepos: result.data.public_repos ?? null,
          publicGists: result.data.public_gists ?? null,
          followers: result.data.followers ?? null,
          following: result.data.following ?? null,
          createdAt: cleanOptionalText(result.data.created_at),
          updatedAt: cleanOptionalText(result.data.updated_at),
          htmlUrl: cleanOptionalText(result.data.html_url),
        }
      : null
  } catch {
    return null
  }
}

export async function GET(request: NextRequest) {
  const owner = new URL(request.url).searchParams.get('owner')?.trim()

  if (!owner || !GITHUB_LOGIN_PATTERN.test(owner)) {
    return NextResponse.json({ error: 'Invalid organization owner.' }, { status: 400 })
  }

  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401, headers: { 'Cache-Control': 'no-store' } },
    )
  }

  try {
    const [mirror, profile] = await Promise.all([
      loadMirrorDetails(owner),
      loadGithubProfile(owner),
    ])
    const response = NextResponse.json({ profile, mirror })

    response.headers.set('Cache-Control', CACHE_CONTROL)
    return response
  } catch (error) {
    console.error('Organization profile query failed', error)
    return NextResponse.json(
      { error: 'Organization profile is temporarily unavailable.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}
