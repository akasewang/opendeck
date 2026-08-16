import {
  ACCOUNT_DIGEST_FREQUENCIES,
  ACCOUNT_PIPELINE_STAGE_IDS,
  type AccountDigestFrequency,
  type AccountPipelineStage,
} from '@/features/account/constants/account-options'
import {
  GITHUB_OWNER_PATTERN,
  REPOSITORY_FULL_NAME_PATTERN,
} from '@/features/repositories/constants/repository-validation'
import type { RepoSearchParams } from '@/features/repositories/types/repository-query'
import { cleanText, normalizeNumber } from '@/lib/api/input-normalization'

export type RepoSort = NonNullable<RepoSearchParams['sort']>

export const SORTS: readonly RepoSort[] = [
  'relevance',
  'stars',
  'forks',
  'recent',
  'updated',
  'contribution',
]

export function normalizePipelineStage(value: unknown): AccountPipelineStage {
  const stage = ACCOUNT_PIPELINE_STAGE_IDS.find((candidate) => candidate === value)
  if (!stage) throw new Error('Invalid pipeline stage.')
  return stage
}

export function normalizeDigestFrequency(value: unknown): AccountDigestFrequency {
  return ACCOUNT_DIGEST_FREQUENCIES.find((frequency) => frequency === value) ?? 'weekly'
}

export function normalizeSort(value: unknown): RepoSort {
  return SORTS.find((sort) => sort === value) ?? 'contribution'
}

export function normalizeBoolean(value: unknown, fallback: boolean) {
  return typeof value === 'boolean' ? value : fallback
}

export function normalizeDigestDay(value: unknown) {
  const day = normalizeNumber(value, 1, 6)
  return Math.min(Math.max(day, 0), 6)
}

export function normalizeTargetType(value: unknown) {
  if (value === undefined || value === null || value === '' || value === 'repo') return 'repo'
  if (value === 'organization') return 'organization'
  throw new Error('Invalid follow target type.')
}

export function normalizeTargetKey(value: unknown) {
  return cleanText(value, 180)
}

export function validateTargetKey(targetType: 'repo' | 'organization', targetKey: string) {
  const valid =
    targetType === 'repo'
      ? REPOSITORY_FULL_NAME_PATTERN.test(targetKey)
      : GITHUB_OWNER_PATTERN.test(targetKey)
  if (!valid) throw new Error(`Invalid ${targetType} follow target.`)
}
