import { and, desc, eq, gt, isNull, sql } from 'drizzle-orm'
import { db } from '@/db/client'
import { authEmailAllowlist, authInvites, authSessions, authUsers } from '@/db/schema'
import {
  deleteUserPreservingActiveAdmin,
  updateUserAccessPreservingActiveAdmin,
} from '@/features/auth/services/admin-role-service'
import {
  createOpaqueToken,
  hashOpaqueToken,
  isValidEmail,
  normalizeEmail,
  toPublicUser,
} from '@/features/auth/services/authentication-service'
import type { AuthRole } from '@/features/auth/types/authentication'
import {
  cleanOptionalText,
  cleanText,
  cleanUuid,
  parseIntegerValue,
} from '@/lib/api/input-normalization'

function normalizeRole(value: unknown): AuthRole {
  return value === 'admin' ? 'admin' : 'user'
}

export async function listAdminUsers() {
  const rows = await db
    .select({
      user: authUsers,
      sessionCount: sql<number>`count(${authSessions.id})::int`,
    })
    .from(authUsers)
    .leftJoin(
      authSessions,
      and(
        eq(authSessions.userId, authUsers.id),
        gt(authSessions.expiresAt, new Date()),
        isNull(authSessions.revokedAt),
      ),
    )
    .groupBy(authUsers.id)
    .orderBy(desc(authUsers.createdAt))

  return rows.map((row) => ({
    ...toPublicUser(row.user),
    createdAt: row.user.createdAt.toISOString(),
    lastLoginAt: row.user.lastLoginAt?.toISOString() ?? null,
    sessionCount: row.sessionCount,
  }))
}

export async function updateAdminUser(adminId: string, body: Record<string, unknown>) {
  const userId = cleanUuid(body.userId)
  if (body.role !== 'user' && body.role !== 'admin') throw new Error('Invalid user role.')
  if (body.status !== 'active' && body.status !== 'suspended') {
    throw new Error('Invalid user status.')
  }
  const role = normalizeRole(body.role)
  const status = body.status === 'suspended' ? 'suspended' : 'active'
  if (!userId) throw new Error('Missing user.')
  if (userId === adminId && status === 'suspended') {
    throw new Error('You cannot suspend your own account.')
  }

  const updated = await updateUserAccessPreservingActiveAdmin(userId, role, status)

  if (!updated) throw new Error('User not found.')
  return toPublicUser(updated)
}

export async function deleteUserAsAdmin(adminId: string, body: Record<string, unknown>) {
  const userId = cleanUuid(body.userId)
  if (!userId) throw new Error('Missing user.')
  if (userId === adminId) throw new Error('You cannot delete your own account here.')

  if (!(await deleteUserPreservingActiveAdmin(userId))) throw new Error('User not found.')
  return { ok: true, id: userId }
}

export async function createInvite(adminId: string, body: Record<string, unknown>) {
  const email = cleanOptionalText(normalizeEmail(body.email), 254)
  if (email && !isValidEmail(email)) {
    throw new Error('Enter a valid invite email, or leave it blank.')
  }
  if (body.role !== undefined && body.role !== 'user' && body.role !== 'admin') {
    throw new Error('Invalid invite role.')
  }
  const token = createOpaqueToken()
  const parsedDays = body.days === undefined ? 14 : parseIntegerValue(body.days)
  if (parsedDays === undefined || parsedDays < 1 || parsedDays > 365) {
    throw new Error('Invite duration must be between 1 and 365 days.')
  }
  const days = parsedDays
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000)
  const [invite] = await db
    .insert(authInvites)
    .values({
      email,
      tokenHash: hashOpaqueToken(token),
      role: normalizeRole(body.role),
      invitedBy: adminId,
      expiresAt,
    })
    .returning()

  return {
    id: invite.id,
    email: invite.email,
    role: invite.role,
    expiresAt: invite.expiresAt.toISOString(),
    token,
  }
}

export async function listAdminSecurity() {
  const [invites, allowlist] = await Promise.all([
    db.select().from(authInvites).orderBy(desc(authInvites.createdAt)).limit(50),
    db.select().from(authEmailAllowlist).orderBy(desc(authEmailAllowlist.createdAt)),
  ])

  return {
    invites: invites.map((invite) => ({
      id: invite.id,
      email: invite.email,
      role: invite.role,
      expiresAt: invite.expiresAt.toISOString(),
      acceptedAt: invite.acceptedAt?.toISOString() ?? null,
      createdAt: invite.createdAt.toISOString(),
    })),
    allowlist: allowlist.map((row) => ({
      id: row.id,
      pattern: row.pattern,
      kind: row.kind,
      note: row.note,
      createdAt: row.createdAt.toISOString(),
    })),
  }
}

export async function saveAllowlistRule(adminId: string, body: Record<string, unknown>) {
  const pattern = cleanText(body.pattern, 254).toLowerCase().replace(/^@/, '')
  if (body.kind !== 'email' && body.kind !== 'domain') throw new Error('Invalid allowlist kind.')
  const kind = body.kind
  if (!pattern) throw new Error('Allowlist pattern is required.')
  if (kind === 'email' && !isValidEmail(pattern)) {
    throw new Error('Enter a valid allowlist email address.')
  }
  if (
    kind === 'domain' &&
    (!/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(pattern) ||
      pattern.includes('..'))
  ) {
    throw new Error('Enter a valid allowlist domain.')
  }

  const [row] = await db
    .insert(authEmailAllowlist)
    .values({
      pattern,
      kind,
      note: cleanOptionalText(body.note, 300),
      createdBy: adminId,
    })
    .onConflictDoUpdate({
      target: authEmailAllowlist.pattern,
      set: { kind, note: cleanOptionalText(body.note, 300), createdBy: adminId },
    })
    .returning()

  return row
}

export async function deleteAllowlistRule(id: string) {
  const ruleId = cleanUuid(id)
  if (!ruleId) throw new Error('A valid allowlist rule id is required.')
  await db.delete(authEmailAllowlist).where(eq(authEmailAllowlist.id, ruleId))
  return { ok: true }
}
