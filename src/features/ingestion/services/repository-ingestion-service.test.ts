import assert from 'node:assert/strict'
import test from 'node:test'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from '@/db/schema'
import { buildRepositorySnapshotWrite } from './repository-ingestion-service'

test('repository snapshot insert-select matches every target field in schema order', () => {
  const database = drizzle.mock({ schema })
  const query = buildRepositorySnapshotWrite(database, {
    ghId: 123,
    stars: 456,
    forks: 78,
    openIssues: 9,
  }).toSQL()

  assert.match(
    query.sql,
    /insert into "repo_metric_snapshots" \("id", "repo_id", "stars", "forks", "open_issues", "captured_at"\)/,
  )
  assert.match(query.sql, /select gen_random_uuid\(\).*now\(\)/)
})
