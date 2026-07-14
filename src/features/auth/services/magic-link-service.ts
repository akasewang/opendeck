import { and, eq, gt, isNull, sql } from 'drizzle-orm'
import type { NextRequest } from 'next/server'
import { APP_CONFIG } from '@/config/application'
import { serverEnv } from '@/config/server-env'
import { db } from '@/db/client'
import {
  authEmailAllowlist,
  authInvites,
  authSessions,
  authTokens,
  authUsers,
  userCollections,
  userPreferences,
} from '@/db/schema'
import {
  createOpaqueToken,
  hashOpaqueToken,
  isValidEmail,
  normalizeEmail,
  normalizeName,
  prepareSession,
  toPublicUser,
} from '@/features/auth/services/authentication-service'
import type { AuthRole } from '@/features/auth/types/authentication'
import { cleanText, cleanUuid, isRecord, safeRelativePath } from '@/lib/api/input-normalization'
import { isEmailDeliveryConfigured, sendEmail } from '@/lib/email/email-client'
import { formatEmailStamp, renderEmail } from '@/lib/email/email-templates'

type InviteAccess = {
  role: AuthRole
  inviteId?: string
}

function magicLinkUrl(token: string) {
  const params = new URLSearchParams({ token })
  return `${APP_CONFIG.url}/api/auth/magic-link/callback?${params.toString()}`
}

async function sendMagicLinkEmail(
  email: string,
  token: string,
  expiresAt: Date,
  tokenId: string,
  userId?: string,
) {
  const actionUrl = magicLinkUrl(token)
  const subject = 'Sign in to OpenDeck'
  const outro = 'If you did not ask to sign in, you can ignore this email.'
  const note = `This link expires at ${formatEmailStamp(expiresAt)}.`
  const summary = `Use this link to sign in. It works once and expires at ${formatEmailStamp(expiresAt)}.`

  return sendEmail({
    userId,
    to: email,
    type: 'magic_link',
    idempotencyKey: `magic-link/${tokenId}`,
    subject,
    text: [summary, '', actionUrl, '', outro].join('\n'),
    html: renderEmail({
      preview: summary,
      eyebrow: 'sign in',
      heading: subject,
      paragraphs: ['Use this link to sign in to OpenDeck.'],
      button: { label: 'Sign in', href: actionUrl },
      note,
      footer: outro,
    }),
    metadata: { expiresAt: expiresAt.toISOString() },
  })
}

function ensureProductionEmailDelivery() {
  if (serverEnv.nodeEnv === 'production' && !isEmailDeliveryConfigured()) {
    throw new Error('Email delivery is not configured.')
  }
}

function matchesPattern(email: string, pattern: string, kind: string) {
  const normalizedPattern = pattern.trim().toLowerCase()
  if (!normalizedPattern) return false

  if (kind === 'domain') {
    return email.endsWith(`@${normalizedPattern.replace(/^@/, '')}`)
  }

  return email === normalizedPattern
}

async function allowlistAllows(email: string) {
  const rows = await db.select().from(authEmailAllowlist)
  if (rows.length === 0) return { enforced: false, allowed: false }

  return {
    enforced: true,
    allowed: rows.some((row) => matchesPattern(email, row.pattern, row.kind)),
  }
}

async function consumeInvite(email: string, token?: unknown) {
  const value = cleanText(token, 300)
  if (!value) return null

  const [invite] = await db
    .select()
    .from(authInvites)
    .where(
      and(
        eq(authInvites.tokenHash, hashOpaqueToken(value)),
        gt(authInvites.expiresAt, new Date()),
        isNull(authInvites.acceptedAt),
      ),
    )
    .limit(1)

  if (!invite) return null
  if (invite.email && normalizeEmail(invite.email) !== email) return null
  return invite
}

async function findEligibleInviteById(email: string, inviteIdInput: unknown) {
  const inviteId = cleanUuid(inviteIdInput)
  if (!inviteId) return null

  const [invite] = await db
    .select()
    .from(authInvites)
    .where(
      and(
        eq(authInvites.id, inviteId),
        gt(authInvites.expiresAt, new Date()),
        isNull(authInvites.acceptedAt),
      ),
    )
    .limit(1)

  if (!invite) return null
  if (invite.email && normalizeEmail(invite.email) !== email) return null
  return invite
}

