import { type NextRequest, NextResponse } from 'next/server'
import {
  DEFAULT_DISCOVERY_LIMIT_PER_SOURCE,
  ingestDiscoverySources,
  ingestStaleMetadata,
  ingestTrending,
} from '@/features/ingestion/services/repository-ingestion-service'
import { REPOSITORY_INGEST_KINDS } from '@/features/repositories/constants/repository-options'
import { badRequest } from '@/features/repositories/services/repository-response'
import { invalidEnumMessage, parseEnum, parseOptionalInteger } from '@/lib/api/query-parameters'
import { isCronAuthorized } from '@/lib/security/cron-auth'
import { withJobLease } from '@/lib/jobs/job-lease-service'

const REPOSITORY_INGESTION_LEASE_MS = 20 * 60 * 1000

async function runWithIngestionLease(work: () => Promise<NextResponse>) {
  const execution = await withJobLease('repository-ingestion', REPOSITORY_INGESTION_LEASE_MS, work)
  return execution.acquired
    ? execution.value
    : NextResponse.json({ ok: true, skipped: true, reason: execution.reason })
}

async function runIngest(req: NextRequest) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const requestedKind = req.nextUrl.searchParams.get('kind')
  const parsedKind = parseEnum(requestedKind, REPOSITORY_INGEST_KINDS)
  const kind = parsedKind ?? 'trending'

  if (requestedKind && !parsedKind) {
    return badRequest(invalidEnumMessage('kind', requestedKind, REPOSITORY_INGEST_KINDS))
  }

  if (kind === 'discovery' || kind === 'curated') {
    const parsedLimit = parseOptionalInteger('limit', req.nextUrl.searchParams.get('limit'), {
      min: 1,
      max: DEFAULT_DISCOVERY_LIMIT_PER_SOURCE,
    })
    if (parsedLimit.error) return badRequest(parsedLimit.error)
    const limit = parsedLimit.value ?? DEFAULT_DISCOVERY_LIMIT_PER_SOURCE
    return runWithIngestionLease(async () => {
      const result = await ingestDiscoverySources(limit)
      return NextResponse.json({ ok: true, kind: 'discovery', result })
    })
  }

  if (kind === 'metadata') {
    const parsedLimit = parseOptionalInteger('limit', req.nextUrl.searchParams.get('limit'), {
      min: 1,
      max: 500,
    })
    if (parsedLimit.error) return badRequest(parsedLimit.error)
    const limit = parsedLimit.value ?? 50
    return runWithIngestionLease(async () => {
      const result = await ingestStaleMetadata(limit)
      return NextResponse.json({ ok: true, kind, result })
    })
  }

  const parsedLimit = parseOptionalInteger('limit', req.nextUrl.searchParams.get('limit'), {
    min: 1,
    max: 500,
  })
  if (parsedLimit.error) return badRequest(parsedLimit.error)
  const limit = parsedLimit.value ?? 50
  return runWithIngestionLease(async () => {
    const result = await ingestTrending(limit)
    return NextResponse.json({ ok: true, kind: 'trending', result })
  })
}

export async function GET(req: NextRequest) {
  return handleIngest(req)
}

export async function POST(req: NextRequest) {
  return handleIngest(req)
}

async function handleIngest(req: NextRequest) {
  try {
    return await runIngest(req)
  } catch (error) {
    console.error('Repository ingestion failed', error)
    return NextResponse.json({ error: 'Repository ingestion failed.' }, { status: 500 })
  }
}
