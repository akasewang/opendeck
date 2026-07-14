import { desc, eq, sql } from 'drizzle-orm'
import { db } from '@/db/client'
import {
  adminAuditLogs,
  authUsers,
  emailDeliveries,
  ingestRuns,
  repos,
  userCollections,
  userSavedSearches,
} from '@/db/schema'

export async function listAdminIngestionDashboard() {
  const [
    repoCount,
    userCount,
    savedSearchCount,
    sharedCollectionCount,
    emailStats,
    latestRuns,
    auditLogs,
  ] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(repos),
    db.select({ count: sql<number>`count(*)::int` }).from(authUsers),
    db.select({ count: sql<number>`count(*)::int` }).from(userSavedSearches),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(userCollections)
      .where(eq(userCollections.visibility, 'shared')),
    db
      .select({ status: emailDeliveries.status, count: sql<number>`count(*)::int` })
      .from(emailDeliveries)
      .groupBy(emailDeliveries.status),
    db.select().from(ingestRuns).orderBy(desc(ingestRuns.startedAt)).limit(12),
    db.select().from(adminAuditLogs).orderBy(desc(adminAuditLogs.createdAt)).limit(20),
  ])

  return {
    stats: {
      repos: repoCount[0]?.count ?? 0,
      users: userCount[0]?.count ?? 0,
      savedSearches: savedSearchCount[0]?.count ?? 0,
      sharedCollections: sharedCollectionCount[0]?.count ?? 0,
      emailDeliveries: Object.fromEntries(emailStats.map((row) => [row.status, row.count])),
    },
    latestRuns: latestRuns.map((run) => ({
      id: run.id,
      kind: run.kind,
      status: run.status,
      tokensUsed: run.tokensUsed,
      rateLimitRemaining: run.rateLimitRemaining,
      startedAt: run.startedAt.toISOString(),
      finishedAt: run.finishedAt?.toISOString() ?? null,
      error: run.error,
      metadata: run.metadata,
    })),
    auditLogs: auditLogs.map((log) => ({
      id: log.id,
      adminId: log.adminId,
      action: log.action,
      targetType: log.targetType,
      targetId: log.targetId,
      metadata: log.metadata,
      createdAt: log.createdAt.toISOString(),
    })),
  }
}
