import { db } from '@/db/client'
import { userCollections, userPreferences } from '@/db/schema'

export async function ensureAccountDefaults(userId: string) {
  await db.batch([
    db.insert(userPreferences).values({ userId }).onConflictDoNothing(),
    db
      .insert(userCollections)
      .values({ userId, name: 'Saved repos', description: 'Repositories worth revisiting.' })
      .onConflictDoNothing(),
    db
      .insert(userCollections)
      .values({
        userId,
        name: 'Contribution pipeline',
        description: 'Repos you are actively evaluating or contributing to.',
      })
      .onConflictDoNothing(),
  ])
}
