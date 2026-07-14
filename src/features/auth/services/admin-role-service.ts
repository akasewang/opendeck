import { and, eq, exists, ne, or, sql } from 'drizzle-orm'
import { db } from '@/db/client'
import { authSessions, authUsers } from '@/db/schema'
import type { AuthRole, AuthStatus } from '@/features/auth/types/authentication'

function lockActiveAdmins() {
  return db
    .select({ id: authUsers.id })
    .from(authUsers)
    .where(and(eq(authUsers.role, 'admin'), eq(authUsers.status, 'active')))
    .for('update')
}

function anotherActiveAdminExists() {
  return sql`(
    select count(*)
    from ${authUsers}
    where ${authUsers.role} = 'admin' and ${authUsers.status} = 'active'
  ) > 1`
}

function revokeSessionsAfterSuspension(userId: string) {
  return db
    .update(authSessions)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(authSessions.userId, userId),
        exists(
          db
            .select({ id: authUsers.id })
            .from(authUsers)
            .where(and(eq(authUsers.id, userId), eq(authUsers.status, 'suspended'))),
        ),
      ),
    )
}

export async function updateUserAccessPreservingActiveAdmin(
  userId: string,
  role: AuthRole,
  status: AuthStatus,
) {
  const removesActiveAdmin = role !== 'admin' || status !== 'active'
  const update = db
    .update(authUsers)
    .set({ role, status, updatedAt: new Date() })
    .where(
      removesActiveAdmin
        ? and(
            eq(authUsers.id, userId),
            or(
              ne(authUsers.role, 'admin'),
              ne(authUsers.status, 'active'),
              anotherActiveAdminExists(),
            ),
          )
        : eq(authUsers.id, userId),
    )
    .returning()

  let updated: typeof authUsers.$inferSelect | undefined
  if (status === 'suspended') {
    const [, updatedRows] = await db.batch([
      lockActiveAdmins(),
      update,
      revokeSessionsAfterSuspension(userId),
    ])
    updated = updatedRows[0]
  } else {
    const [, updatedRows] = await db.batch([lockActiveAdmins(), update])
    updated = updatedRows[0]
  }

  if (updated) return updated

  const [target] = await db
    .select({ role: authUsers.role, status: authUsers.status })
    .from(authUsers)
    .where(eq(authUsers.id, userId))
    .limit(1)
  if (target && removesActiveAdmin) throw new Error('At least one active admin must remain.')
  return updated ?? null
}

export async function deleteUserPreservingActiveAdmin(userId: string) {
  const deletion = db
    .delete(authUsers)
    .where(
      and(
        eq(authUsers.id, userId),
        or(ne(authUsers.role, 'admin'), ne(authUsers.status, 'active'), anotherActiveAdminExists()),
      ),
    )
    .returning({ id: authUsers.id })

  const [, deletedRows] = await db.batch([lockActiveAdmins(), deletion])
  if (deletedRows.length > 0) return true

  const [target] = await db
    .select({ id: authUsers.id })
    .from(authUsers)
    .where(eq(authUsers.id, userId))
    .limit(1)
  if (target) throw new Error('At least one active admin must remain.')
  return false
}
