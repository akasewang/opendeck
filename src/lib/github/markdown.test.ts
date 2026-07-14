import assert from 'node:assert/strict'
import test from 'node:test'
import { absolutizeReadmeHtml, sanitizeRepositoryHtml } from '@/lib/github/markdown'

test('repository HTML removes executable tags, handlers and inline styles', () => {
  const sanitized = sanitizeRepositoryHtml(
    '<script>alert(1)</script><a onclick="alert(1)" style="color:red" href="https://example.com">Safe</a>',
  )

  assert.equal(sanitized, '<a href="https://example.com">Safe</a>')
})

test('repository HTML blocks encoded unsafe protocols and preserves safe HTTPS links', () => {
  for (const href of [
    'java&#x73;cript:alert(1)',
    'javascript&colon;alert(1)',
    'java&#10;script:alert(1)',
    'data:text/html,unsafe',
  ]) {
    const sanitized = sanitizeRepositoryHtml(`<a href="${href}">Unsafe</a>`)
    assert.equal(sanitized, '<a>Unsafe</a>')
  }

  assert.equal(
    sanitizeRepositoryHtml('<a href="https://example.com/docs">Safe</a>'),
    '<a href="https://example.com/docs">Safe</a>',
  )
})

test('README links and images resolve relative to their repository source path', () => {
  const html = absolutizeReadmeHtml(
    '<img src="images/logo.png"><a href="../CONTRIBUTING.md">Contribute</a>',
    'openai/example repo',
    'main',
    'docs/README.md',
  )

  assert.match(
    html,
    /https:\/\/raw\.githubusercontent\.com\/openai\/example%20repo\/main\/docs\/images\/logo\.png/,
  )
  assert.match(html, /https:\/\/github\.com\/openai\/example%20repo\/blob\/main\/CONTRIBUTING\.md/)
})
