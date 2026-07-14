import assert from 'node:assert/strict'
import test from 'node:test'
import { nextRepositoryIssueSyncPage } from './repository-issue-service'

test('partial issue batches overlap their boundary page while making progress', () => {
  assert.equal(nextRepositoryIssueSyncPage(1, 5, false), 5)
  assert.equal(nextRepositoryIssueSyncPage(5, 5, false), 9)
})

test('a completed issue synchronization resets the next cycle to page one', () => {
  assert.equal(nextRepositoryIssueSyncPage(21, 2, true), 1)
})

test('invalid issue cursor inputs cannot move the cursor below page one', () => {
  assert.equal(nextRepositoryIssueSyncPage(0, 5, false), 1)
  assert.equal(nextRepositoryIssueSyncPage(4, 0, false), 4)
})
