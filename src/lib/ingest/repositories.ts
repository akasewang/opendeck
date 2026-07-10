import { and, asc, desc, eq, sql } from 'drizzle-orm'
import { db } from '@/db'
import { curatedProjects, repoMetricSnapshots, repos } from '@/db/schema'
import { githubFetchJson, githubGraphql } from '@/lib/github/client'
import { getGithubTokenSnapshot } from '@/lib/github/tokens'
import {
  getContributionReadiness,
  shouldIngestContributionCandidate,
} from '@/lib/repositories/contribution'
import { finishIngestRun, startIngestRun } from './runs'
import { getDiscoverySources } from './sources'

export const DEFAULT_DISCOVERY_LIMIT_PER_SOURCE = 100
const MAX_DISCOVERY_LIMIT_PER_SOURCE = 100
const DEFAULT_REPOSITORY_CORPUS_TARGET = 1300

type NormalizedGithubRepo = {
  ghId: number
  fullName: string
  owner: string
  name: string
  description: string | null
  language: string | null
  stars: number
  forks: number
  openIssues: number
  license: string | null
  topics: string[]
  htmlUrl: string
  avatarUrl: string | null
  homepageUrl: string | null
  defaultBranch: string | null
  isArchived: boolean
  isFork?: boolean
  isMirror?: boolean
  isTemplate?: boolean
  hasGoodFirstIssues: boolean
  helpWantedIssues?: number
  contributors: number
  pushedAt: Date | null
  createdAt: Date | null
  updatedAt: Date | null
  readmeExcerpt: string | null
  etag?: string | null
}

type GithubRestRepo = {
  id: number
  full_name: string
  owner: { login: string; avatar_url?: string | null }
  name: string
  description?: string | null
  language?: string | null
  stargazers_count?: number
  forks_count?: number
  open_issues_count?: number
  license?: { spdx_id?: string | null; key?: string | null; name?: string | null } | null
  topics?: string[]
  html_url: string
  homepage?: string | null
  default_branch?: string | null
  archived?: boolean
  fork?: boolean
  mirror_url?: string | null
  is_template?: boolean
  pushed_at?: string | null
  created_at?: string | null
  updated_at?: string | null
}

type GithubGraphqlRepoNode = {
  databaseId?: number | null
  nameWithOwner: string
  name: string
  description?: string | null
  url: string
  owner: { login: string; avatarUrl?: string | null }
  primaryLanguage?: { name: string } | null
  stargazerCount?: number
  forkCount?: number
  issues?: { totalCount?: number }
  licenseInfo?: { spdxId?: string | null; name?: string | null } | null
  repositoryTopics?: { nodes?: { topic?: { name?: string | null } | null }[] }
  homepageUrl?: string | null
  defaultBranchRef?: { name?: string | null } | null
  isArchived?: boolean
  isFork?: boolean
  isMirror?: boolean
  isTemplate?: boolean
  goodFirstIssues?: { totalCount?: number }
  goodFirstIssueHyphen?: { totalCount?: number }
  helpWantedIssues?: { totalCount?: number }
  helpWantedIssueHyphen?: { totalCount?: number }
  pushedAt?: string | null
  createdAt?: string | null
  updatedAt?: string | null
  object?: { text?: string | null } | null
}

type GithubSearchResponse = {
  search?: {
    nodes?: (GithubGraphqlRepoNode | null)[]
    pageInfo?: { hasNextPage?: boolean; endCursor?: string | null }
  }
  rateLimit?: {
    remaining?: number
  }
}

const SEARCH_PAGE_SIZE = 25

