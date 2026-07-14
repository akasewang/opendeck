import { and, eq, exists, ne, or, sql } from 'drizzle-orm'
import { db } from '@/db/client'
import { adminAuditLogs, authSessions, authUsers } from '@/db/schema'
import type { AuthRole, AuthStatus } from '@/features/auth/types/authentication'

type AdminAuditEvent = {
  adminId: string
  action: 'delete_user' | 'update_user'
  metadata?: Record<string, unknown>
}

type UpdatedUser = Pick<typeof authUsers.$inferSelect, 'id' | 'name' | 'email' | 'role' | 'status'>

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
  audit?: AdminAuditEvent,
) {
  const removesActiveAdmin = role !== 'admin' || status !== 'active'
  if (audit) {
    const now = new Date()
    const result = await db.execute<UpdatedUser>(sql`
      with locked_admins as (
        select ${authUsers.id}
        from ${authUsers}
        where ${authUsers.role} = 'admin'
          and ${authUsers.status} = 'active'
        for update
      ),
      updated_user as (
        update ${authUsers}
        set role = ${role},
            status = ${status},
            updated_at = ${now}
        where ${authUsers.id} = ${userId}
          and (
            ${removesActiveAdmin} = false
            or ${authUsers.role} <> 'admin'
            or ${authUsers.status} <> 'active'
            or (select count(*) from locked_admins) > 1
          )
        returning
          ${authUsers.id} as id,
          ${authUsers.name} as name,
          ${authUsers.email} as email,
          ${authUsers.role} as role,
          ${authUsers.status} as status
      ),
      revoked_sessions as (
        update ${authSessions}
        set revoked_at = ${now}
        where ${authSessions.userId} in (
          select id from updated_user where status = 'suspended'
        )
      ),
      audit_record as (
        insert into ${adminAuditLogs} (admin_id, action, target_type, target_id, metadata)
        select
          ${audit.adminId}::uuid,
          ${audit.action},
          'user',
          id::text,
          ${JSON.stringify(audit.metadata ?? {})}::jsonb
        from updated_user
        returning ${adminAuditLogs.id}
      )
      select updated_user.*
      from updated_user
      cross join audit_record
    `)
    const updated = result.rows[0]
    if (updated) return updated

    const [target] = await db
      .select({ role: authUsers.role, status: authUsers.status })
      .from(authUsers)
      .where(eq(authUsers.id, userId))
      .limit(1)
    if (target && removesActiveAdmin) throw new Error('At least one active admin must remain.')
    return null
  }

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

export async function deleteUserPreservingActiveAdmin(userId: string, audit?: AdminAuditEvent) {
  if (audit) {
    const result = await db.execute<{ id: string }>(sql`
      with locked_admins as (
        select ${authUsers.id}
        from ${authUsers}
        where ${authUsers.role} = 'admin'
          and ${authUsers.status} = 'active'
        for update
      ),
      deleted_user as (
        delete from ${authUsers}
        where ${authUsers.id} = ${userId}
          and (
            ${authUsers.role} <> 'admin'
            or ${authUsers.status} <> 'active'
            or (select count(*) from locked_admins) > 1
          )
        returning ${authUsers.id} as id
      ),
      audit_record as (
        insert into ${adminAuditLogs} (admin_id, action, target_type, target_id, metadata)
        select
          ${audit.adminId}::uuid,
          ${audit.action},
          'user',
          id::text,
          ${JSON.stringify(audit.metadata ?? {})}::jsonb
        from deleted_user
        returning ${adminAuditLogs.id}
      )
      select deleted_user.id
      from deleted_user
      cross join audit_record
    `)
    if (result.rows.length > 0) return true

    const [target] = await db
      .select({ id: authUsers.id })
      .from(authUsers)
      .where(eq(authUsers.id, userId))
      .limit(1)
    if (target) throw new Error('At least one active admin must remain.')
    return false
  }

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
