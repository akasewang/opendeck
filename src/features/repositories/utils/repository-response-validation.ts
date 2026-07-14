import { REPOSITORY_FULL_NAME_PATTERN } from '@/features/repositories/constants/repository-validation'
import type {
  RepositoryApiItem,
  RepositoryInsight,
  RepositoryJournalPayload,
} from '@/features/repositories/types/repository'
import { isRecord } from '@/lib/api/input-normalization'

function isOptionalString(value: unknown) {
  return value === undefined || value === null || typeof value === 'string'
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

function isCount(value: unknown) {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
}

function isOptionalCount(value: unknown) {
  return value === undefined || isCount(value)
}

export function isRepositoryApiItem(value: unknown): value is RepositoryApiItem {
  if (!isRecord(value) || typeof value.name !== 'string' || !value.name.trim()) return false
  if (
    value.full_name !== undefined &&
    (typeof value.full_name !== 'string' || !REPOSITORY_FULL_NAME_PATTERN.test(value.full_name))
  ) {
    return false
  }
  if (
    !isOptionalCount(value.id) ||
    !isOptionalCount(value.stargazers_count) ||
    !isOptionalCount(value.forks_count) ||
    !isOptionalCount(value.open_issues_count) ||
    !isOptionalString(value.description) ||
    !isOptionalString(value.language) ||
    !isOptionalString(value.html_url)
  ) {
    return false
  }
  if (value.owner !== undefined && value.owner !== null && !isRecord(value.owner)) return false
  return true
}

export function parseRepositoryListPayload(value: unknown) {
  if (!isRecord(value) || !Array.isArray(value.items)) return null
  const items = value.items.filter(isRepositoryApiItem)
  if (items.length !== value.items.length) return null

  return {
    items,
    totalCount:
      typeof value.total_count === 'number' &&
      Number.isSafeInteger(value.total_count) &&
      value.total_count >= 0
        ? value.total_count
        : items.length,
  }
}

export function isRepositoryInsight(value: unknown): value is RepositoryInsight {
  if (!isRecord(value) || !isRecord(value.repo)) return false
  if (
    typeof value.repo.full_name !== 'string' ||
    !REPOSITORY_FULL_NAME_PATTERN.test(value.repo.full_name) ||
    !Array.isArray(value.timeline) ||
    !Array.isArray(value.issues)
  ) {
    return false
  }

  const repo = value.repo
  if (
    !isOptionalString(repo.description) ||
    !isOptionalString(repo.html_url) ||
    !isOptionalString(repo.homepage) ||
    !isOptionalString(repo.language) ||
    !isOptionalString(repo.pushed_at) ||
    !isOptionalString(repo.created_at) ||
    !isOptionalString(repo.updated_at) ||
    !isOptionalString(repo.default_branch) ||
    !isOptionalString(repo.readme_excerpt) ||
    !isOptionalString(repo.readme_content) ||
    !isOptionalCount(repo.stargazers_count) ||
    !isOptionalCount(repo.forks_count) ||
    !isOptionalCount(repo.open_issues_count) ||
    !isOptionalCount(repo.contributors) ||
    (repo.topics !== undefined && !isStringArray(repo.topics)) ||
    (repo.contribution_score !== undefined &&
      (typeof repo.contribution_score !== 'number' || !Number.isFinite(repo.contribution_score))) ||
    (repo.has_good_first_issues !== undefined && typeof repo.has_good_first_issues !== 'boolean') ||
    (repo.is_archived !== undefined && typeof repo.is_archived !== 'boolean')
  ) {
    return false
  }
  if (
    value.documents !== undefined &&
    (!Array.isArray(value.documents) ||
      !value.documents.every(
        (document) =>
          isRecord(document) &&
          typeof document.id === 'string' &&
          typeof document.path === 'string' &&
          typeof document.htmlUrl === 'string' &&
          (document.label === undefined || typeof document.label === 'string') &&
          (document.kind === undefined ||
            document.kind === 'readme' ||
            document.kind === 'license' ||
            document.kind === 'markdown'),
      ))
  ) {
    return false
  }

  return (
    value.timeline.every(
      (point) =>
        isRecord(point) &&
        isCount(point.stars) &&
        isCount(point.forks) &&
        isCount(point.openIssues) &&
        typeof point.capturedAt === 'string',
    ) &&
    value.issues.every(
      (issue) =>
        isRecord(issue) &&
        typeof issue.id === 'string' &&
        typeof issue.number === 'number' &&
        Number.isSafeInteger(issue.number) &&
        issue.number > 0 &&
        typeof issue.title === 'string' &&
        typeof issue.htmlUrl === 'string' &&
        isStringArray(issue.labels) &&
        isCount(issue.comments) &&
        typeof issue.score === 'number' &&
        Number.isFinite(issue.score),
    )
  )
}

export function isRepositoryJournalPayload(value: unknown): value is RepositoryJournalPayload {
  return (
    isRecord(value) &&
    Array.isArray(value.entries) &&
    value.entries.every(
      (entry) =>
        isRecord(entry) &&
        typeof entry.id === 'string' &&
        (entry.issueNumber === null ||
          (typeof entry.issueNumber === 'number' && Number.isSafeInteger(entry.issueNumber))) &&
        typeof entry.status === 'string' &&
        typeof entry.body === 'string' &&
        typeof entry.updatedAt === 'string',
    )
  )
}