async function resolveSignupAccess(emailInput: unknown, inviteToken?: unknown) {
  const email = normalizeEmail(emailInput)
  const adminEmail = serverEnv.authAdminEmails.includes(email)
  const invite = await consumeInvite(email, inviteToken)

  if (adminEmail || invite) {
    return {
      role: adminEmail || invite?.role === 'admin' ? 'admin' : 'user',
      inviteId: invite?.id,
    } satisfies InviteAccess
  }

  const envEmails = serverEnv.authAllowedEmails
  const envDomains = serverEnv.authAllowedDomains
  const envAllowlistEnforced = envEmails.length > 0 || envDomains.length > 0
  const envAllowed =
    envEmails.includes(email) || envDomains.some((domain) => email.endsWith(`@${domain}`))
  const dbAllowlist = await allowlistAllows(email)

  if (serverEnv.authInviteOnly) {
    return { error: 'An invitation is required to create an account.' }
  }

  if (envAllowlistEnforced && !envAllowed) {
    return { error: 'This email is not allowed to create an account.' }
  }

  if (dbAllowlist.enforced && !dbAllowlist.allowed) {
    return { error: 'This email is not on the account allowlist.' }
  }

  return { role: 'user' } satisfies InviteAccess
}

async function findMagicLinkToken(tokenInput: unknown) {
  const token = cleanText(tokenInput, 300)
  if (!token) throw new Error('Missing token.')

  const [row] = await db
    .select()
    .from(authTokens)
    .where(
      and(
        eq(authTokens.tokenHash, hashOpaqueToken(token)),
        eq(authTokens.type, 'magic_link'),
        gt(authTokens.expiresAt, new Date()),
        isNull(authTokens.usedAt),
      ),
    )
    .limit(1)

  if (!row) throw new Error('Token is invalid or expired.')
  return row
}

export async function requestMagicLink(
  emailInput: unknown,
  options: { inviteToken?: unknown; redirect?: unknown } = {},
) {
  const email = normalizeEmail(emailInput)
  if (!isValidEmail(email)) throw new Error('Enter a valid email address.')
  ensureProductionEmailDelivery()

  const [existing] = await db.select().from(authUsers).where(eq(authUsers.email, email)).limit(1)
  const inviteToken = typeof options.inviteToken === 'string' ? options.inviteToken : undefined
  const redirect = safeRelativePath(options.redirect)

  if (existing && existing.status !== 'active') return { ok: true }

  let signupAccess: InviteAccess | undefined
  if (!existing) {
    const access = await resolveSignupAccess(email, inviteToken)
    if (!('error' in access)) signupAccess = access
  }
  if (!existing && !signupAccess) return { ok: true }

  const token = createOpaqueToken()
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000)
  const [createdToken] = await db
    .insert(authTokens)
    .values({
      userId: existing?.id,
      email,
      type: 'magic_link',
      tokenHash: hashOpaqueToken(token),
      expiresAt,
      metadata: {
        ...(signupAccess?.inviteId ? { inviteId: signupAccess.inviteId } : {}),
        ...(redirect ? { redirect } : {}),
      },
    })
    .returning({ id: authTokens.id })

  const delivery = await sendMagicLinkEmail(email, token, expiresAt, createdToken.id, existing?.id)
  if (serverEnv.nodeEnv === 'production' && delivery.status !== 'sent') {
    await db.delete(authTokens).where(eq(authTokens.id, createdToken.id))
    throw new Error('Unable to send email right now.')
  }

  return {
    ok: true,
    ...(serverEnv.nodeEnv === 'production'
      ? {}
      : { emailDeliveryStatus: delivery.status, devLink: magicLinkUrl(token) }),
  }
}

