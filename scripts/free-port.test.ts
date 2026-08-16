import assert from 'node:assert/strict'
import { createServer, type Server } from 'node:net'
import test from 'node:test'
import { findFreePort, hasExplicitPort } from './free-port'

function occupy(port: number, host = '0.0.0.0') {
  return new Promise<Server>((resolve, reject) => {
    const server = createServer()
    server.once('error', reject)
    server.listen(port, host, () => resolve(server))
  })
}

function close(server: Server) {
  return new Promise<void>((resolve) => server.close(() => resolve()))
}

test('findFreePort returns the preferred port when it is free', async () => {
  const preferred = 41500
  const port = await findFreePort(preferred, { attempts: 20 })
  assert.equal(port, preferred)
})

test('findFreePort skips an occupied port and returns the next free one', async () => {
  const preferred = 41520
  const server = await occupy(preferred)
  try {
    const port = await findFreePort(preferred, { attempts: 20 })
    assert.ok(port > preferred, `expected a port above ${preferred}, received ${port}`)
  } finally {
    await close(server)
  }
})

test('hasExplicitPort detects every supported port flag form', () => {
  assert.equal(hasExplicitPort(['--turbo', '--port', '4000']), true)
  assert.equal(hasExplicitPort(['--port=4000']), true)
  assert.equal(hasExplicitPort(['-p', '4000']), true)
  assert.equal(hasExplicitPort(['--turbo']), false)
})
