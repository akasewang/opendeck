import { type ChildProcess, spawn } from 'node:child_process'
import http from 'node:http'
import https from 'node:https'
import { createRequire } from 'node:module'
import { isIP } from 'node:net'
import { networkInterfaces } from 'node:os'
import { resolve } from 'node:path'
import type { Readable, Writable } from 'node:stream'
import { pathToFileURL } from 'node:url'
import { stripVTControlCharacters } from 'node:util'
import QRCode from 'qrcode'
import { findFreePort, hasExplicitPort } from './free-port'

interface NetworkInterfaceDetails {
  address: string
  family: string | number
  internal: boolean
  mac?: string
}

type NetworkInterfaceCollection = Record<
  string,
  readonly NetworkInterfaceDetails[] | null | undefined
>

export interface LanCandidate {
  address: string
  name: string
  score: number
}

interface VerifiedLanCandidate extends LanCandidate {
  url: string
}

interface VerifyNetworkOptions {
  responder?: (url: string) => Promise<boolean>
  retryDelayMs?: number
  timeoutMs?: number
}

const LOCAL_URL_PATTERN = /(?:^|\n)\s*-\s*Local:\s*(https?:\/\/[^\s]+)/i
const NEXT_NETWORK_URL_PATTERN = /^\s*-\s*Network:\s*https?:\/\/(?:0\.0\.0\.0|\[?::\]?)(?::\d+)?/i
const VIRTUAL_INTERFACE_PATTERN =
  /docker|wsl|vpn|virtual|vbox|vmware|hyper-v|vethernet|^veth|^br-|bridge|(?:^|[\s_-])tun\d*|(?:^|[\s_-])tap\d*|tailscale|zerotier|hamachi|loopback|bluetooth|npcap/i
const PREFERRED_INTERFACE_PATTERN = /wi-?fi|wireless|wlan|ethernet|^eth|^en\d/i
const SERVER_ANNOUNCEMENT_TIMEOUT_MS = 60_000
const NETWORK_VERIFICATION_TIMEOUT_MS = 120_000
const REQUEST_TIMEOUT_MS = 15_000

const require = createRequire(import.meta.url)
const nextBin = require.resolve('next/dist/bin/next')

export function parseArguments(args: string[]) {
  const forwardedArgs = []
  let mobileHost: string | undefined

  for (let index = 0; index < args.length; index++) {
    const argument = args[index]

    if (argument === '--mobile-host') {
      const value = args[index + 1]
      if (!value || value.startsWith('-')) {
        throw new Error('--mobile-host requires an IPv4 address or hostname.')
      }
      mobileHost = value
      index++
      continue
    }

    if (argument.startsWith('--mobile-host=')) {
      const value = argument.slice('--mobile-host='.length)
      if (!value) throw new Error('--mobile-host requires an IPv4 address or hostname.')
      mobileHost = value
      continue
    }

    forwardedArgs.push(argument)
  }

  return { forwardedArgs, mobileHost }
}

function optionValue(args: string[], longName: string, shortName: string) {
  for (let index = 0; index < args.length; index++) {
    const argument = args[index]
    if (argument === longName || argument === shortName) return args[index + 1]
    if (argument.startsWith(`${longName}=`)) return argument.slice(longName.length + 1)
  }
}

function hasOption(args: string[], longName: string, shortName: string) {
  return args.some(
    (argument) =>
      argument === longName || argument === shortName || argument.startsWith(`${longName}=`),
  )
}

function isPrivateIpv4(address: string) {
  const octets = address.split('.').map(Number)
  return (
    octets[0] === 10 ||
    (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) ||
    (octets[0] === 192 && octets[1] === 168)
  )
}

function isUsableIpv4(address: string) {
  const octets = address.split('.').map(Number)
  return (
    isIP(address) === 4 &&
    octets[0] !== 0 &&
    octets[0] !== 127 &&
    !(octets[0] === 169 && octets[1] === 254) &&
    octets[0] < 224
  )
}

