import { and, desc, eq, isNotNull } from 'drizzle-orm'
import { db } from '@/db/client'
import { repos, userCollectionItems, userCollections } from '@/db/schema'
import { toGithubRepository } from '@/features/repositories/services/repository-query-service'

function mapCollection(row: typeof userCollections.$inferSelect, itemCount = 0) {
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

export async function getPublicCollection(slug: string) {
  const [collection] = await db
    .select()
    .from(userCollections)
    .where(
      and(
        eq(userCollections.shareSlug, slug),
        eq(userCollections.visibility, 'shared'),
        isNotNull(userCollections.publishedAt),
      ),
    )
    .limit(1)
  if (!collection) return null

  const items = await db
    .select({ repo: repos })
    .from(userCollectionItems)
    .innerJoin(repos, eq(userCollectionItems.repoId, repos.id))
    .where(eq(userCollectionItems.collectionId, collection.id))
    .orderBy(desc(userCollectionItems.addedAt))

  return {
    collection: mapCollection(collection, items.length),
    items: items.map((item) => toGithubRepository(item.repo)),
  }
}
