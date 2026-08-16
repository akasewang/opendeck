import type { userCollections } from '@/db/schema'

export function mapCollectionSummary(row: typeof userCollections.$inferSelect, itemCount = 0) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    visibility: row.visibility,
    itemCount,
    shareSlug: row.shareSlug,
    templateKey: row.templateKey,
    publishedAt: row.publishedAt?.toISOString() ?? null,
  }
}