export function normalizeMobileHost(value: string | undefined, source: string) {
  const host = value?.trim()
  if (!host) return undefined

  if (host.includes('://') || /[/\\?#@\s:*]/.test(host) || host.length > 253 || isIP(host) === 6) {
    throw new Error(`${source} must be an IPv4 address or hostname without a protocol or port.`)
  }

  if (isIP(host) === 4) {
    if (!isUsableIpv4(host)) {
      throw new Error(`${source} cannot use a loopback, link-local, or multicast address.`)
    }
    return host
  }

  const labels = host.split('.')
  if (
    labels.some(
      (label) => !label || label.length > 63 || !/^[a-z\d](?:[a-z\d-]*[a-z\d])?$/i.test(label),
    )
  ) {
    throw new Error(`${source} is not a valid hostname.`)
  }

  return host.toLowerCase()
}

function interfaceScore(name: string, address: string) {
  let score = isPrivateIpv4(address) ? 100 : 0
  if (PREFERRED_INTERFACE_PATTERN.test(name)) score += 200
  return score
}

export function findLanCandidates(
  interfaces: NetworkInterfaceCollection = networkInterfaces(),
): LanCandidate[] {
  const candidates: LanCandidate[] = []

  for (const [name, addresses] of Object.entries(interfaces)) {
    if (VIRTUAL_INTERFACE_PATTERN.test(name)) continue

    for (const details of addresses ?? []) {
      const isIpv4 = details.family === 'IPv4' || details.family === 4
      const hasUsableMac = !details.mac || details.mac !== '00:00:00:00:00:00'
      if (!isIpv4 || details.internal || !hasUsableMac || !isUsableIpv4(details.address)) continue

      candidates.push({
        address: details.address,
        name,
        score: interfaceScore(name, details.address),
      })
    }
  }

  return candidates
    .sort((left, right) => right.score - left.score || left.name.localeCompare(right.name))
    .filter(
      (candidate, index, values) =>
        values.findIndex((value) => value.address === candidate.address) === index,
    )
}

function hasNetworkAccessibleHostname(args: string[], mobileHosts: string[]) {
  const hostname = optionValue(args, '--hostname', '-H')
  if (!hostname) return true

  return hostname === '0.0.0.0' || hostname === '::' || mobileHosts.includes(hostname.toLowerCase())
}

export function networkUrl(localUrl: string, host: string) {
  const url = new URL(localUrl)
  url.hostname = host
  return url.toString().replace(/\/$/, '')
}

function responds(url: string) {
  return new Promise<boolean>((resolve) => {
    const parsedUrl = new URL(url)
    const transport = parsedUrl.protocol === 'https:' ? https : http
    const request = transport.request(
      parsedUrl,
      {
        headers: {
          Accept: 'text/html',
          Origin: parsedUrl.origin,
          'User-Agent': 'OpenDeck mobile-preview verifier',
        },
        method: 'GET',
        rejectUnauthorized: false,
      },
      (response) => {
        response.resume()
        resolve(
          typeof response.statusCode === 'number' &&
            response.statusCode >= 200 &&
            response.statusCode < 400,
        )
      },
    )

    request.setTimeout(REQUEST_TIMEOUT_MS, () => request.destroy())
    request.on('error', () => resolve(false))
    request.end()
  })
}

export async function verifyNetworkUrl(
  localUrl: string,
  candidates: LanCandidate[],
  {
    responder = responds,
    timeoutMs = NETWORK_VERIFICATION_TIMEOUT_MS,
    retryDelayMs = 500,
  }: VerifyNetworkOptions = {},
): Promise<VerifiedLanCandidate> {
  const deadline = Date.now() + timeoutMs

  while (Date.now() < deadline) {
    const checks = candidates.map(async (candidate) => {
      const candidateUrl = networkUrl(localUrl, candidate.address)
      try {
        return (await responder(candidateUrl)) ? { ...candidate, url: candidateUrl } : undefined
      } catch {
        return undefined
      }
    })
    const verified = (await Promise.all(checks)).find(Boolean)
    if (verified) return verified

    const remainingMs = deadline - Date.now()
    if (remainingMs > 0) {
      await new Promise((resolveDelay) =>
        setTimeout(resolveDelay, Math.min(retryDelayMs, remainingMs)),
      )
    }
  }

  throw new Error(
    `The development server started, but none of these LAN hosts responded: ${candidates
      .map((candidate) => candidate.address)
      .join(', ')}`,
  )
}

export function extractLocalUrl(output: string) {
  return stripVTControlCharacters(output).match(LOCAL_URL_PATTERN)?.[1]
}

export function shouldRelayServerLine(line: string) {
  return !NEXT_NETWORK_URL_PATTERN.test(stripVTControlCharacters(line))
}

export function formatPreviewSummary(
  localUrl: string,
  verified: Pick<VerifiedLanCandidate, 'name' | 'url'>,
) {
  return [
    '  Mobile preview ready',
    `  Local URL:   ${localUrl}`,
    `  Network URL: ${verified.url}`,
    `  Interface:   ${verified.name}`,
  ].join('\n')
}

function relayAndParse(stream: Readable, target: Writable, onLocalUrl: (url: string) => void) {
  let output = ''
  let pending = ''

  stream.on('data', (chunk) => {
    const text = chunk.toString()
    output = `${output}${text}`.slice(-8_192)
    const localUrl = extractLocalUrl(output)
    if (localUrl) onLocalUrl(localUrl)

    pending += text
    let newlineIndex = pending.indexOf('\n')
    while (newlineIndex >= 0) {
      const line = pending.slice(0, newlineIndex + 1)
      pending = pending.slice(newlineIndex + 1)
      if (shouldRelayServerLine(line)) target.write(line)
      newlineIndex = pending.indexOf('\n')
    }
  })

  stream.on('end', () => {
    if (pending && shouldRelayServerLine(pending)) target.write(pending)
  })
}

function waitForLocalUrl(child: ChildProcess) {
  if (!child.stdout || !child.stderr) {
    return Promise.reject(new Error('Next.js output streams are unavailable.'))
  }

  const { stderr, stdout } = child
  return new Promise<string>((resolve, reject) => {
    let settled = false
    const timeout = setTimeout(() => {
      if (settled) return
      settled = true
      reject(new Error('Next.js did not announce its local URL within 60 seconds.'))
    }, SERVER_ANNOUNCEMENT_TIMEOUT_MS)

    const accept = (url: string) => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      resolve(url)
    }

    relayAndParse(stdout, process.stdout, accept)
    relayAndParse(stderr, process.stderr, accept)

    child.once('error', (error) => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      reject(error)
    })

    child.once('exit', (code, signal) => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      reject(
        new Error(
          `Next.js exited before announcing its URL (${signal ? `signal ${signal}` : `code ${code ?? 1}`}).`,
        ),
      )
    })
  })
}