const REPOSITORY_SEARCH = `
  query OpenDeckRepositorySearch($query: String!, $first: Int!, $after: String) {
    search(query: $query, type: REPOSITORY, first: $first, after: $after) {
      pageInfo { hasNextPage endCursor }
      nodes {
        ... on Repository {
          databaseId
          nameWithOwner
          name
          description
          url
          owner { login avatarUrl }
          primaryLanguage { name }
          stargazerCount
          forkCount
          issues(states: OPEN) { totalCount }
          licenseInfo { spdxId name }
          repositoryTopics(first: 20) { nodes { topic { name } } }
          homepageUrl
          defaultBranchRef { name }
          isArchived
          isFork
          isMirror
          isTemplate
          goodFirstIssues: issues(states: OPEN, labels: ["good first issue"], first: 1) { totalCount }
          goodFirstIssueHyphen: issues(states: OPEN, labels: ["good-first-issue"], first: 1) { totalCount }
          helpWantedIssues: issues(states: OPEN, labels: ["help wanted"], first: 1) { totalCount }
          helpWantedIssueHyphen: issues(states: OPEN, labels: ["help-wanted"], first: 1) { totalCount }
          pushedAt
          createdAt
          updatedAt
          object(expression: "HEAD:README.md") {
            ... on Blob { text }
          }
        }
      }
    }
    rateLimit { remaining }
  }
`

function toDate(value?: string | null) {
  return value ? new Date(value) : null
}

function excerpt(value?: string | null) {
  if (!value) return null
  return value.replace(/\s+/g, ' ').trim().slice(0, 4000)
}

function normalizeRestRepo(
  repo: GithubRestRepo,
  readmeExcerpt: string | null,
  hasGoodFirstIssues: boolean,
  etag?: string | null,
): NormalizedGithubRepo {
  const [owner] = repo.full_name.split('/')

  return {
    ghId: repo.id,
    fullName: repo.full_name,
    owner: repo.owner?.login || owner,
    name: repo.name,
    description: repo.description || null,
    language: repo.language || null,
    stars: repo.stargazers_count || 0,
    forks: repo.forks_count || 0,
    openIssues: repo.open_issues_count || 0,
    license: repo.license?.spdx_id || repo.license?.key || repo.license?.name || null,
    topics: (repo.topics || []).map((topic) => topic.toLowerCase()),
    htmlUrl: repo.html_url,
    avatarUrl: repo.owner?.avatar_url || null,
    homepageUrl: repo.homepage || null,
    defaultBranch: repo.default_branch || null,
    isArchived: repo.archived || false,
    isFork: repo.fork || false,
    isMirror: Boolean(repo.mirror_url),
    isTemplate: repo.is_template || false,
    hasGoodFirstIssues,
    helpWantedIssues: 0,
    contributors: 0,
    pushedAt: toDate(repo.pushed_at),
    createdAt: toDate(repo.created_at),
    updatedAt: toDate(repo.updated_at),
    readmeExcerpt,
    etag,
  }
}

function normalizeGraphqlRepo(repo: GithubGraphqlRepoNode): NormalizedGithubRepo | null {
  if (!repo.databaseId) return null
  const [owner] = repo.nameWithOwner.split('/')
  const goodFirstIssues =
    (repo.goodFirstIssues?.totalCount || 0) + (repo.goodFirstIssueHyphen?.totalCount || 0)
  const helpWantedIssues =
    (repo.helpWantedIssues?.totalCount || 0) + (repo.helpWantedIssueHyphen?.totalCount || 0)

  return {
    ghId: repo.databaseId,
    fullName: repo.nameWithOwner,
    owner: repo.owner?.login || owner,
    name: repo.name,
    description: repo.description || null,
    language: repo.primaryLanguage?.name || null,
    stars: repo.stargazerCount || 0,
    forks: repo.forkCount || 0,
    openIssues: repo.issues?.totalCount || 0,
    license: repo.licenseInfo?.spdxId || repo.licenseInfo?.name || null,
    topics:
      (repo.repositoryTopics?.nodes
        ?.map((node) => node.topic?.name?.toLowerCase())
        .filter(Boolean) as string[]) || [],
    htmlUrl: repo.url,
    avatarUrl: repo.owner?.avatarUrl || null,
    homepageUrl: repo.homepageUrl || null,
    defaultBranch: repo.defaultBranchRef?.name || null,
    isArchived: repo.isArchived || false,
    isFork: repo.isFork || false,
    isMirror: repo.isMirror || false,
    isTemplate: repo.isTemplate || false,
    hasGoodFirstIssues: goodFirstIssues > 0,
    helpWantedIssues,
    contributors: 0,
    pushedAt: toDate(repo.pushedAt),
    createdAt: toDate(repo.createdAt),
    updatedAt: toDate(repo.updatedAt),
    readmeExcerpt: excerpt(repo.object?.text),
  }
}

