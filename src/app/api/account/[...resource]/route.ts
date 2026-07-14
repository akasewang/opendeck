import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import {
  deleteAccount,
  deleteCollection,
  exportSavedRepos,
  getAccountOverview,
  getFollowState,
  getFollowStates,
  getRecommendationsPage,
  getRepoPersonalState,
  getRepoPersonalStates,
  markAlertsRead,
  recordRecentView,
  revokeSession,
  saveCollection,
  sessionTokenFromRequest,
  signOutOtherSessions,
  toggleFollow,
  updateCollectionItem,
  updatePreferences,
  updateProfile,
  updateRepoPersonalState,
} from '@/features/account/services/account-management-service'
import {
  createCollectionFromTemplate,
  deleteRepoJournal,
  deleteSavedSearch,
  getCollectionDetail,
  getIssueRecommendations,
  getRepoJournal,
  previewSavedSearch,
  saveOnboarding,
  saveRepoJournal,
  saveSavedSearch,
  shareCollection,
} from '@/features/account/services/account-workspace-service'
import {
  clearSessionCookie,
  getUserFromRequest,
} from '@/features/auth/services/authentication-service'
import { safeErrorContext } from '@/lib/api/errors'
import { readJsonObject } from '@/lib/api/request-body'
import { parseOptionalInteger } from '@/lib/api/query-parameters'

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
  const serviceUnavailable =
    message === 'Email delivery is not configured.' || message === 'Unable to send email right now.'
  const notFound = message.endsWith('not found.') || message.includes('not in the OpenDeck mirror')
  const conflict =
    message.includes('already exists') ||
    message.includes('already used') ||
    message === 'At least one active admin must remain.'
  const responseStatus = databaseError
    ? 500
    : serviceUnavailable
      ? 503
      : notFound
        ? 404
        : conflict
          ? 409
          : status

  if (databaseError) {
    console.error('Account API database operation failed', safeErrorContext(error))
  }

  return NextResponse.json(
    {
      error: databaseError
        ? schemaMissing
          ? 'Account database tables are not available. Run migrations and try again.'
          : 'Unable to complete the account request right now.'
        : message,
    },
    { status: responseStatus },
  )
}

async function requireUser(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user) return null
  return user
}

async function resourcePath(context: RouteContext) {
  return (await context.params).resource ?? ['overview']
}

