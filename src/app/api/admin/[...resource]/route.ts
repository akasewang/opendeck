import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import {
  createInvite,
  deleteAllowlistRule,
  deleteUserAsAdmin,
  listAdminSecurity,
  listAdminUsers,
  saveAllowlistRule,
  updateAdminUser,
} from '@/features/admin/services/admin-account-service'
import {
  listAdminIngestionDashboard,
  recordAdminAudit,
} from '@/features/admin/services/admin-dashboard-service'
import { getUserFromRequest } from '@/features/auth/services/authentication-service'
import { safeErrorContext } from '@/lib/api/errors'
import { readJsonObject } from '@/lib/api/request-body'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type RouteContext = {
  params: Promise<{ resource?: string[] }>
}

function errorResponse(error: unknown, status = 400) {
  const message = error instanceof Error ? error.message : 'Unable to process request.'
  const schemaMissing = message.includes('does not exist')
  const databaseError =
    schemaMissing || message.startsWith('Failed query') || message.includes('violates')
  const notFound = message.endsWith('not found.')
  const conflict = message === 'At least one active admin must remain.'
  const responseStatus = databaseError ? 500 : notFound ? 404 : conflict ? 409 : status

  if (databaseError) {
    console.error('Admin API database operation failed', safeErrorContext(error))
  }

  return NextResponse.json(
    {
      error: databaseError
        ? schemaMissing
          ? 'Account database tables are not available. Run migrations and try again.'
          : 'Unable to complete the admin request right now.'
        : message,
    },
    { status: responseStatus },
  )
}

async function requireAdmin(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return { response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  if (user.role !== 'admin') {
    return { response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }
  return { user }
}

async function resourcePath(context: RouteContext) {
  return (await context.params).resource ?? ['users']
}

async function recordAuditSafely(...args: Parameters<typeof recordAdminAudit>) {
  try {
    await recordAdminAudit(...args)
  } catch (error) {
    console.error(
      'Admin action succeeded but its audit record could not be written',
      safeErrorContext(error),
    )
  }
}

export async function GET(request: NextRequest, context: RouteContext) {
  const auth = await requireAdmin(request)
  if ('response' in auth) return auth.response

  try {
    const [resource] = await resourcePath(context)

    if (resource === 'users') {
      return NextResponse.json({ users: await listAdminUsers() })
    }

    if (resource === 'security') {
      return NextResponse.json(await listAdminSecurity())
    }

    if (resource === 'ingestion') {
      return NextResponse.json(await listAdminIngestionDashboard())
    }

    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  } catch (error) {
    return errorResponse(error)
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  const auth = await requireAdmin(request)
  if ('response' in auth) return auth.response

  try {
    const [resource, action] = await resourcePath(context)
    const body = await readJsonObject(request)

    if (resource === 'users' && action === 'delete') {
      const result = await deleteUserAsAdmin(auth.user.id, body)
      await recordAuditSafely(auth.user.id, 'delete_user', 'user', result.id)
      return NextResponse.json(result)
    }

    if (resource === 'users') {
      const user = await updateAdminUser(auth.user.id, body)
      await recordAuditSafely(auth.user.id, 'update_user', 'user', user.id, {
        role: user.role,
        status: body.status === 'suspended' ? 'suspended' : 'active',
      })
      return NextResponse.json({ user })
    }

    if (resource === 'invites') {
      const invite = await createInvite(auth.user.id, body)
      await recordAuditSafely(auth.user.id, 'create_invite', 'invite', invite.id, {
        email: invite.email,
        role: invite.role,
        expiresAt: invite.expiresAt,
      })
      return NextResponse.json({ invite })
    }

    if (resource === 'allowlist' && action === 'delete') {
      const id = String(body.id ?? '')
      const result = await deleteAllowlistRule(id)
      await recordAuditSafely(auth.user.id, 'delete_allowlist_rule', 'allowlist_rule', id)
      return NextResponse.json(result)
    }

    if (resource === 'allowlist') {
      const rule = await saveAllowlistRule(auth.user.id, body)
      await recordAuditSafely(auth.user.id, 'save_allowlist_rule', 'allowlist_rule', rule.id, {
        pattern: rule.pattern,
        kind: rule.kind,
      })
      return NextResponse.json({ rule })
    }

    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  } catch (error) {
    return errorResponse(error)
  }
}
