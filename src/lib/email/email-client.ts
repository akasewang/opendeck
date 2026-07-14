import { randomUUID } from 'node:crypto'
import { and, eq, ne } from 'drizzle-orm'
import { serverEnv } from '@/config/server-env'
import { db } from '@/db/client'
import { emailDeliveries } from '@/db/schema'
import { safeErrorContext } from '@/lib/api/errors'
import { fetchWithTimeout } from '@/lib/api/http-client'

const EMAIL_DELIVERY_TIMEOUT_MS = 10_000

type EmailPayload = {
  userId?: string
  to: string
  subject: string
  text: string
  html?: string
  type: string
  idempotencyKey?: string
  metadata?: Record<string, unknown>
}

type DeliveryResult = {
  provider: string | null
  status: 'sent' | 'skipped' | 'failed'
  error?: string
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message.slice(0, 500) : 'Email delivery failed'
}

export function isEmailDeliveryConfigured() {
  return Boolean(serverEnv.emailFrom && serverEnv.resendApiKey)
}

async function deliverWithResend(
  payload: EmailPayload,
  from: string,
  idempotencyKey: string,
): Promise<DeliveryResult> {
  const apiKey = serverEnv.resendApiKey
  if (!apiKey) return { provider: null, status: 'skipped', error: 'Email provider not configured' }

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetchWithTimeout(
        'https://api.resend.com/emails',
        {
          method: 'POST',
          headers: {
            authorization: `Bearer ${apiKey}`,
            'content-type': 'application/json',
            'idempotency-key': idempotencyKey,
          },
          body: JSON.stringify({
            from,
            to: payload.to,
            subject: payload.subject,
            text: payload.text,
            html: payload.html,
          }),
        },
        EMAIL_DELIVERY_TIMEOUT_MS,
      )

      if (response.ok) return { provider: 'resend', status: 'sent' }

      const error = await response.text().catch(() => response.statusText)
      if (attempt === 0 && response.status >= 500) continue
      return { provider: 'resend', status: 'failed', error: error.slice(0, 500) }
    } catch (error) {
      if (attempt === 0) continue
      throw error
    }
  }

  return {
    provider: 'resend',
    status: 'failed',
    error: 'Email delivery failed after an idempotent retry.',
  }
}

export async function sendEmail(payload: EmailPayload) {
  const requestedIdempotencyKey = payload.idempotencyKey?.trim()
  if (requestedIdempotencyKey && requestedIdempotencyKey.length > 256) {
    throw new Error('Email idempotency keys must be at most 256 characters.')
  }

  let deliveryId: string | undefined
  try {
    const [queued] = await db
      .insert(emailDeliveries)
      .values({
        userId: payload.userId,
        email: payload.to,
        type: payload.type,
        idempotencyKey: requestedIdempotencyKey || null,
        subject: payload.subject,
        status: 'queued',
        metadata: payload.metadata ?? {},
      })
      .onConflictDoNothing({ target: emailDeliveries.idempotencyKey })
      .returning({ id: emailDeliveries.id })
    deliveryId = queued?.id

    if (!deliveryId && requestedIdempotencyKey) {
      const [existing] = await db
        .select({
          id: emailDeliveries.id,
          provider: emailDeliveries.provider,
          status: emailDeliveries.status,
        })
        .from(emailDeliveries)
        .where(eq(emailDeliveries.idempotencyKey, requestedIdempotencyKey))
        .limit(1)
      if (existing?.status === 'sent') {
        return { provider: existing.provider, status: 'sent' } satisfies DeliveryResult
      }
      deliveryId = existing?.id
    }
  } catch (error) {
    console.error('Email delivery audit record could not be queued', {
      error: safeErrorContext(error),
      type: payload.type,
    })
  }

  const from = serverEnv.emailFrom
  const providerIdempotencyKey =
    requestedIdempotencyKey || `email-delivery/${deliveryId ?? randomUUID()}`
  let result: DeliveryResult

  if (!from) {
    result = { provider: null, status: 'skipped', error: 'EMAIL_FROM is not configured' }
  } else {
    try {
      result = await deliverWithResend(payload, from, providerIdempotencyKey)
    } catch (error) {
      result = { provider: 'resend', status: 'failed', error: errorMessage(error) }
    }
  }

  if (deliveryId) {
    try {
      const deliveryCondition =
        result.status === 'sent'
          ? eq(emailDeliveries.id, deliveryId)
          : and(eq(emailDeliveries.id, deliveryId), ne(emailDeliveries.status, 'sent'))
      await db
        .update(emailDeliveries)
        .set({
          provider: result.provider,
          status: result.status,
          error: result.error,
          sentAt: result.status === 'sent' ? new Date() : null,
        })
        .where(deliveryCondition)
    } catch (error) {
      console.error('Email delivery completed but its audit record could not be finalized', {
        error: safeErrorContext(error),
        type: payload.type,
        status: result.status,
      })
    }
  }

  return result
}
