export type Organization = {
  owner: string
  avatarUrl?: string | null
  repoCount: number
  totalStars: number
  totalForks?: number
  totalOpenIssues?: number
  totalContributors?: number
  goodFirstIssueRepos?: number
  archivedRepos?: number
  activeRepos?: number
  homepageRepos?: number
  topRepo: string
  topLanguage?: string | null
  newestRepo?: string | null
  latestPushedAt?: string | null
  latestUpdatedAt?: string | null
}

export type OrganizationProfile = {
  name?: string | null
  description?: string | null
  company?: string | null
  website?: string | null
  location?: string | null
  email?: string | null
  twitterUsername?: string | null
  type?: string | null
  publicRepos?: number | null
  publicGists?: number | null
  followers?: number | null
  following?: number | null
  createdAt?: string | null
  updatedAt?: string | null
  htmlUrl?: string | null
}

export type TopOrganizationRepository = {
  fullName: string
  stars: number
  forks: number
  openIssues: number
  language?: string | null
}

export type OrganizationMirrorDetails = {
  topRepos?: TopOrganizationRepository[]
  latestPushedAt?: string | null
  latestUpdatedAt?: string | null
  newestRepo?: string | null
  mostActiveRepo?: string | null
}

export type OrganizationDetailsResponse = {
  profile: OrganizationProfile | null
  mirror: OrganizationMirrorDetails | null
}
