import { type NextRequest, NextResponse } from 'next/server'
import { INGEST_KINDS } from '@/features/repositories/constants'
import { invalidEnumMessage, parseBoundedNumber, parseEnum } from '@/lib/api/query'
import { badRequest } from '@/lib/api/repository-responses'
import { isCronAuthorized } from '@/lib/cron-auth'
import {
  DEFAULT_DISCOVERY_LIMIT_PER_SOURCE,
  ingestDiscoverySources,
  ingestStaleMetadata,
  ingestTrending,
} from '@/lib/ingest/repositories'

async function runIngest(req: NextRequest) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const requestedKind = req.nextUrl.searchParams.get('kind')
  const parsedKind = parseEnum(requestedKind, INGEST_KINDS)
  const kind = parsedKind ?? 'trending'

  if (requestedKind && !parsedKind) {
    return badRequest(invalidEnumMessage('kind', requestedKind, INGEST_KINDS))
  }

  if (kind === 'discovery' || kind === 'curated') {
    const limit = parseBoundedNumber(req.nextUrl.searchParams.get('limit'), {
      min: 1,
      max: DEFAULT_DISCOVERY_LIMIT_PER_SOURCE,
      fallback: DEFAULT_DISCOVERY_LIMIT_PER_SOURCE,
    })
    const result = await ingestDiscoverySources(limit)
    return NextResponse.json({ ok: true, kind: 'discovery', result })
  }

  if (kind === 'metadata') {
    const limit = parseBoundedNumber(req.nextUrl.searchParams.get('limit'), {
      min: 1,
      max: 500,
      fallback: 50,
    })
    const result = await ingestStaleMetadata(limit)
    return NextResponse.json({ ok: true, kind, result })
  }

  const limit = parseBoundedNumber(req.nextUrl.searchParams.get('limit'), {
    min: 1,
    max: 500,
    fallback: 50,
  })
  const result = await ingestTrending(limit)
  return NextResponse.json({ ok: true, kind: 'trending', result })
}

export async function GET(req: NextRequest) {
  return runIngest(req)
}

export async function POST(req: NextRequest) {
  return runIngest(req)
}
