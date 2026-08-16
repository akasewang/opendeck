import assert from 'node:assert/strict'
import test from 'node:test'
import { getContributionReadiness } from '@/features/repositories/services/contribution-readiness'

test('a fully qualified active repository scores as ready and starter friendly', () => {
  const now = new Date('2026-01-01T00:00:00Z')
  const readiness = getContributionReadiness(
    {
      language: 'TypeScript',
      license: 'MIT',
      defaultBranch: 'main',
      openIssues: 10,
      hasGoodFirstIssues: true,
      stars: 500,
      forks: 20,
      description: 'A real project with contribution opportunities',
      topics: [],
      isArchived: false,
      pushedAt: now,
    },
    now,
  )

  assert.equal(readiness.isReady, true)
  assert.equal(readiness.starterFriendly, true)
  assert.equal(readiness.score, 100)
  assert.deepEqual(readiness.blockers, [])
})

test('a repository missing every signal is blocked with its reasons enumerated', () => {
  const now = new Date('2026-01-01T00:00:00Z')
  const readiness = getContributionReadiness(
    {
      language: null,
      license: null,
      openIssues: 0,
      description: '',
      readmeExcerpt: '',
      topics: [],
      isArchived: true,
      pushedAt: new Date('2022-01-01T00:00:00Z'),
    },
    now,
  )

  assert.equal(readiness.isReady, false)
  assert.equal(readiness.starterFriendly, false)
  for (const blocker of [
    'Archived',
    'No primary language',
    'No license',
    'Inactive',
    'No open issues',
    'No project context',
  ]) {
    assert.ok(readiness.blockers.includes(blocker), `expected blocker: ${blocker}`)
  }
})

test('scoring favors fresh, sweet-spot repos over stale mega-repos with huge backlogs', () => {
  const now = new Date('2026-01-01T00:00:00Z')
  const base = {
    language: 'TypeScript',
    license: 'MIT',
    defaultBranch: 'main',
    description: 'A real project with contribution opportunities',
    topics: [],
    isArchived: false,
  }

  const freshSweetSpot = getContributionReadiness(
    { ...base, openIssues: 20, hasGoodFirstIssues: true, stars: 800, forks: 30, pushedAt: now },
    now,
  )
  const staleMegaBacklog = getContributionReadiness(
    {
      ...base,
      openIssues: 5000,
      hasGoodFirstIssues: false,
      stars: 80_000,
      forks: 100,
      pushedAt: new Date('2025-06-01T00:00:00Z'),
    },
    now,
  )

  assert.equal(freshSweetSpot.isReady, true)
  assert.equal(staleMegaBacklog.isReady, true)
  assert.ok(
    freshSweetSpot.score > staleMegaBacklog.score,
    `expected fresh sweet-spot repo (${freshSweetSpot.score}) to outscore stale mega-backlog repo (${staleMegaBacklog.score})`,
  )
})
