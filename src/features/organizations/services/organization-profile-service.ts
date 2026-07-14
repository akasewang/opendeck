import { getOrganizationDetails } from '@/features/organizations/services/organization-query-service'
import { isValidEmail } from '@/features/auth/services/authentication-service'
import { cleanOptionalText, isRecord } from '@/lib/api/input-normalization'
import { githubFetchJson } from '@/lib/github/client'

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

function optionalCount(value: unknown) {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null
}

function optionalHttpUrl(value: unknown) {
  const text = cleanOptionalText(value, 2_000)
  if (!text) return null
  try {
    const candidate = /^https?:\/\//i.test(text) ? text : `https://${text}`
    const url = new URL(candidate)
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null
  } catch {
    return null
  }
}

async function loadGithubProfile(owner: string) {
  try {
    const result = await githubFetchJson(`/users/${encodeURIComponent(owner)}`, { retries: 1 })
    const data: GithubOwnerProfile | null = isRecord(result.data)
      ? {
          name: cleanOptionalText(result.data.name),
          description: cleanOptionalText(result.data.description),
          bio: cleanOptionalText(result.data.bio),
          company: cleanOptionalText(result.data.company),
          blog: cleanOptionalText(result.data.blog),
          location: cleanOptionalText(result.data.location),
          email: cleanOptionalText(result.data.email),
          twitter_username: cleanOptionalText(result.data.twitter_username),
          type: cleanOptionalText(result.data.type),
          public_repos: optionalCount(result.data.public_repos),
          public_gists: optionalCount(result.data.public_gists),
          followers: optionalCount(result.data.followers),
          following: optionalCount(result.data.following),
          created_at: cleanOptionalText(result.data.created_at),
          updated_at: cleanOptionalText(result.data.updated_at),
          html_url: cleanOptionalText(result.data.html_url),
        }
      : null
    return data
      ? {
          name: cleanOptionalText(data.name),
          description: cleanOptionalText(data.description) || cleanOptionalText(data.bio),
          company: cleanOptionalText(data.company),
          website: optionalHttpUrl(data.blog),
          location: cleanOptionalText(data.location),
          email: data.email && isValidEmail(data.email) ? data.email.toLowerCase() : null,
          twitterUsername: cleanOptionalText(data.twitter_username)?.replace(/^@/, '') ?? null,
          type: cleanOptionalText(data.type),
          publicRepos: data.public_repos ?? null,
          publicGists: data.public_gists ?? null,
          followers: data.followers ?? null,
          following: data.following ?? null,
          createdAt: cleanOptionalText(data.created_at),
          updatedAt: cleanOptionalText(data.updated_at),
          htmlUrl: optionalHttpUrl(data.html_url),
        }
      : null
  } catch (error) {
    console.error('GitHub organization profile lookup failed', error)
    return null
  }
}

export async function getOrganizationProfile(owner: string) {
  const [mirror, profile] = await Promise.all([
    getOrganizationDetails(owner),
    loadGithubProfile(owner),
  ])

  return { profile, mirror }
}
