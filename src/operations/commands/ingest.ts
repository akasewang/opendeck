import {
  DEFAULT_DISCOVERY_LIMIT_PER_SOURCE,
  ingestDiscoverySources,
  ingestStaleMetadata,
  ingestTrending,
} from '@/lib/ingest/repositories'

const ALLOWED_INGEST_KINDS = new Set(['trending', 'discovery', 'curated', 'metadata'])

function parseLimit(value: string | undefined, fallback: number) {
  if (!value) return fallback
  const limit = Number.parseInt(value, 10)
  return Number.isNaN(limit) ? fallback : limit
}

export async function runIngestCommand(args: string[]) {
  const kind = args[0] || 'trending'
  const limitArg = args[1]

  if (!ALLOWED_INGEST_KINDS.has(kind)) {
    throw new Error(`Invalid ingest kind: ${kind}`)
  }

  if (kind === 'discovery' || kind === 'curated') {
    const result = await ingestDiscoverySources(
      parseLimit(limitArg, DEFAULT_DISCOVERY_LIMIT_PER_SOURCE),
    )
    console.log(JSON.stringify({ kind: 'discovery', result }, null, 2))
    return
  }

  if (kind === 'metadata') {
    const result = await ingestStaleMetadata(parseLimit(limitArg, 50))
    console.log(JSON.stringify({ kind, result }, null, 2))
    return
  }

  const result = await ingestTrending(parseLimit(limitArg, 50))
  console.log(JSON.stringify({ kind: 'trending', result }, null, 2))
}