async function fetchReadmeExcerpt(fullName: string) {
  try {
    const result = await githubFetchJson<{ content?: string; encoding?: string }>(
      `/repos/${fullName}/readme`,
      {
        retries: 1,
      },
    )
    const content = result.data?.content

    if (!content) return null

    if (result.data?.encoding === 'base64') {
      return excerpt(Buffer.from(content.replace(/\n/g, ''), 'base64').toString('utf8'))
    }

    return excerpt(content)
  } catch {
    return null
  }
}

async function fetchGoodFirstIssueSignal(fullName: string) {
  try {
    const query = encodeURIComponent(`repo:${fullName} label:"good first issue" state:open`)
    const result = await githubFetchJson<{ total_count?: number }>(
      `/search/issues?q=${query}&per_page=1`,
      {
        retries: 1,
      },
    )

    return Boolean(result.data?.total_count && result.data.total_count > 0)
  } catch {
    return false
  }
}

async function countRepositoryCorpus() {
  const [row] = await db.select({ count: sql<number>`count(*)::int` }).from(repos)
  return row?.count ?? 0
}

async function countDiscoveryCorpus() {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(curatedProjects)
    .where(eq(curatedProjects.source, 'github'))

  return row?.count ?? 0
}

async function getExistingRepoIdByGhId(ghId: number) {
  const [existing] = await db
    .select({ id: repos.id })
    .from(repos)
    .where(eq(repos.ghId, ghId))
    .limit(1)

  return existing?.id ?? null
}

async function getRepoMirrorStateByGhId(ghId: number) {
  const [existing] = await db
    .select({
      repoId: repos.id,
      discoveryRepoId: curatedProjects.repoId,
    })
    .from(repos)
    .leftJoin(
      curatedProjects,
      and(eq(curatedProjects.repoId, repos.id), eq(curatedProjects.source, 'github')),
    )
    .where(eq(repos.ghId, ghId))
    .limit(1)

  return {
    existingRepoId: existing?.repoId ?? null,
    existingDiscoveryRepoId: existing?.discoveryRepoId ?? null,
  }
}

async function upsertNormalizedRepo(
  repo: NormalizedGithubRepo,
  options: { allowCreate?: boolean } = {},
) {
  const allowCreate = options.allowCreate ?? true
  const values = {
    ghId: repo.ghId,
    fullName: repo.fullName,
    owner: repo.owner,
    name: repo.name,
    description: repo.description,
    language: repo.language,
    stars: repo.stars,
    forks: repo.forks,
    openIssues: repo.openIssues,
    license: repo.license,
    topics: repo.topics,
    htmlUrl: repo.htmlUrl,
    avatarUrl: repo.avatarUrl,
    homepageUrl: repo.homepageUrl,
    defaultBranch: repo.defaultBranch,
    isArchived: repo.isArchived,
    hasGoodFirstIssues: repo.hasGoodFirstIssues,
    contributors: repo.contributors,
    pushedAt: repo.pushedAt,
    createdAt: repo.createdAt,
    updatedAt: repo.updatedAt,
    readmeExcerpt: repo.readmeExcerpt,
    etag: repo.etag,
    lastFetchedAt: new Date(),
  }

  const [saved] = allowCreate
    ? await db
        .insert(repos)
        .values(values)
        .onConflictDoUpdate({
          target: repos.ghId,
          set: values,
        })
        .returning({ id: repos.id })
    : await db
        .update(repos)
        .set(values)
        .where(eq(repos.ghId, repo.ghId))
        .returning({ id: repos.id })

  if (!saved) return null

  await db.insert(repoMetricSnapshots).values({
    repoId: saved.id,
    stars: repo.stars,
    forks: repo.forks,
    openIssues: repo.openIssues,
  })

  return saved.id
}

