import { type NextRequest, NextResponse } from 'next/server'
import { computeGoodFirstIssueAlerts } from '@/lib/account'
import {
  checkSavedSearchAlerts,
  createPipelineReminders,
  sendDueEmailDigests,
} from '@/lib/account-features'
import { isCronAuthorized } from '@/lib/cron-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function run(req: NextRequest) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const requestedLimit = Number.parseInt(req.nextUrl.searchParams.get('limit') ?? '', 10)
    const limit = Number.isFinite(requestedLimit)
      ? Math.min(Math.max(requestedLimit, 1), 5000)
      : 500
    const [goodFirstIssues, savedSearches, pipelineReminders, digests] = await Promise.all([
      computeGoodFirstIssueAlerts(limit),
      checkSavedSearchAlerts(Math.min(limit, 500)),
      createPipelineReminders(Math.min(limit, 500)),
      sendDueEmailDigests(Math.min(limit, 500)),
    ])

    return NextResponse.json({
      ok: true,
      result: { goodFirstIssues, savedSearches, pipelineReminders, digests },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to compute account alerts.'
    const databaseError =
      message.startsWith('Failed query') ||
      message.includes('does not exist') ||
      message.includes('violates')

    return NextResponse.json(
      {
        error: databaseError
          ? 'Account database tables are not available. Run migrations and try again.'
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
