export type RepoSearchParams = {
  query?: string
  language?: string
  topic?: string
  license?: string
  minStars?: number
  maxStars?: number
  minForks?: number
  maxForks?: number
  pushedAfter?: Date
  createdAfter?: Date
  updatedAfter?: Date
  activeOnly?: boolean
  hasGoodFirstIssues?: boolean
  contributionReadyOnly?: boolean
  starterFriendlyOnly?: boolean
  minContributors?: number
  page?: number
  perPage?: number
  sort?: 'relevance' | 'stars' | 'forks' | 'recent' | 'updated' | 'contribution'
}
