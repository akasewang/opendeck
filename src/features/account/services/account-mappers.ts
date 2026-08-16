import type {
  authSessions,
  userAlerts,
  userCollections,
  userFollows,
  userRepoStates,
} from '@/db/schema'

export function mapSession(row: typeof authSessions.$inferSelect, currentTokenHash?: string) {
  return {
    id: row.id,
    userAgent: row.userAgent,
    ipAddress: row.ipAddress,
    createdAt: row.createdAt.toISOString(),
    lastSeenAt: row.lastSeenAt.toISOString(),
    expiresAt: row.expiresAt.toISOString(),
    revokedAt: row.revokedAt?.toISOString() ?? null,
    current: currentTokenHash ? row.tokenHash === currentTokenHash : false,
  }
}

export function mapRepoState(state?: typeof userRepoStates.$inferSelect | null) {
  return state
    ? {
        savedAt: state.savedAt?.toISOString() ?? null,
        hiddenAt: state.hiddenAt?.toISOString() ?? null,
        dismissedAt: state.dismissedAt?.toISOString() ?? null,
        reviewedAt: state.reviewedAt?.toISOString() ?? null,
        pipelineStage: state.pipelineStage,
        note: state.note,
        alertEnabled: state.alertEnabled,
        updatedAt: state.updatedAt.toISOString(),
      }
    : {
        savedAt: null,
        hiddenAt: null,
        dismissedAt: null,
        reviewedAt: null,
        pipelineStage: 'interested',
        note: null,
        alertEnabled: true,
        updatedAt: null,
      }
}

export function mapCollection(row: typeof userCollections.$inferSelect, itemCount = 0) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    visibility: row.visibility,
    shareSlug: row.shareSlug,
    templateKey: row.templateKey,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    itemCount,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

export function mapFollow(row: typeof userFollows.$inferSelect) {
  return {
    id: row.id,
    targetType: row.targetType,
    targetKey: row.targetKey,
    alertEnabled: row.alertEnabled,
    createdAt: row.createdAt.toISOString(),
  }
}

export function mapAlert(row: typeof userAlerts.$inferSelect) {
  return {
    id: row.id,
    type: row.type,
    message: row.message,
    readAt: row.readAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    metadata: row.metadata,
  }
}
