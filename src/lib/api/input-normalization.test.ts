import assert from 'node:assert/strict'
import test from 'node:test'
import {
  cleanStringList,
  cleanUuid,
  normalizeNumber,
  parseIntegerValue,
  safeRelativePath,
} from '@/lib/api/input-normalization'

test('safeRelativePath accepts local application paths and preserves their suffixes', () => {
  assert.equal(
    safeRelativePath('/dashboard/home?tab=security#sessions'),
    '/dashboard/home?tab=security#sessions',
  )
})

test('safeRelativePath rejects external, protocol-relative, escaped and control-character paths', () => {
  for (const value of [
    'https://example.com',
    '//example.com/path',
    '/dashboard\\admin',
    '/dashboard\nadmin',
    null,
  ]) {
    assert.equal(safeRelativePath(value), undefined)
  }
})

test('identifier, list and numeric normalization enforce their runtime bounds', () => {
  assert.equal(
    cleanUuid('550e8400-e29b-41d4-a716-446655440000'),
    '550e8400-e29b-41d4-a716-446655440000',
  )
  assert.equal(cleanUuid('not-a-uuid'), '')
  assert.deepEqual(cleanStringList(' TypeScript, Rust, TypeScript, , Go ', 3), [
    'TypeScript',
    'Rust',
  ])
  assert.equal(normalizeNumber('-10', 5, 100), 0)
  assert.equal(normalizeNumber('150', 5, 100), 100)
  assert.equal(normalizeNumber('invalid', 5, 100), 5)
  assert.equal(parseIntegerValue('42'), 42)
  assert.equal(parseIntegerValue('4.2'), undefined)
})
