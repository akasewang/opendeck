import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { ingestRuns } from '@/db/schema'

export async function startIngestRun(kind: 'trending' | 'metadata' | 'discovery') {
  const [run] = await db
    .insert(ingestRuns)
    .values({ kind, status: 'running' })
    .returning({ id: ingestRuns.id })

  return run.id
}

export async function finishIngestRun(
  id: string,
  status: 'success' | 'failed' | 'partial',
  metadata: Record<string, unknown> = {},
  error?: unknown,
) {
  const errorText =
    error instanceof Error ? error.message : typeof error === 'string' ? error : undefined

  await db
    .update(ingestRuns)
    .set({
      status,
      finishedAt: new Date(),
      tokensUsed: typeof metadata.tokensUsed === 'number' ? metadata.tokensUsed : undefined,
      rateLimitRemaining:
        typeof metadata.rateLimitRemaining === 'number' ? metadata.rateLimitRemaining : undefined,
      metadata,
      error: errorText,
    })
    .where(eq(ingestRuns.id, id))
}