async function refreshRepository(fullName: string) {
  const [existing] = await db
    .select({ id: repos.id, etag: repos.etag })
    .from(repos)
    .where(eq(repos.fullName, fullName))
    .limit(1)

  const result = await githubFetchJson<GithubRestRepo>(`/repos/${fullName}`, {
    etag: existing?.etag,
  })

  if (result.status === 304 && existing) {
    await db.update(repos).set({ lastFetchedAt: new Date() }).where(eq(repos.id, existing.id))
    return { repoId: existing.id, changed: false }
  }

  if (!result.data) {
    throw new Error(`GitHub returned no repository payload for ${fullName}`)
  }

  const [readme, hasGoodFirstIssues] = await Promise.all([
    fetchReadmeExcerpt(fullName),
    fetchGoodFirstIssueSignal(fullName),
  ])
  const normalized = normalizeRestRepo(result.data, readme, hasGoodFirstIssues, result.etag)
  const repoId = await upsertNormalizedRepo(normalized)
  if (!repoId) {
    throw new Error(`Repository ${fullName} is not in the OpenDeck mirror and creation is disabled`)
  }

  return { repoId, changed: true, rateLimitRemaining: result.rateLimitRemaining }
}

async function searchRepositories(query: string, limit: number) {
  const nodes: GithubGraphqlRepoNode[] = []
  let after: string | null = null
  let rateLimitRemaining: number | null = null

  while (nodes.length < limit) {
    const first = Math.min(SEARCH_PAGE_SIZE, limit - nodes.length)
    const result: { data: GithubSearchResponse | null; rateLimitRemaining: number | null } =
      await githubGraphql<GithubSearchResponse>(REPOSITORY_SEARCH, {
        query,
        first,
        after,
      })

    rateLimitRemaining =
      result.data?.rateLimit?.remaining ?? result.rateLimitRemaining ?? rateLimitRemaining

    for (const node of result.data?.search?.nodes ?? []) {
      if (node) nodes.push(node)
    }

    const pageInfo = result.data?.search?.pageInfo
    if (!pageInfo?.hasNextPage || !pageInfo.endCursor) break
    after = pageInfo.endCursor
  }

  return { nodes, rateLimitRemaining }
}

export async function ingestTrending(limit = 50) {
  const runId = await startIngestRun('trending')
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  let ingested = 0
  let updated = 0
  let inserted = 0
  let skippedNew = 0
  let skippedIneligible = 0
  let rateLimitRemaining: number | null = null

  try {
    let corpusSize = await countRepositoryCorpus()
    const { nodes, rateLimitRemaining: searchRateLimit } = await searchRepositories(
      `created:>${since} is:public archived:false fork:false mirror:false template:false issues:>0 stars:>10 sort:stars-desc`,
      limit,
    )
    rateLimitRemaining = searchRateLimit

    for (const node of nodes) {
      const normalized = normalizeGraphqlRepo(node)
      if (!normalized) continue

      if (!shouldIngestContributionCandidate(normalized)) {
        skippedIneligible += 1
        continue
      }

      const existingRepoId = await getExistingRepoIdByGhId(normalized.ghId)
      const allowCreate = corpusSize < DEFAULT_REPOSITORY_CORPUS_TARGET
      const repoId = await upsertNormalizedRepo(normalized, { allowCreate })

      if (!repoId) {
        skippedNew += 1
        continue
      }

      if (existingRepoId) {
        updated += 1
      } else {
        inserted += 1
        corpusSize += 1
      }

      ingested += 1
    }

    await finishIngestRun(runId, 'success', {
      ingested,
      updated,
      inserted,
      skippedNew,
      skippedIneligible,
      corpusTarget: DEFAULT_REPOSITORY_CORPUS_TARGET,
      rateLimitRemaining,
      githubToken: getGithubTokenSnapshot(),
    })

    return {
      ingested,
      updated,
      inserted,
      skippedNew,
      skippedIneligible,
      corpusTarget: DEFAULT_REPOSITORY_CORPUS_TARGET,
    }
  } catch (error) {
    await finishIngestRun(
      runId,
      ingested > 0 ? 'partial' : 'failed',
      {
        ingested,
        updated,
        inserted,
        skippedNew,
        skippedIneligible,
        corpusTarget: DEFAULT_REPOSITORY_CORPUS_TARGET,
        rateLimitRemaining,
        githubToken: getGithubTokenSnapshot(),
      },
      error,
    )
    throw error
  }
}

