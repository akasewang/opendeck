import { type ChildProcess, spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { findFreePort, hasExplicitPort } from './free-port'

const PREFERRED_PORT = 3000
const DEV_HOST = 'localhost'

const require = createRequire(import.meta.url)
const nextBin = require.resolve('next/dist/bin/next')

function forwardSignals(child: ChildProcess) {
  const relay = (signal: NodeJS.Signals) => {
    if (child.exitCode === null && child.signalCode === null) child.kill(signal)
  }
  process.once('SIGINT', () => relay('SIGINT'))
  process.once('SIGTERM', () => relay('SIGTERM'))
  process.once('SIGHUP', () => relay('SIGHUP'))
}

export async function main() {
  const forwardedArgs = process.argv.slice(2)
  const nextArgs = ['dev', '--hostname', DEV_HOST, ...forwardedArgs]

  if (!hasExplicitPort(forwardedArgs)) {
    const port = await findFreePort(PREFERRED_PORT)
    nextArgs.push('--port', String(port))
    if (port !== PREFERRED_PORT) {
      console.log(
        `\n  Port ${PREFERRED_PORT} is busy. Serving OpenDeck on http://${DEV_HOST}:${port}\n`,
      )
    }
  }

  const child = spawn(process.execPath, [nextBin, ...nextArgs], {
    stdio: 'inherit',
    windowsHide: true,
  })

  forwardSignals(child)

  child.once('exit', (code, signal) => {
    process.exitCode = code ?? (signal ? 1 : 0)
  })
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
