import { timingSafeEqual } from 'node:crypto'
import type { NextRequest } from 'next/server'
import { serverEnv } from '@/lib/server-env'

function secureEqual(a: string, b: string) {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  return left.length === right.length && timingSafeEqual(left, right)
}

export function isCronAuthorized(req: NextRequest) {
  const secret = serverEnv.cronSecret
  if (!secret && serverEnv.nodeEnv !== 'production') return true

  const auth = req.headers.get('authorization')
  const provided = auth?.startsWith('Bearer ')
    ? auth.slice('Bearer '.length)
    : serverEnv.nodeEnv === 'production'
      ? null
      : req.nextUrl.searchParams.get('secret')

  return Boolean(secret && provided && secureEqual(provided, secret))
}
