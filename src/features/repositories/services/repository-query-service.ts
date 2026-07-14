import { and, asc, desc, eq, gte, ilike, lte, or, type SQL, sql } from 'drizzle-orm'
import { db } from '@/db/client'
import { curatedProjects, repos } from '@/db/schema'
import { REPOSITORY_QUERY_LIMITS } from '@/features/repositories/constants/repository-validation'
import {
  CONTRIBUTION_ACTIVE_WITHIN_DAYS,
  CONTRIBUTION_READY_MIN_OPEN_ISSUES,
  getContributionReadiness,
  NON_PROJECT_TOPICS,
  STARTER_FRIENDLY_TOPICS,
} from '@/features/repositories/services/contribution-readiness'
import type { RepoSearchParams } from '@/features/repositories/types/repository-query'

type RepoRow = typeof repos.$inferSelect
type CuratedProjectRow = typeof curatedProjects.$inferSelect
export type RepoWithCurated = RepoRow & { curated?: CuratedProjectRow }

function boundedPage(value?: number) {
  if (!value || Number.isNaN(value) || value < 1) return 1
  return Math.floor(value)
}

function boundedPerPage(value?: number) {
  if (!value || Number.isNaN(value)) return REPOSITORY_QUERY_LIMITS.defaultPageSize
  return Math.min(Math.max(Math.floor(value), 1), REPOSITORY_QUERY_LIMITS.maximumPageSize)
}

function cleanString(value?: string | null) {
  const cleaned = value?.trim()
  return cleaned || undefined
}

function starterTopicConditions() {
  return STARTER_FRIENDLY_TOPICS.map(
    (topic) => sql`${repos.topics} @> ${JSON.stringify([topic])}::jsonb`,
  )
}

function starterFriendlyCondition() {
  return or(eq(repos.hasGoodFirstIssues, true), ...starterTopicConditions())
}

function nonProjectTopicConditions() {
  return NON_PROJECT_TOPICS.map(
    (topic) => sql`${repos.topics} @> ${JSON.stringify([topic])}::jsonb`,
  )
}

function nonProjectRepoCondition() {
  const nonProjectTopics = or(...nonProjectTopicConditions()) || sql`false`

  return sql`(
    ${nonProjectTopics}
    OR lower(coalesce(${repos.name}, '')) LIKE 'awesome-%'
    OR lower(coalesce(${repos.description}, '')) LIKE '%awesome list%'
    OR lower(coalesce(${repos.description}, '')) LIKE '%awesome lists%'
    OR lower(coalesce(${repos.description}, '')) LIKE '%curated list%'
    OR lower(coalesce(${repos.description}, '')) LIKE '%curated collection%'
    OR lower(coalesce(${repos.description}, '')) LIKE '%collection of resources%'
    OR lower(coalesce(${repos.description}, '')) LIKE '%list of resources%'
    OR lower(coalesce(${repos.description}, '')) LIKE '%roadmap to%'
    OR lower(coalesce(${repos.description}, '')) LIKE '%interview questions%'
  )`
}

function buildContributionReadyConditions() {
  const activeAfter = new Date(Date.now() - CONTRIBUTION_ACTIVE_WITHIN_DAYS * 24 * 60 * 60 * 1000)

  return [
    eq(repos.isArchived, false),
    sql`${repos.language} is not null and ${repos.language} <> ''`,
    sql`not ${nonProjectRepoCondition()}`,
    sql`${repos.license} is not null and ${repos.license} <> ''`,
    gte(repos.openIssues, CONTRIBUTION_READY_MIN_OPEN_ISSUES),
    gte(repos.pushedAt, activeAfter),
    sql`(
      coalesce(length(${repos.description}), 0) > 0
      OR coalesce(length(${repos.readmeExcerpt}), 0) > 0
    )`,
  ]
}

function contributionScoreSql() {
  const starterTopics = or(...starterTopicConditions()) || sql`false`
  const nonProjectRepo = nonProjectRepoCondition()

  return sql<number>`(
    case when ${repos.isArchived} = false then 10 else -50 end
    + case when ${repos.language} is not null and ${repos.language} <> '' then 10 else -30 end
    + case when ${nonProjectRepo} then -60 else 0 end
    + case when ${repos.license} is not null and ${repos.license} <> '' then 15 else -20 end
    + case
        when ${repos.pushedAt} > now() - interval '90 days' then 15
        when ${repos.pushedAt} > now() - interval '365 days' then 10
        else -20
      end
    + case
        when ${repos.openIssues} >= 5 then 15
        when ${repos.openIssues} >= 1 then 8
        else -20
      end
    + case when ${repos.hasGoodFirstIssues} then 25 else 0 end
    + case when ${starterTopics} then 12 else 0 end
    + case
        when coalesce(length(${repos.description}), 0) > 0
          OR coalesce(length(${repos.readmeExcerpt}), 0) > 0
        then 10
        else -10
      end
    + case when ${repos.defaultBranch} is not null and ${repos.defaultBranch} <> '' then 5 else 0 end
    + case
        when ${repos.stars} between 10 and 50000 then 10
        when ${repos.stars} > 0 then 5
        else 0
      end
    + case when ${repos.forks} > 0 then 5 else 0 end
  )`
}

