import { connect, createServer } from 'node:net'

const DEFAULT_PREFERRED_PORT = 3000
const DEFAULT_SCAN_ATTEMPTS = 100
const MAX_PORT = 65535
const PROBE_TIMEOUT_MS = 400

interface FreePortOptions {
  attempts?: number
}

function isListening(port: number, host: string) {
  return new Promise<boolean>((resolve) => {
    const socket = connect({ port, host })
    const settle = (inUse: boolean) => {
      socket.destroy()
      resolve(inUse)
    }
    socket.setTimeout(PROBE_TIMEOUT_MS)
    socket.once('connect', () => settle(true))
    socket.once('timeout', () => settle(false))
    socket.once('error', () => settle(false))
  })
}

async function isPortInUse(port: number) {
  const [ipv4, ipv6] = await Promise.all([isListening(port, '127.0.0.1'), isListening(port, '::1')])
  return ipv4 || ipv6
}

function osAssignedPort() {
  return new Promise<number>((resolve, reject) => {
    const server = createServer()
    server.once('error', reject)
    server.listen(0, () => {
      const address = server.address()
      const port = typeof address === 'object' && address ? address.port : 0
      server.close(() => (port ? resolve(port) : reject(new Error('No free port was available.'))))
    })
  })
}

export async function findFreePort(
  preferred: number = DEFAULT_PREFERRED_PORT,
  { attempts = DEFAULT_SCAN_ATTEMPTS }: FreePortOptions = {},
) {
  const start =
    Number.isSafeInteger(preferred) && preferred > 0 ? preferred : DEFAULT_PREFERRED_PORT

  for (let port = start; port < start + attempts && port <= MAX_PORT; port++) {
    if (!(await isPortInUse(port))) return port
  }

  return osAssignedPort()
}

export function hasExplicitPort(args: string[]) {
  return args.some(
    (arg) => arg === '--port' || arg === '-p' || arg.startsWith('--port=') || arg.startsWith('-p='),
  )
}
