import { desc, eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { repoIssues, repoMetricSnapshots, repos } from '@/db/schema'
import {
  getContributionReadiness,
  getSetupDifficulty,
  NON_PROJECT_TOPICS,
} from '@/features/repositories/services/contribution-readiness'
import {
  mapRepositoryIssue,
  syncRepositoryIssues,
} from '@/features/repositories/services/repository-issue-service'
import { toGithubRepository } from '@/features/repositories/services/repository-query-service'
import { cleanText } from '@/lib/api/input-normalization'

export async function getRepoInsight(fullName: string) {
  const [repo] = await db.select().from(repos).where(eq(repos.fullName, fullName)).limit(1)
  if (!repo) return null

  const [snapshots, issues] = await Promise.all([
    db
      .select()
      .from(repoMetricSnapshots)
      .where(eq(repoMetricSnapshots.repoId, repo.id))
      .orderBy(desc(repoMetricSnapshots.capturedAt))
      .limit(30),
    db
      .select()
      .from(repoIssues)
      .where(eq(repoIssues.repoId, repo.id))
      .orderBy(desc(repoIssues.updatedAt))
      .limit(30),
  ])

  if (issues.length === 0) await syncRepositoryIssues(repo.id, repo.fullName)
  const refreshedIssues =
    issues.length > 0
      ? issues
      : await db
          .select()
          .from(repoIssues)
          .where(eq(repoIssues.repoId, repo.id))
          .orderBy(desc(repoIssues.updatedAt))
          .limit(30)

  const readiness = getContributionReadiness(repo)
  const setupDifficulty = getSetupDifficulty(repo)
  const activeIssues = refreshedIssues.filter((issue) => issue.state === 'open')
  const lowCommentIssues = activeIssues.filter((issue) => issue.comments <= 5).length
  const responsivenessScore = Math.min(
    100,
    Math.max(
      0,
      (repo.pushedAt && Date.now() - repo.pushedAt.getTime() < 90 * 24 * 60 * 60 * 1000 ? 35 : 10) +
        Math.min(activeIssues.length * 5, 25) +
        Math.min(lowCommentIssues * 6, 24) +
        (repo.contributors > 5 ? 16 : repo.contributors > 1 ? 8 : 0),
    ),
  )

  return {
    repo: toGithubRepository(repo),
    readiness,
    setupDifficulty,
    responsivenessScore,
    qualitySignals: {
      likelyResourceCollection: NON_PROJECT_TOPICS.some((topic) => repo.topics.includes(topic)),
      stale: !repo.pushedAt || Date.now() - repo.pushedAt.getTime() > 365 * 24 * 60 * 60 * 1000,
      archived: repo.isArchived,
      issueQueue: repo.openIssues,
      contributorCount: repo.contributors,
    },
    timeline: snapshots
      .map((snapshot) => ({
        stars: snapshot.stars,
        forks: snapshot.forks,
        openIssues: snapshot.openIssues,
        capturedAt: snapshot.capturedAt.toISOString(),
      }))
      .reverse(),
    issues: refreshedIssues.map((issue) => mapRepositoryIssue(issue, repo.fullName)),
  }
}

export async function compareRepos(fullNames: string[]) {
  const names = fullNames
    .map((name) => cleanText(name, 180))
    .filter(Boolean)
    .slice(0, 4)
  if (names.length === 0) return []

  return Promise.all(names.map((name) => getRepoInsight(name)))
}