function forceKillProcessTree(child: ChildProcess) {
  const childPid = child.pid
  if (!childPid) return

  if (process.platform === 'win32') {
    spawn('taskkill', ['/pid', childPid.toString(), '/T', '/F'], {
      stdio: 'ignore',
      windowsHide: true,
    })
    return
  }

  if (child.exitCode !== null || child.signalCode !== null) return

  try {
    process.kill(-childPid, 'SIGKILL')
  } catch {
    child.kill('SIGKILL')
  }
}

export function resolveChildExitCode(
  requestedExitCode: number | undefined,
  code: number | null,
  signal: NodeJS.Signals | null,
) {
  return (
    requestedExitCode ??
    code ??
    (signal === 'SIGINT' ? 130 : signal === 'SIGTERM' ? 143 : signal === 'SIGHUP' ? 129 : 1)
  )
}

export async function main() {
  const { forwardedArgs, mobileHost: argumentHost } = parseArguments(process.argv.slice(2))
  const overrideHost = normalizeMobileHost(
    argumentHost ?? process.env.DEV_MOBILE_HOST,
    argumentHost ? '--mobile-host' : 'DEV_MOBILE_HOST',
  )
  const detectedCandidates = findLanCandidates()
  const candidates = overrideHost
    ? [{ address: overrideHost, name: 'manual override', score: Number.MAX_SAFE_INTEGER }]
    : detectedCandidates

  const mobilePreviewEnabled = candidates.length > 0
  const mobileHosts = candidates.map((candidate) => candidate.address)
  const hasHostnameOption = hasOption(forwardedArgs, '--hostname', '-H')
  if (hasHostnameOption && !optionValue(forwardedArgs, '--hostname', '-H')) {
    throw new Error('Next.js --hostname requires a value.')
  }
  if (mobilePreviewEnabled && !hasNetworkAccessibleHostname(forwardedArgs, mobileHosts)) {
    throw new Error(
      'The supplied Next.js --hostname is not reachable from the LAN. Remove it or use 0.0.0.0.',
    )
  }

  const bindHost = mobilePreviewEnabled ? '0.0.0.0' : 'localhost'
  const nextArgs = ['dev', ...forwardedArgs]
  if (!hasHostnameOption) nextArgs.push('--hostname', bindHost)
  if (!hasExplicitPort(forwardedArgs)) {
    const port = await findFreePort(3000)
    nextArgs.push('--port', String(port))
  }

  console.log('\n  OpenDeck development preview')
  if (mobilePreviewEnabled) {
    console.log(
      overrideHost
        ? `  Mobile host override: ${overrideHost}`
        : `  Preferred LAN interface: ${candidates[0].name} (${candidates[0].address})`,
    )
  } else {
    console.log('  No LAN interface detected. Serving locally without a mobile preview.')
  }

  const child = spawn(process.execPath, [nextBin, ...nextArgs], {
    detached: process.platform !== 'win32',
    env: {
      ...process.env,
      ...(mobilePreviewEnabled
        ? {
            DEV_MOBILE_ALLOWED_HOSTS: mobileHosts.join(','),
            DEV_MOBILE_HOST: candidates[0].address,
          }
        : {}),
    },
    stdio: ['inherit', 'pipe', 'pipe'],
    windowsHide: true,
  })

  let shuttingDown = false
  let requestedExitCode: number | undefined

  const shutdown = (signal: NodeJS.Signals, exitCode: number) => {
    if (shuttingDown) return
    shuttingDown = true
    requestedExitCode = exitCode
    process.exitCode = exitCode

    if (child.exitCode === null && child.signalCode === null) {
      if (process.platform === 'win32') {
        forceKillProcessTree(child)
        return
      }

      const childPid = child.pid
      try {
        if (!childPid) throw new Error('Next.js process ID is unavailable.')
        process.kill(-childPid, signal)
      } catch {
        child.kill(signal)
      }

      const forceTimer = setTimeout(() => forceKillProcessTree(child), 4_000)
      forceTimer.unref()
    }
  }

  process.once('SIGINT', () => shutdown('SIGINT', 130))
  process.once('SIGTERM', () => shutdown('SIGTERM', 143))
  process.once('SIGHUP', () => shutdown('SIGHUP', 129))

  child.once('exit', (code, signal) => {
    process.exitCode = resolveChildExitCode(requestedExitCode, code, signal)
  })

  let localUrl: string
  try {
    localUrl = await waitForLocalUrl(child)
  } catch (error) {
    console.error(
      `\n  Development server failed to start: ${error instanceof Error ? error.message : error}\n`,
    )
    shutdown('SIGTERM', 1)
    return
  }

  console.log(`\n  Next.js is serving ${localUrl}`)

  if (!mobilePreviewEnabled) return

  try {
    console.log('  Verifying mobile LAN access...')
    const verified = await verifyNetworkUrl(localUrl, candidates)
    const qrCode = await QRCode.toString(verified.url, {
      errorCorrectionLevel: 'M',
      margin: 1,
      small: true,
      type: 'terminal',
    })

    console.log(`\n${formatPreviewSummary(localUrl, verified)}\n`)
    console.log(qrCode)
    console.log('  Keep this computer and your phone on the same Wi-Fi network.\n')
  } catch (error) {
    console.warn(
      `\n  Mobile preview unavailable: ${error instanceof Error ? error.message : error}\n  The dev server is still running at ${localUrl}.\n`,
    )
  }
}

const isMainModule =
  Boolean(process.argv[1]) && import.meta.url === pathToFileURL(resolve(process.argv[1])).href

if (isMainModule) {
  main().catch((error) => {
    console.error(
      `\n  Unable to start development server: ${error instanceof Error ? error.message : error}\n`,
    )
    process.exitCode = 1
  })
}