export async function ingestDiscoverySources(limitPerSource = DEFAULT_DISCOVERY_LIMIT_PER_SOURCE) {
  const runId = await startIngestRun('discovery')
  const sources = getDiscoverySources()
  const boundedLimitPerSource = Math.min(
    Math.max(Math.floor(limitPerSource), 1),
    MAX_DISCOVERY_LIMIT_PER_SOURCE,
  )
  const seenRepoIds = new Map<number | string, string>()
  let ingested = 0
  let updated = 0
  let inserted = 0
  let matched = 0
  let duplicates = 0
  let skippedNew = 0
  let skippedIneligible = 0
  let failed = 0
  let rateLimitRemaining: number | null = null
  const sourceStats: Record<
    string,
    { matched: number; ingested: number; skippedIneligible: number; failed: number; error?: string }
  > = {}

  try {
    let repositoryCorpusSize = await countRepositoryCorpus()
    let discoveryCorpusSize = await countDiscoveryCorpus()

    for (const source of sources) {
      sourceStats[source.id] = { matched: 0, ingested: 0, skippedIneligible: 0, failed: 0 }

      try {
        const { nodes, rateLimitRemaining: searchRateLimit } = await searchRepositories(
          source.query,
          boundedLimitPerSource,
        )
        rateLimitRemaining = searchRateLimit ?? rateLimitRemaining

        for (const node of nodes) {
          const normalized = normalizeGraphqlRepo(node)
          if (!normalized) continue

          matched += 1
          sourceStats[source.id].matched += 1

          const readiness = getContributionReadiness(normalized)
          if (!readiness.isReady) {
            skippedIneligible += 1
            sourceStats[source.id].skippedIneligible += 1
            continue
          }

          const dedupeKey = normalized.ghId || normalized.fullName
          let repoId = seenRepoIds.get(dedupeKey)
          const { existingRepoId, existingDiscoveryRepoId } = await getRepoMirrorStateByGhId(
            normalized.ghId,
          )
          const canAdmitNewRepo = repositoryCorpusSize < DEFAULT_REPOSITORY_CORPUS_TARGET
          const canAdmitDiscoveryLink = discoveryCorpusSize < DEFAULT_REPOSITORY_CORPUS_TARGET

          if (repoId) {
            duplicates += 1
          } else {
            if (!existingRepoId && !canAdmitNewRepo) {
              skippedNew += 1
              continue
            }

            if (!existingDiscoveryRepoId && !canAdmitDiscoveryLink) {
              skippedNew += 1
              continue
            }

            const savedRepoId = await upsertNormalizedRepo(normalized, {
              allowCreate: Boolean(existingRepoId) || canAdmitNewRepo,
            })

            if (!savedRepoId) {
              skippedNew += 1
              continue
            }

            repoId = savedRepoId
            seenRepoIds.set(dedupeKey, repoId)

            if (existingRepoId) {
              updated += 1
            } else {
              inserted += 1
              repositoryCorpusSize += 1
            }
          }

          if (repoId) {
            await db
              .insert(curatedProjects)
              .values({
                repoId,
                source: 'github',
                batch: source.id,
                company: source.label,
                tags: [
                  source.id,
                  ...source.tags,
                  ...(readiness.starterFriendly ? ['starter-friendly'] : []),
                ],
              })
              .onConflictDoUpdate({
                target: [curatedProjects.source, curatedProjects.repoId],
                set: {
                  batch: source.id,
                  company: source.label,
                  tags: [
                    source.id,
                    ...source.tags,
                    ...(readiness.starterFriendly ? ['starter-friendly'] : []),
                  ],
                },
              })

            if (!existingDiscoveryRepoId) {
              discoveryCorpusSize += 1
            }

            ingested += 1
            sourceStats[source.id].ingested += 1
          }
        }
      } catch (error) {
        failed += 1
        sourceStats[source.id].failed += 1
        sourceStats[source.id].error =
          error instanceof Error ? error.message.slice(0, 200) : String(error)
      }
    }

    await finishIngestRun(runId, failed > 0 ? 'partial' : 'success', {
      matched,
      ingested,
      updated,
      inserted,
      duplicates,
      skippedNew,
      skippedIneligible,
      failed,
      limitPerSource: boundedLimitPerSource,
      targetCandidates: sources.length * boundedLimitPerSource,
      corpusTarget: DEFAULT_REPOSITORY_CORPUS_TARGET,
      repositoryCorpusSize,
      discoveryCorpusSize,
      sourceStats,
      rateLimitRemaining,
      githubToken: getGithubTokenSnapshot(),
    })

    return {
      matched,
      ingested,
      updated,
      inserted,
      duplicates,
      skippedNew,
      skippedIneligible,
      failed,
      sources: sources.length,
      limitPerSource: boundedLimitPerSource,
      targetCandidates: sources.length * boundedLimitPerSource,
      corpusTarget: DEFAULT_REPOSITORY_CORPUS_TARGET,
      repositoryCorpusSize,
      discoveryCorpusSize,
    }
  } catch (error) {
    await finishIngestRun(
      runId,
      ingested > 0 ? 'partial' : 'failed',
      {
        matched,
        ingested,
        updated,
        inserted,
        duplicates,
        skippedNew,
        skippedIneligible,
        failed,
        limitPerSource: boundedLimitPerSource,
        targetCandidates: sources.length * boundedLimitPerSource,
        corpusTarget: DEFAULT_REPOSITORY_CORPUS_TARGET,
        sourceStats,
        rateLimitRemaining,
        githubToken: getGithubTokenSnapshot(),
      },
      error,
    )
    throw error
  }
}

export async function ingestStaleMetadata(limit = 50) {
  const runId = await startIngestRun('metadata')
  let refreshed = 0
  let unchanged = 0
  let failed = 0

  try {
    const stale = await db
      .select({ fullName: repos.fullName, stars: repos.stars })
      .from(repos)
      .orderBy(asc(repos.lastFetchedAt), desc(repos.stars))
      .limit(limit)

    for (const repo of stale) {
      try {
        const result = await refreshRepository(repo.fullName)
        if (result.changed) refreshed += 1
        else unchanged += 1
      } catch {
        failed += 1
      }
    }

    await finishIngestRun(runId, failed > 0 ? 'partial' : 'success', {
      refreshed,
      unchanged,
      failed,
      githubToken: getGithubTokenSnapshot(),
    })

    return { refreshed, unchanged, failed }
  } catch (error) {
    await finishIngestRun(
      runId,
      refreshed > 0 ? 'partial' : 'failed',
      { refreshed, unchanged, failed, githubToken: getGithubTokenSnapshot() },
      error,
    )
    throw error
  }
}