function buildConditions(params: RepoSearchParams) {
  const conditions: SQL[] = []
  const query = cleanString(params.query)

  if (query) {
    const like = `%${query}%`
    conditions.push(sql`(
      to_tsvector('english', coalesce(${repos.fullName}, '') || ' ' || coalesce(${repos.description}, '') || ' ' || coalesce(${repos.readmeExcerpt}, ''))
        @@ plainto_tsquery('english', ${query})
      OR ${repos.fullName} ILIKE ${like}
      OR ${repos.description} ILIKE ${like}
      OR ${repos.language} ILIKE ${like}
    )`)
  }

  if (params.language) {
    conditions.push(sql`lower(${repos.language}) = ${params.language.toLowerCase()}`)
  }

  if (params.topic) {
    const topics = params.topic
      .split(',')
      .map((topic) => topic.trim().toLowerCase())
      .filter(Boolean)
      .slice(0, 20)

    for (const topic of topics) {
      conditions.push(sql`${repos.topics} @> ${JSON.stringify([topic])}::jsonb`)
    }
  }

  if (params.license) {
    conditions.push(ilike(repos.license, params.license))
  }

  if (params.minStars !== undefined) conditions.push(gte(repos.stars, params.minStars))
  if (params.maxStars !== undefined) conditions.push(lte(repos.stars, params.maxStars))
  if (params.minForks !== undefined) conditions.push(gte(repos.forks, params.minForks))
  if (params.maxForks !== undefined) conditions.push(lte(repos.forks, params.maxForks))
  if (params.minContributors !== undefined)
    conditions.push(gte(repos.contributors, params.minContributors))
  if (params.pushedAfter) conditions.push(gte(repos.pushedAt, params.pushedAfter))
  if (params.createdAfter) conditions.push(gte(repos.createdAt, params.createdAfter))
  if (params.updatedAfter) conditions.push(gte(repos.updatedAt, params.updatedAfter))

  if (params.activeOnly) {
    const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000)
    conditions.push(gte(repos.pushedAt, params.pushedAfter || sixMonthsAgo))
  }

  if (params.hasGoodFirstIssues !== undefined) {
    conditions.push(eq(repos.hasGoodFirstIssues, params.hasGoodFirstIssues))
  }

  if (params.contributionReadyOnly) {
    conditions.push(...buildContributionReadyConditions())
  }

  if (params.starterFriendlyOnly) {
    const starterCondition = starterFriendlyCondition()
    if (starterCondition) conditions.push(starterCondition)
  }

  return conditions.length > 0 ? and(...conditions) : undefined
}

function buildOrderBy(params: RepoSearchParams) {
  const query = cleanString(params.query)

  if (query && (params.sort === undefined || params.sort === 'relevance')) {
    const contributionScore = contributionScoreSql()

    return sql`(
      ts_rank_cd(
        to_tsvector('english', coalesce(${repos.fullName}, '') || ' ' || coalesce(${repos.description}, '') || ' ' || coalesce(${repos.readmeExcerpt}, '')),
        plainto_tsquery('english', ${query})
      ) * 0.65
      + case when ${repos.fullName} ILIKE ${`%${query}%`} then 0.2 else 0 end
      + least(ln(greatest(${repos.stars}, 1)) / 12, 1) * 0.1
      + (${contributionScore} / 100.0) * 0.05
    ) DESC`
  }

  switch (params.sort) {
    case 'contribution':
      return sql`${contributionScoreSql()} DESC`
    case 'forks':
      return desc(repos.forks)
    case 'recent':
      return desc(repos.createdAt)
    case 'updated':
      return desc(repos.pushedAt)
    default:
      return desc(repos.stars)
  }
}