export async function completeMagicLink(token: unknown, request?: NextRequest) {
  const row = await findMagicLinkToken(token)
  const metadata = isRecord(row.metadata) ? row.metadata : {}
  const redirect = safeRelativePath(metadata.redirect) ?? '/dashboard/home'
  const storedInviteId = cleanUuid(metadata.inviteId) || undefined
  if (metadata.inviteId !== undefined && !storedInviteId) {
    throw new Error('Token invitation metadata is invalid.')
  }
  const legacyInviteToken =
    typeof metadata.inviteToken === 'string' ? metadata.inviteToken : undefined

  const [existingUser] = await db
    .select()
    .from(authUsers)
    .where(eq(authUsers.email, row.email))
    .limit(1)

  if (existingUser && existingUser.status !== 'active') {
    throw new Error('This account is suspended.')
  }

  let inviteId: string | undefined
  let role: AuthRole = existingUser?.role === 'admin' ? 'admin' : 'user'
  if (!existingUser) {
    const storedInvite = storedInviteId
      ? await findEligibleInviteById(row.email, storedInviteId)
      : null
    const access = storedInvite
      ? ({
          role: storedInvite.role === 'admin' ? 'admin' : 'user',
          inviteId: storedInvite.id,
        } satisfies InviteAccess)
      : await resolveSignupAccess(row.email, legacyInviteToken)
    if ('error' in access) throw new Error(access.error)
    if (storedInviteId && access.inviteId !== storedInviteId) {
      throw new Error('Invitation is invalid or expired.')
    }
    inviteId = access.inviteId
    role = access.role
  }

  const completedAt = new Date()
  const preparedSession = prepareSession(request)
  type CompletionRow = {
    id: string
    name: string
    email: string
    role: string
    status: string
    sessionId: string
  }
  const completion = await db.execute<CompletionRow>(sql`
    with eligible_token as (
      select ${authTokens.email}
      from ${authTokens}
      where ${authTokens.id} = ${row.id}
        and ${authTokens.type} = 'magic_link'
        and ${authTokens.usedAt} is null
        and ${authTokens.expiresAt} > ${completedAt}
        and not exists (
          select 1
          from ${authUsers} blocked_user
          where blocked_user.email = ${authTokens.email}
            and blocked_user.status <> 'active'
        )
      for update
    ),
    eligible_invite as (
      select ${authInvites.id}
      from ${authInvites}
      where ${authInvites.id} = ${inviteId ?? null}::uuid
        and ${authInvites.acceptedAt} is null
        and ${authInvites.expiresAt} > ${completedAt}
      for update
    ),
    upserted_user as (
      insert into ${authUsers} (name, email, role, last_login_at, updated_at)
      select
        ${normalizeName(row.email.split('@')[0]) || row.email},
        eligible_token.email,
        ${role},
        ${completedAt},
        ${completedAt}
      from eligible_token
      where ${inviteId ?? null}::uuid is null
        or exists (select 1 from eligible_invite)
      on conflict (email) do update
      set last_login_at = excluded.last_login_at,
          updated_at = excluded.updated_at
      where ${authUsers.status} = 'active'
      returning id, name, email, role, status
    ),
    inserted_preferences as (
      insert into ${userPreferences} (user_id)
      select id from upserted_user
      on conflict (user_id) do nothing
    ),
    inserted_saved_collection as (
      insert into ${userCollections} (user_id, name, description)
      select id, 'Saved repos', 'Repositories worth revisiting.' from upserted_user
      on conflict (user_id, name) do nothing
    ),
    inserted_pipeline_collection as (
      insert into ${userCollections} (user_id, name, description)
      select id, 'Contribution pipeline', 'Repos you are actively evaluating or contributing to.'
      from upserted_user
      on conflict (user_id, name) do nothing
    ),
    inserted_session as (
      insert into ${authSessions} (user_id, token_hash, user_agent, ip_address, expires_at)
      select
        id,
        ${preparedSession.record.tokenHash},
        ${preparedSession.record.userAgent},
        ${preparedSession.record.ipAddress},
        ${preparedSession.expiresAt}
      from upserted_user
      where status = 'active'
      returning id
    ),
    accepted_invite as (
      update ${authInvites}
      set "accepted_at" = ${completedAt}
      where ${authInvites.id} in (select id from eligible_invite)
        and exists (select 1 from inserted_session)
      returning ${authInvites.id}
    ),
    consumed_token as (
      update ${authTokens} token
      set used_at = ${completedAt},
          user_id = upserted_user.id,
          metadata = token.metadata - 'inviteToken'
      from upserted_user
      where token.id = ${row.id}
        and exists (select 1 from inserted_session)
        and (
          ${inviteId ?? null}::uuid is null
          or exists (select 1 from accepted_invite)
        )
      returning token.id
    )
    select
      upserted_user.id as "id",
      upserted_user.name as "name",
      upserted_user.email as "email",
      upserted_user.role as "role",
      upserted_user.status as "status",
      inserted_session.id as "sessionId"
    from upserted_user
    cross join inserted_session
    cross join consumed_token
  `)
  const user = completion.rows[0]
  if (!user) throw new Error('Token is invalid, expired, or already used.')

  return {
    user: toPublicUser(user),
    token: preparedSession.token,
    expiresAt: preparedSession.expiresAt,
    redirect,
  }
}
