import assert from 'node:assert/strict'
import test from 'node:test'
import { githubAvatarUrl } from '@/lib/github/avatar'

test('normalizes a GitHub avatar to one shared optimizer source size', () => {
  assert.equal(
    githubAvatarUrl('https://avatars.githubusercontent.com/u/123?v=4'),
    'https://avatars.githubusercontent.com/u/123?v=4&s=128',
  )
})

test('replaces an existing avatar size', () => {
  assert.equal(
    githubAvatarUrl('https://avatars.githubusercontent.com/u/123?s=24&v=4'),
    'https://avatars.githubusercontent.com/u/123?s=128&v=4',
  )
})

test('leaves non-GitHub and invalid URLs unchanged', () => {
  assert.equal(githubAvatarUrl('https://example.com/avatar.png'), 'https://example.com/avatar.png')
  assert.equal(githubAvatarUrl('not a URL'), 'not a URL')
})
