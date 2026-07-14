import { type NextRequest, NextResponse } from 'next/server'
import {
  checkSavedSearchAlerts,
  computeGoodFirstIssueAlerts,
  createPipelineReminders,
  sendDueEmailDigests,
} from '@/features/account/services/account-automation-service'
import { isCronAuthorized } from '@/lib/security/cron-auth'
import { parseOptionalInteger } from '@/lib/api/query-parameters'
import { withJobLease } from '@/lib/jobs/job-lease-service'
import { cleanupExpiredRateLimits } from '@/lib/security/rate-limit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ACCOUNT_AUTOMATION_LEASE_MS = 10 * 60 * 1000

async function run(req: NextRequest) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const parsedLimit = parseOptionalInteger('limit', req.nextUrl.searchParams.get('limit'), {
      min: 1,
      max: 5000,
    })
    if (parsedLimit.error) {
      return NextResponse.json({ error: parsedLimit.error }, { status: 400 })
    }
    const limit = parsedLimit.value ?? 500
    const execution = await withJobLease('account-automation', ACCOUNT_AUTOMATION_LEASE_MS, () =>
      Promise.all([
        computeGoodFirstIssueAlerts(limit),
        checkSavedSearchAlerts(Math.min(limit, 500)),
        createPipelineReminders(Math.min(limit, 500)),
        sendDueEmailDigests(Math.min(limit, 500)),
      ]),
    )

    if (!execution.acquired) {
      return NextResponse.json({ ok: true, skipped: true, reason: execution.reason })
    }

    const [goodFirstIssues, savedSearches, pipelineReminders, digests] = execution.value
    try {
      await cleanupExpiredRateLimits(new Date(Date.now() - 24 * 60 * 60 * 1000))
    } catch (error) {
      console.error('Expired rate-limit buckets could not be cleaned up', error)
    }

    return NextResponse.json({
      ok: true,
      result: { goodFirstIssues, savedSearches, pipelineReminders, digests },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to compute account alerts.'
    const schemaMissing = message.includes('does not exist')
    const databaseError =
      schemaMissing || message.startsWith('Failed query') || message.includes('violates')
    console.error('Account alert cron failed', error)

    return NextResponse.json(
      {
        error: databaseError
          ? schemaMissing
            ? 'Account database tables are not available. Run migrations and try again.'
            : 'Unable to compute account alerts right now.'
          : message,
      },
      { status: 500 },
    )
  }
}

export async function GET(req: NextRequest) {
  return run(req)
}

export async function POST(req: NextRequest) {
  return run(req)
}
