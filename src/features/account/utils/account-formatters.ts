import type { RepositoryApiItem } from '@/features/repositories/types/repository'
import { formatRelativeTime } from '@/features/repositories/utils/repository-display'

export function repositoryName(repository: RepositoryApiItem) {
  return repository.full_name || repository.name
}

export function shortDescription(value?: string | null, max = 160) {
  if (!value) return 'No description available.'
  return value.length > max ? `${value.slice(0, max).trimEnd()}…` : value
}

export function formatDate(value?: string | null) {
  if (!value) return 'Never'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Never'
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(
    date,
  )
}

export function formatDateTime(value?: string | null) {
  if (!value) return 'Never'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Never'
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(date)
}

export function formatWhen(value?: string | null) {
  return formatRelativeTime(value) ?? formatDate(value)
}

export const recommendationKey = (repository: RepositoryApiItem) =>
  repository.opendeck_id ?? repositoryName(repository)

export function repositoryUpdateMessage(patch: Record<string, unknown>) {
  if (patch.saved === true) return 'Repository saved'
  if (patch.saved === false) return 'Removed from library'
  if (patch.dismissed === true) return 'Repository dismissed'
  if (patch.hidden === true) return 'Hidden from recommendations'
  if (patch.hidden === false) return 'Shown in recommendations'
  if (patch.reviewed === true) return 'Marked as reviewed'
  if (patch.reviewed === false) return 'Reviewed mark cleared'
  return 'Repository updated'
}
