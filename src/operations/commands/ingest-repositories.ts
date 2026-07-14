import {
  DEFAULT_DISCOVERY_LIMIT_PER_SOURCE,
  ingestDiscoverySources,
  ingestStaleMetadata,
  ingestTrending,
} from '@/features/ingestion/services/repository-ingestion-service'
import { withJobLease } from '@/lib/jobs/job-lease-service'

const ALLOWED_INGEST_KINDS = new Set(['trending', 'discovery', 'curated', 'metadata'])
const REPOSITORY_INGESTION_LEASE_MS = 20 * 60 * 1000

function parseLimit(value: string | undefined, fallback: number) {
  if (!value) return fallback
  if (!/^\d+$/.test(value)) throw new Error(`Invalid ingest limit: ${value}`)
  const limit = Number(value)
  if (!Number.isSafeInteger(limit) || limit < 1) throw new Error(`Invalid ingest limit: ${value}`)
  return limit
}

export async function runIngestCommand(args: string[]) {
  const kind = args[0] || 'trending'
  const limitArg = args[1]

  if (!ALLOWED_INGEST_KINDS.has(kind)) {
    throw new Error(`Invalid ingest kind: ${kind}`)
  }

  const execution = await withJobLease(
    'repository-ingestion',
    REPOSITORY_INGESTION_LEASE_MS,
    async () => {
      if (kind === 'discovery' || kind === 'curated') {
        const result = await ingestDiscoverySources(
          parseLimit(limitArg, DEFAULT_DISCOVERY_LIMIT_PER_SOURCE),
        )
        return { kind: 'discovery', result }
      }

      if (kind === 'metadata') {
        const result = await ingestStaleMetadata(parseLimit(limitArg, 50))
        return { kind, result }
      }

      const result = await ingestTrending(parseLimit(limitArg, 50))
      return { kind: 'trending', result }
    },
  )

  console.log(
    JSON.stringify(
      execution.acquired ? execution.value : { kind, skipped: true, reason: execution.reason },
      null,
      2,
    ),
  )
}