export async function GET(request: NextRequest, context: RouteContext) {
  const user = await requireUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const path = await resourcePath(context)
    const [resource] = path

    if (resource === 'overview') {
      return NextResponse.json({
        account: await getAccountOverview(user, sessionTokenFromRequest(request)),
      })
    }

    if (resource === 'repo') {
      return NextResponse.json({
        item: await getRepoPersonalState(user.id, {
          repoId: request.nextUrl.searchParams.get('repoId'),
          fullName: request.nextUrl.searchParams.get('fullName'),
        }),
      })
    }

    if (resource === 'follows') {
      return NextResponse.json(
        await getFollowState(user.id, {
          targetType: request.nextUrl.searchParams.get('targetType'),
          targetKey: request.nextUrl.searchParams.get('targetKey'),
          fullName: request.nextUrl.searchParams.get('fullName'),
        }),
      )
    }

    if (resource === 'issues') {
      return NextResponse.json({ items: await getIssueRecommendations(user.id) })
    }

    if (resource === 'recommendations') {
      const parsedPage = parseOptionalInteger('page', request.nextUrl.searchParams.get('page'), {
        min: 1,
      })
      if (parsedPage.error) return NextResponse.json({ error: parsedPage.error }, { status: 400 })
      return NextResponse.json(await getRecommendationsPage(user.id, parsedPage.value ?? 1))
    }

    if (resource === 'collections') {
      return NextResponse.json(
        await getCollectionDetail(user.id, request.nextUrl.searchParams.get('id')),
      )
    }

    if (resource === 'journal') {
      return NextResponse.json(
        await getRepoJournal(user.id, {
          repoId: request.nextUrl.searchParams.get('repoId'),
          fullName: request.nextUrl.searchParams.get('fullName'),
        }),
      )
    }

    if (resource === 'export') {
      const requestedFormat = request.nextUrl.searchParams.get('format')
      if (requestedFormat && requestedFormat !== 'json' && requestedFormat !== 'csv') {
        return NextResponse.json({ error: 'format must be json or csv.' }, { status: 400 })
      }
      const format = requestedFormat === 'csv' ? 'csv' : 'json'
      const exported = await exportSavedRepos(user.id, format)
      return new NextResponse(exported.body, {
        headers: {
          'Content-Type': exported.contentType,
          'Content-Disposition': `attachment; filename="opendeck-saved-repos.${format}"`,
          'Cache-Control': 'private, no-store',
        },
      })
    }

    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  } catch (error) {
    return errorResponse(error)
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  const user = await requireUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const path = await resourcePath(context)
    const [resource, action] = path
    const body = await readJsonObject(request)

    if (resource === 'repo' && action === 'batch') {
      return NextResponse.json({ items: await getRepoPersonalStates(user.id, body.fullNames) })
    }

    if (resource === 'repo') {
      return NextResponse.json({ item: await updateRepoPersonalState(user.id, body) })
    }

    if (resource === 'recent') {
      return NextResponse.json(await recordRecentView(user.id, body))
    }

    if (resource === 'alerts' && action === 'read') {
      return NextResponse.json(await markAlertsRead(user.id))
    }

    if (resource === 'collections' && action === 'item') {
      return NextResponse.json({ item: await updateCollectionItem(user.id, body) })
    }

    if (resource === 'collections' && action === 'delete') {
      return NextResponse.json(await deleteCollection(user.id, String(body.id ?? '')))
    }

    if (resource === 'collections' && action === 'share') {
      return NextResponse.json({ collection: await shareCollection(user.id, body) })
    }

    if (resource === 'collections' && action === 'template') {
      return NextResponse.json({
        collection: await createCollectionFromTemplate(user.id, body.key),
      })
    }

    if (resource === 'collections') {
      return NextResponse.json({ collection: await saveCollection(user.id, body) })
    }

    if (resource === 'onboarding') {
      return NextResponse.json({ onboarding: await saveOnboarding(user.id, body) })
    }

    if (resource === 'saved-searches' && action === 'delete') {
      return NextResponse.json(await deleteSavedSearch(user.id, body.id))
    }

    if (resource === 'saved-searches' && action === 'preview') {
      return NextResponse.json(await previewSavedSearch(body))
    }

    if (resource === 'saved-searches') {
      return NextResponse.json({ savedSearch: await saveSavedSearch(user.id, body) })
    }

    if (resource === 'follows' && action === 'batch') {
      return NextResponse.json({ items: await getFollowStates(user.id, body) })
    }

    if (resource === 'follows') {
      return NextResponse.json(await toggleFollow(user.id, body))
    }

    if (resource === 'journal' && action === 'delete') {
      return NextResponse.json(await deleteRepoJournal(user.id, body))
    }

    if (resource === 'journal') {
      return NextResponse.json(await saveRepoJournal(user.id, body))
    }

    if (resource === 'preferences') {
      return NextResponse.json({ preferences: await updatePreferences(user.id, body) })
    }

    if (resource === 'profile') {
      return NextResponse.json({ user: await updateProfile(user.id, body) })
    }

    if (resource === 'sessions' && action === 'revoke') {
      return NextResponse.json(
        await revokeSession(user.id, body.sessionId, sessionTokenFromRequest(request)),
      )
    }

    if (resource === 'sessions' && action === 'sign-out-all') {
      const includeCurrent = body.includeCurrent === true
      const result = await signOutOtherSessions(
        user.id,
        sessionTokenFromRequest(request),
        includeCurrent,
      )
      const response = NextResponse.json(result)
      if (includeCurrent) clearSessionCookie(response)
      return response
    }

    if (resource === 'delete') {
      const result = await deleteAccount(user.id, body)
      const response = NextResponse.json(result)
      clearSessionCookie(response)
      return response
    }

    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  } catch (error) {
    return errorResponse(error)
  }
}
