import { desc, eq, sql } from 'drizzle-orm'
import { db } from '@/db/client'
import { repos } from '@/db/schema'

export async function listOrganizations(limit?: number) {
  const query = db
    .select({
      owner: repos.owner,
      avatarUrl: sql<
        string | null
      >`(array_agg(${repos.avatarUrl} order by ${repos.stars} desc))[1]`,
      repoCount: sql<number>`count(*)::int`,
      totalStars: sql<number>`coalesce(sum(${repos.stars}), 0)::int`,
      totalForks: sql<number>`coalesce(sum(${repos.forks}), 0)::int`,
      totalOpenIssues: sql<number>`coalesce(sum(${repos.openIssues}), 0)::int`,
      totalContributors: sql<number>`coalesce(sum(${repos.contributors}), 0)::int`,
      goodFirstIssueRepos: sql<number>`count(*) filter (where ${repos.hasGoodFirstIssues} = true)::int`,
      archivedRepos: sql<number>`count(*) filter (where ${repos.isArchived} = true)::int`,
      activeRepos: sql<number>`count(*) filter (where ${repos.isArchived} = false)::int`,
      homepageRepos: sql<number>`count(*) filter (where ${repos.homepageUrl} is not null and ${repos.homepageUrl} <> '')::int`,
      topRepo: sql<string>`(array_agg(${repos.fullName} order by ${repos.stars} desc))[1]`,
      topDescription: sql<
        string | null
      >`(array_agg(${repos.description} order by ${repos.stars} desc))[1]`,
      newestRepo: sql<
        string | null
      >`(array_agg(${repos.fullName} order by ${repos.createdAt} desc nulls last))[1]`,
      topLanguage: sql<
        string | null
      >`(array_agg(${repos.language} order by ${repos.stars} desc))[1]`,
      latestPushedAt: sql<Date | null>`max(${repos.pushedAt})`,
      latestUpdatedAt: sql<Date | null>`max(${repos.updatedAt})`,
    })
    .from(repos)
    .groupBy(repos.owner)
    .orderBy(sql`sum(${repos.stars}) desc`, sql`count(*) desc`)

  return limit ? query.limit(limit) : query
}

function topCounts(values: Array<string | null | undefined>, limit: number) {
  const counts = new Map<string, number>()

  for (const value of values) {
    const cleaned = value?.trim()
    if (!cleaned) continue
    counts.set(cleaned, (counts.get(cleaned) ?? 0) + 1)
  }

  return Array.from(counts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, limit)
}

function topTopicCounts(topicLists: string[][], limit: number) {
  return topCounts(
    topicLists.flatMap((topics) => topics.filter(Boolean)),
    limit,
  )
}

export async function getOrganizationDetails(owner: string) {
  const rows = await db
    .select({
      fullName: repos.fullName,
      language: repos.language,
      topics: repos.topics,
      stars: repos.stars,
      forks: repos.forks,
      openIssues: repos.openIssues,
      license: repos.license,
      homepageUrl: repos.homepageUrl,
      defaultBranch: repos.defaultBranch,
      isArchived: repos.isArchived,
      hasGoodFirstIssues: repos.hasGoodFirstIssues,
      contributors: repos.contributors,
      pushedAt: repos.pushedAt,
      createdAt: repos.createdAt,
      updatedAt: repos.updatedAt,
    })
    .from(repos)
    .where(eq(repos.owner, owner))
    .orderBy(desc(repos.stars))

  let latestPushedAt: Date | null = null
  let latestUpdatedAt: Date | null = null
  let newestRepo: (typeof rows)[number] | null = null
  let mostActiveRepo: (typeof rows)[number] | null = null
  let mostActiveAt = 0

  for (const repo of rows) {
    if (repo.pushedAt && repo.pushedAt.getTime() > (latestPushedAt?.getTime() ?? 0)) {
      latestPushedAt = repo.pushedAt
    }
    if (repo.updatedAt && repo.updatedAt.getTime() > (latestUpdatedAt?.getTime() ?? 0)) {
      latestUpdatedAt = repo.updatedAt
    }
    if (repo.createdAt && repo.createdAt.getTime() > (newestRepo?.createdAt?.getTime() ?? 0)) {
      newestRepo = repo
    }

    const activeAt = repo.pushedAt?.getTime() ?? repo.updatedAt?.getTime() ?? 0
    if (activeAt > mostActiveAt) {
      mostActiveAt = activeAt
      mostActiveRepo = repo
    }
  }

  return {
    languageBreakdown: topCounts(
      rows.map((repo) => repo.language),
      8,
    ),
    topicBreakdown: topTopicCounts(
      rows.map((repo) => repo.topics ?? []),
      12,
    ),
    licenseBreakdown: topCounts(
      rows.map((repo) => repo.license),
      8,
    ),
    topRepos: rows.slice(0, 5).map((repo) => ({
      fullName: repo.fullName,
      stars: repo.stars,
      forks: repo.forks,
      openIssues: repo.openIssues,
      language: repo.language,
    })),
    defaultBranches: topCounts(
      rows.map((repo) => repo.defaultBranch),
      5,
    ),
    latestPushedAt: latestPushedAt?.toISOString() ?? null,
    latestUpdatedAt: latestUpdatedAt?.toISOString() ?? null,
    newestRepo: newestRepo?.fullName ?? null,
    mostActiveRepo: mostActiveRepo?.fullName ?? null,
  }
}
