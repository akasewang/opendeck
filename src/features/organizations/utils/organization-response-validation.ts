import type {
  Organization,
  OrganizationDetailsResponse,
  OrganizationMirrorDetails,
  OrganizationProfile,
} from '@/features/organizations/types/organization'
import { isRecord } from '@/lib/api/input-normalization'

function isOptionalString(value: unknown) {
  return value === undefined || value === null || typeof value === 'string'
}

function isOptionalCount(value: unknown) {
  return (
    value === undefined ||
    value === null ||
    (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0)
  )
}

export function isOrganization(value: unknown): value is Organization {
  return (
    isRecord(value) &&
    typeof value.owner === 'string' &&
    value.owner.length > 0 &&
    isOptionalString(value.avatarUrl) &&
    isOptionalCount(value.repoCount) &&
    isOptionalCount(value.totalStars) &&
    isOptionalCount(value.totalForks) &&
    isOptionalCount(value.totalOpenIssues) &&
    isOptionalCount(value.totalContributors) &&
    isOptionalCount(value.goodFirstIssueRepos) &&
    isOptionalCount(value.archivedRepos) &&
    isOptionalCount(value.activeRepos) &&
    isOptionalCount(value.homepageRepos) &&
    typeof value.topRepo === 'string' &&
    isOptionalString(value.topLanguage) &&
    isOptionalString(value.newestRepo) &&
    isOptionalString(value.latestPushedAt) &&
    isOptionalString(value.latestUpdatedAt)
  )
}

function isOrganizationProfile(value: unknown): value is OrganizationProfile {
  if (!isRecord(value)) return false
  return (
    [
      'name',
      'description',
      'company',
      'website',
      'location',
      'email',
      'twitterUsername',
      'type',
      'createdAt',
      'updatedAt',
      'htmlUrl',
    ].every((key) => isOptionalString(value[key])) &&
    ['publicRepos', 'publicGists', 'followers', 'following'].every((key) =>
      isOptionalCount(value[key]),
    )
  )
}

function isOrganizationMirror(value: unknown): value is OrganizationMirrorDetails {
  return (
    isRecord(value) &&
    isOptionalString(value.latestPushedAt) &&
    isOptionalString(value.latestUpdatedAt) &&
    isOptionalString(value.newestRepo) &&
    isOptionalString(value.mostActiveRepo) &&
    (value.topRepos === undefined ||
      (Array.isArray(value.topRepos) &&
        value.topRepos.every(
          (repo) =>
            isRecord(repo) &&
            typeof repo.fullName === 'string' &&
            isOptionalCount(repo.stars) &&
            isOptionalCount(repo.forks) &&
            isOptionalCount(repo.openIssues) &&
            isOptionalString(repo.language),
        )))
  )
}

export function isOrganizationDetailsResponse(
  value: unknown,
): value is OrganizationDetailsResponse {
  return (
    isRecord(value) &&
    (value.profile === null || isOrganizationProfile(value.profile)) &&
    (value.mirror === null || isOrganizationMirror(value.mirror))
  )
}
