import { toast } from '@/components/ui/toast'
import type { GithubRepoApiItem } from '@/features/repositories/types'
import { formatRelativeTime } from '@/features/repositories/utils'

export function repoName(repo: GithubRepoApiItem) {
  return repo.full_name || repo.name
}

export function shortDescription(value?: string | null, max = 160) {
  if (!value) return 'No description available.'
  return value.length > max ? `${value.slice(0, max).trimEnd()}…` : value
}

export function formatDate(value?: string | null) {
  if (!value) return 'Never'
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(
    new Date(value),
  )
}

export function formatWhen(value?: string | null) {
  return formatRelativeTime(value) ?? formatDate(value)
}

export async function apiPost(path: string, body: Record<string, unknown>) {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  })
  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    const message = payload?.error || 'Request failed.'
    toast(message, { tone: 'error' })
    throw new Error(message)
  }
  return payload
}
