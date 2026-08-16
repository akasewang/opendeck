import { eq, gte, or, sql } from 'drizzle-orm'
import { repos } from '@/db/schema'
import {
  CONTRIBUTION_ACTIVE_WITHIN_DAYS,
  CONTRIBUTION_FRESH_ACTIVITY_DAYS,
  CONTRIBUTION_ISSUE_BACKLOG_LIMIT,
  CONTRIBUTION_POPULAR_STARS_MAX,
  CONTRIBUTION_POPULAR_STARS_MIN,
  CONTRIBUTION_READY_MIN_OPEN_ISSUES,
  CONTRIBUTION_RECENT_ACTIVITY_DAYS,
  CONTRIBUTION_STRONG_ISSUE_COUNT,
  CONTRIBUTION_SWEET_SPOT_STARS_MAX,
  CONTRIBUTION_SWEET_SPOT_STARS_MIN,
  NON_PROJECT_TOPICS,
  STARTER_FRIENDLY_TOPICS,
} from '@/features/repositories/services/contribution-readiness'
import { DAY_MS } from '@/utils/time'

function starterTopicConditions() {
  return STARTER_FRIENDLY_TOPICS.map(
    (topic) => sql`${repos.topics} @> ${JSON.stringify([topic])}::jsonb`,
  )
}

export function starterFriendlyCondition() {
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

export function buildContributionReadyConditions() {
  const activeAfter = new Date(Date.now() - CONTRIBUTION_ACTIVE_WITHIN_DAYS * DAY_MS)

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

export function contributionScoreSql() {
  const starterTopics = or(...starterTopicConditions()) || sql`false`
  const nonProjectRepo = nonProjectRepoCondition()

  return sql<number>`(
    case when ${repos.isArchived} = false then 10 else -50 end
    + case when ${repos.language} is not null and ${repos.language} <> '' then 10 else -30 end
    + case when ${nonProjectRepo} then -60 else 0 end
    + case when ${repos.license} is not null and ${repos.license} <> '' then 15 else -20 end
    + case
        when ${repos.pushedAt} > now() - ${CONTRIBUTION_FRESH_ACTIVITY_DAYS} * interval '1 day' then 18
        when ${repos.pushedAt} > now() - ${CONTRIBUTION_RECENT_ACTIVITY_DAYS} * interval '1 day' then 15
        when ${repos.pushedAt} > now() - ${CONTRIBUTION_ACTIVE_WITHIN_DAYS} * interval '1 day' then 10
        else -20
      end
    + case
        when ${repos.openIssues} >= ${CONTRIBUTION_STRONG_ISSUE_COUNT} then 15
        when ${repos.openIssues} >= ${CONTRIBUTION_READY_MIN_OPEN_ISSUES} then 8
        else -20
      end
    + case when ${repos.openIssues} > ${CONTRIBUTION_ISSUE_BACKLOG_LIMIT} then -8 else 0 end
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
        when ${repos.stars} between ${CONTRIBUTION_SWEET_SPOT_STARS_MIN} and ${CONTRIBUTION_SWEET_SPOT_STARS_MAX} then 12
        when ${repos.stars} between ${CONTRIBUTION_POPULAR_STARS_MIN} and ${CONTRIBUTION_POPULAR_STARS_MAX} then 8
        when ${repos.stars} > 0 then 4
        else 0
      end
    + case when ${repos.forks} > 0 then 5 else 0 end
  )`
}
