import type {
  RepositoryApiItem,
  RepositoryListItem,
} from '@/features/repositories/types/repository'

const repositoryIdentity = (repository: RepositoryListItem) =>
  repository.id ?? repository.full_name ?? repository.html_url ?? repository.name

export function mergeUniqueRepositories(current: RepositoryListItem[], next: RepositoryListItem[]) {
  const seen = new Set(current.map(repositoryIdentity))
  const unique = next.filter((repository) => {
    const id = repositoryIdentity(repository)
    if (seen.has(id)) return false
    seen.add(id)
    return true
  })

  return [...current, ...unique]
}

export function mapRepositoryApiItem(
  repository: RepositoryApiItem,
  descriptionFallback?: string,
): RepositoryListItem {
  return {
    id: repository.opendeck_id,
    github_id: repository.id,
    full_name: repository.full_name,
    owner: repository.owner?.login,
    name: repository.full_name || repository.name,
    language: repository.language || null,
    topics: repository.topics || [],
    stargazers_count: repository.stargazers_count || 0,
    forks_count: repository.forks_count || 0,
    open_issues_count: repository.open_issues_count || 0,
    imgUrl: repository.owner?.avatar_url || undefined,
    html_url: repository.html_url,
    homepage: repository.homepage,
    default_branch: repository.default_branch,
    readme_excerpt: repository.readme_excerpt,
    description: repository.description || descriptionFallback,
    license: repository.license?.key || null,
    pushed_at: repository.pushed_at,
    created_at: repository.created_at,
    updated_at: repository.updated_at,
    has_good_first_issues: repository.has_good_first_issues,
    contributors: repository.contributors,
    contribution_score: repository.contribution_score,
    is_contribution_ready: repository.is_contribution_ready,
    contribution_blockers: repository.contribution_blockers,
    is_archived: repository.is_archived,
    curated: repository.curated,
  }
}
