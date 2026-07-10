export interface Repo {
  id?: string
  github_id?: number
  full_name?: string
  owner?: string
  name: string
  language?: string | null
  topics?: string[]
  stargazers_count: number
  forks_count: number
  open_issues_count?: number
  imgUrl?: string
  html_url?: string
  description?: string
  license?: string | null
  pushed_at?: string | null
  created_at?: string | null
  updated_at?: string | null
  has_good_first_issues?: boolean
  contributors?: number
  contribution_score?: number
  is_contribution_ready?: boolean
  contribution_blockers?: string[]
  is_archived?: boolean
  homepage?: string | null
  default_branch?: string | null
  readme_excerpt?: string | null
  curated?: {
    source?: string | null
    batch?: string | null
    company?: string | null
    logo_url?: string | null
    tags?: string[]
    created_at?: string | null
  } | null
}

export interface Contributor {
  login: string
  avatarUrl?: string | null
  htmlUrl: string
  contributions: number
  isAnonymous?: boolean
}

export interface GithubRepoApiItem {
  id?: number
  opendeck_id?: string
  name: string
  full_name?: string
  owner?: {
    login?: string
    avatar_url?: string | null
  } | null
  html_url?: string
  description?: string | null
  language?: string | null
  stargazers_count?: number
  forks_count?: number
  open_issues_count?: number
  topics?: string[]
  license?: {
    key?: string | null
    name?: string | null
  } | null
  pushed_at?: string | null
  created_at?: string | null
  updated_at?: string | null
  has_good_first_issues?: boolean
  contributors?: number
  contribution_score?: number
  is_contribution_ready?: boolean
  contribution_blockers?: string[]
  is_archived?: boolean
  homepage?: string | null
  default_branch?: string | null
  readme_excerpt?: string | null
  curated?: {
    source?: string | null
    batch?: string | null
    company?: string | null
    logo_url?: string | null
    tags?: string[]
    created_at?: string | null
  } | null
}

export type ColumnKey = keyof Pick<
  Repo,
  'name' | 'language' | 'topics' | 'open_issues_count' | 'stargazers_count' | 'contribution_score'
>

export const COLUMNS: { key: ColumnKey; label: string }[] = [
  { key: 'name', label: 'Repository' },
  { key: 'language', label: 'Language' },
  { key: 'topics', label: 'Tags' },
  { key: 'open_issues_count', label: 'Issues' },
  { key: 'stargazers_count', label: 'Stars' },
  { key: 'contribution_score', label: 'Fit' },
]

type RepoDetailDocument = {
  id: string
  label?: string
  kind?: 'readme' | 'license' | 'markdown'
  path: string
  htmlUrl: string
}

export type RepoInsight = {
  repo: {
    full_name?: string
    owner?: { login?: string; avatar_url?: string | null } | null
    description?: string | null
    html_url?: string
    homepage?: string | null
    language?: string | null
    topics?: string[]
    stargazers_count?: number
    forks_count?: number
    open_issues_count?: number
    license?: { key?: string | null; name?: string | null } | null
    contribution_score?: number
    contribution_blockers?: string[]
    contributors?: number
    default_branch?: string | null
    readme_excerpt?: string | null
    readme_content?: string | null
    has_good_first_issues?: boolean
    is_archived?: boolean
    pushed_at?: string | null
    created_at?: string | null
    updated_at?: string | null
    id?: number
    opendeck_id?: string
    curated?: {
      source?: string | null
      batch?: string | null
      company?: string | null
      logo_url?: string | null
      created_at?: string | null
    } | null
  }
  documents?: RepoDetailDocument[]
  timeline: Array<{ stars: number; forks: number; openIssues: number; capturedAt: string }>
  issues: Array<{
    id: string
    number: number
    title: string
    htmlUrl: string
    labels: string[]
    comments: number
    score: number
  }>
}

export type JournalPayload = {
  entries: Array<{
    id: string
    issueNumber: number | null
    status: string
    body: string
    updatedAt: string
  }>
}