export async function searchRepos(params: RepoSearchParams = {}) {
  const page = boundedPage(params.page)
  const perPage = boundedPerPage(params.perPage)
  const offset = (page - 1) * perPage
  const where = buildConditions(params)
  const orderBy = buildOrderBy(params)

  const [rows, [countRow]] = await Promise.all([
    db
      .select()
      .from(repos)
      .where(where)
      .orderBy(orderBy, desc(repos.stars), asc(repos.id))
      .limit(perPage)
      .offset(offset),
    db.select({ count: sql<number>`count(*)::int` }).from(repos).where(where),
  ])

  return {
    items: rows,
    totalCount: countRow?.count ?? rows.length,
    page,
    perPage,
  }
}

export async function listTrendingRepos(
  params: Pick<RepoSearchParams, 'page' | 'perPage' | 'query' | 'language'> = {},
) {
  const page = boundedPage(params.page)
  const perPage = boundedPerPage(params.perPage)
  const offset = (page - 1) * perPage
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const recentActivity = or(gte(repos.createdAt, thirtyDaysAgo), gte(repos.pushedAt, thirtyDaysAgo))
  const filters = buildConditions({ query: params.query, language: params.language })
  const where = and(
    recentActivity,
    ...buildContributionReadyConditions(),
    ...(filters ? [filters] : []),
  )

  const [rows, [countRow]] = await Promise.all([
    db
      .select()
      .from(repos)
      .where(where)
      .orderBy(
        sql`${contributionScoreSql()} DESC`,
        desc(repos.stars),
        desc(repos.pushedAt),
        asc(repos.id),
      )
      .limit(perPage)
      .offset(offset),
    db.select({ count: sql<number>`count(*)::int` }).from(repos).where(where),
  ])

  return {
    items: rows,
    totalCount: countRow?.count ?? rows.length,
    page,
    perPage,
  }
}

export async function listCuratedRepos(
  source: 'github' | 'manual' | 'import' = 'github',
  params: Pick<RepoSearchParams, 'page' | 'perPage' | 'query' | 'language'> = {},
) {
  const page = boundedPage(params.page)
  const perPage = boundedPerPage(params.perPage)
  const offset = (page - 1) * perPage
  const sourceWhere = eq(curatedProjects.source, source)
  const filters = buildConditions({ query: params.query, language: params.language })
  const where = and(
    sourceWhere,
    ...(source === 'github' ? buildContributionReadyConditions() : []),
    ...(filters ? [filters] : []),
  )

  const [rows, [countRow]] = await Promise.all([
    db
      .select({
        repo: repos,
        curated: curatedProjects,
      })
      .from(curatedProjects)
      .innerJoin(repos, eq(curatedProjects.repoId, repos.id))
      .where(where)
      .orderBy(sql`${contributionScoreSql()} DESC`, desc(repos.stars), asc(repos.id))
      .limit(perPage)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(curatedProjects)
      .innerJoin(repos, eq(curatedProjects.repoId, repos.id))
      .where(where),
  ])

  return {
    items: rows.map((row) => ({ ...row.repo, curated: row.curated })),
    totalCount: countRow?.count ?? rows.length,
    page,
    perPage,
  }
}

export async function getRepoByFullName(fullName: string) {
  const [row] = await db.select().from(repos).where(eq(repos.fullName, fullName)).limit(1)

  if (!row) return null

  return row
}

export function toGithubRepository(repo: RepoWithCurated) {
  const readiness = getContributionReadiness(repo)

  return {
    id: repo.ghId,
    opendeck_id: repo.id,
    node_id: repo.id,
    name: repo.name,
    full_name: repo.fullName,
    owner: {
      login: repo.owner,
      avatar_url: repo.avatarUrl,
    },
    html_url: repo.htmlUrl,
    homepage: repo.homepageUrl,
    default_branch: repo.defaultBranch,
    description: repo.description,
    language: repo.language,
    stargazers_count: repo.stars,
    forks_count: repo.forks,
    open_issues_count: repo.openIssues,
    license: repo.license ? { key: repo.license, name: repo.license } : null,
    topics: repo.topics,
    pushed_at: repo.pushedAt?.toISOString() ?? null,
    created_at: repo.createdAt?.toISOString() ?? null,
    updated_at: repo.updatedAt?.toISOString() ?? null,
    is_archived: repo.isArchived,
    readme_excerpt: repo.readmeExcerpt,
    has_good_first_issues: repo.hasGoodFirstIssues,
    contributors: repo.contributors,
    contribution_score: readiness.score,
    is_contribution_ready: readiness.isReady,
    contribution_blockers: readiness.blockers,
    curated: repo.curated
      ? {
          source: repo.curated.source,
          batch: repo.curated.batch,
          company: repo.curated.company,
          logo_url: repo.curated.logoUrl,
          tags: repo.curated.tags,
          created_at: repo.curated.createdAt.toISOString(),
        }
      : null,
  }
}
