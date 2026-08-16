const GITHUB_AVATAR_HOSTNAME = 'avatars.githubusercontent.com'
const GITHUB_AVATAR_SOURCE_SIZE = 128

export function githubAvatarUrl(value: string): string {
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:' || url.hostname !== GITHUB_AVATAR_HOSTNAME) return value

    // Keep one source URL per account so cached output variants can be reused.
    url.searchParams.set('s', GITHUB_AVATAR_SOURCE_SIZE.toString())
    return url.toString()
  } catch {
    return value
  }
}
