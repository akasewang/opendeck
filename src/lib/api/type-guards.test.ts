import assert from 'node:assert/strict'
import test from 'node:test'
import {
  isNonNegativeInteger,
  isNullableString,
  isOptionalString,
  isStringArray,
  toNonNegativeInteger,
} from '@/lib/api/type-guards'

test('isNullableString accepts strings and null but rejects undefined', () => {
  assert.equal(isNullableString('x'), true)
  assert.equal(isNullableString(null), true)
  assert.equal(isNullableString(undefined), false)
  assert.equal(isNullableString(7), false)
})

test('isOptionalString accepts strings, null, and undefined', () => {
  assert.equal(isOptionalString('x'), true)
  assert.equal(isOptionalString(null), true)
  assert.equal(isOptionalString(undefined), true)
  assert.equal(isOptionalString(7), false)
})

test('isNonNegativeInteger requires a safe integer >= 0', () => {
  assert.equal(isNonNegativeInteger(0), true)
  assert.equal(isNonNegativeInteger(42), true)
  assert.equal(isNonNegativeInteger(-1), false)
  assert.equal(isNonNegativeInteger(1.5), false)
  assert.equal(isNonNegativeInteger('5'), false)
})

test('isStringArray requires every element to be a string', () => {
  assert.equal(isStringArray(['a', 'b']), true)
  assert.equal(isStringArray([]), true)
  assert.equal(isStringArray(['a', 1]), false)
  assert.equal(isStringArray('a'), false)
})

test('toNonNegativeInteger returns the value or null', () => {
  assert.equal(toNonNegativeInteger(3), 3)
  assert.equal(toNonNegativeInteger(-1), null)
  assert.equal(toNonNegativeInteger('3'), null)
})
