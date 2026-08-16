import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import test from 'node:test'
import {
  extractLocalUrl,
  findLanCandidates,
  formatPreviewSummary,
  networkUrl,
  normalizeMobileHost,
  parseArguments,
  resolveChildExitCode,
  shouldRelayServerLine,
  verifyNetworkUrl,
} from './dev-mobile'

test('mobile-host parsing removes only wrapper arguments and forwards the rest', () => {
  assert.deepEqual(parseArguments(['--turbo', '--mobile-host', '192.168.1.25', '--port', '4010']), {
    forwardedArgs: ['--turbo', '--port', '4010'],
    mobileHost: '192.168.1.25',
  })
  assert.deepEqual(parseArguments(['--mobile-host=opendeck.local', '-p', '4020']), {
    forwardedArgs: ['-p', '4020'],
    mobileHost: 'opendeck.local',
  })
  assert.throws(() => parseArguments(['--mobile-host']), /requires an IPv4 address or hostname/)
})

test('manual hosts are normalized and unsafe network values are rejected', () => {
  assert.equal(normalizeMobileHost(' OpenDeck.Local ', 'test'), 'opendeck.local')
  assert.equal(normalizeMobileHost('192.168.1.25', 'test'), '192.168.1.25')
  assert.throws(() => normalizeMobileHost('127.0.0.1', 'test'), /cannot use/)
  assert.throws(() => normalizeMobileHost('http://192.168.1.25:3000', 'test'), /without a protocol/)
})

test('LAN selection excludes loopback, link-local, virtual, and unusable interfaces', () => {
  const interfaces = {
    Loopback: [
      {
        address: '127.0.0.1',
        family: 'IPv4',
        internal: true,
        mac: '00:00:00:00:00:00',
      },
    ],
    'Docker Desktop': [
      {
        address: '172.20.0.1',
        family: 'IPv4',
        internal: false,
        mac: '11:11:11:11:11:11',
      },
    ],
    'WSL (Hyper-V firewall)': [
      {
        address: '172.24.0.1',
        family: 'IPv4',
        internal: false,
        mac: '22:22:22:22:22:22',
      },
    ],
    VPN: [
      {
        address: '10.8.0.2',
        family: 'IPv4',
        internal: false,
        mac: '33:33:33:33:33:33',
      },
    ],
    Ethernet: [
      {
        address: '169.254.5.10',
        family: 'IPv4',
        internal: false,
        mac: '44:44:44:44:44:44',
      },
    ],
    WiFi: [
      {
        address: '192.168.1.25',
        family: 'IPv4',
        internal: false,
        mac: '55:55:55:55:55:55',
      },
      {
        address: 'fe80::1',
        family: 'IPv6',
        internal: false,
        mac: '55:55:55:55:55:55',
      },
    ],
    Inactive: [],
  }

  assert.deepEqual(findLanCandidates(interfaces), [
    { address: '192.168.1.25', name: 'WiFi', score: 300 },
  ])
})

test('Next output parsing preserves the announced HTTPS fallback port', () => {
  const output =
    '\u001B[33mPort 3000 is in use, using available port 3001 instead.\u001B[39m\n' +
    '   - Local:        https://localhost:3001\n'
  assert.equal(extractLocalUrl(output), 'https://localhost:3001')
  assert.equal(networkUrl('https://localhost:3001', '192.168.1.25'), 'https://192.168.1.25:3001')
})

test('terminal output hides unusable bind addresses and ends URL lines at the URL', () => {
  assert.equal(shouldRelayServerLine('   - Network:      http://0.0.0.0:3000\n'), false)
  assert.equal(
    shouldRelayServerLine('\u001B[32m   - Network:      http://[::]:3000\u001B[39m\n'),
    false,
  )
  assert.equal(shouldRelayServerLine('   - Local:        http://localhost:3000\n'), true)

  const summary = formatPreviewSummary('http://localhost:3000', {
    name: 'Wi-Fi',
    url: 'http://192.168.1.25:3000',
  })
  const lines = summary.split('\n')
  assert.equal(lines[1], '  Local URL:   http://localhost:3000')
  assert.equal(lines[2], '  Network URL: http://192.168.1.25:3000')
  assert.doesNotMatch(summary, /192\.168\.1\.25:3000 \(/)
})

test('LAN candidates are probed concurrently and the ranked successful host is returned', async () => {
  const candidates = [
    { address: '192.168.1.25', name: 'WiFi', score: 300 },
    { address: '10.0.0.5', name: 'Ethernet', score: 300 },
    { address: '192.168.1.99', name: 'Secondary', score: 100 },
  ]
  let activeChecks = 0
  let maximumConcurrentChecks = 0

  const result = await verifyNetworkUrl('http://localhost:3001', candidates, {
    responder: async (url) => {
      activeChecks++
      maximumConcurrentChecks = Math.max(maximumConcurrentChecks, activeChecks)
      await new Promise((resolve) => setTimeout(resolve, 15))
      activeChecks--
      return url.includes('10.0.0.5')
    },
    retryDelayMs: 1,
    timeoutMs: 100,
  })

  assert.equal(maximumConcurrentChecks, candidates.length)
  assert.deepEqual(result, {
    ...candidates[1],
    url: 'http://10.0.0.5:3001',
  })
})

test('shutdown exit-code mapping preserves explicit and conventional signal codes', () => {
  assert.equal(resolveChildExitCode(1, 0, null), 1)
  assert.equal(resolveChildExitCode(undefined, 0, null), 0)
  assert.equal(resolveChildExitCode(undefined, null, 'SIGINT'), 130)
  assert.equal(resolveChildExitCode(undefined, null, 'SIGTERM'), 143)
  assert.equal(resolveChildExitCode(undefined, null, 'SIGHUP'), 129)
  assert.equal(resolveChildExitCode(undefined, null, 'SIGKILL'), 1)
})

test('wrapper startup errors exit non-zero without launching Next.js', async () => {
  const child = spawn(
    process.execPath,
    ['--import', 'tsx', 'scripts/dev-mobile.ts', '--mobile-host'],
    {
      cwd: new URL('../', import.meta.url),
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    },
  )
  let errorOutput = ''
  child.stderr.on('data', (chunk) => {
    errorOutput += chunk
  })

  const [exitCode] = await once(child, 'exit')
  assert.equal(exitCode, 1)
  assert.match(errorOutput, /--mobile-host requires an IPv4 address or hostname/)
})
