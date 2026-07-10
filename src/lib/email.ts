import { db } from '@/db'
import { emailDeliveries } from '@/db/schema'
import { serverEnv } from '@/lib/server-env'

type EmailPayload = {
  userId?: string
  to: string
  subject: string
  text: string
  html?: string
  type: string
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

async function deliverWithResend(payload: EmailPayload, from: string): Promise<DeliveryResult> {
  const apiKey = serverEnv.resendApiKey
  if (!apiKey) return { provider: null, status: 'skipped', error: 'Email provider not configured' }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: payload.to,
      subject: payload.subject,
      text: payload.text,
      html: payload.html,
    }),
  })

  if (!response.ok) {
    const error = await response.text().catch(() => response.statusText)
    return { provider: 'resend', status: 'failed', error: error.slice(0, 500) }
  }

  return { provider: 'resend', status: 'sent' }
}

export async function sendEmail(payload: EmailPayload) {
  const from = serverEnv.emailFrom
  let result: DeliveryResult

  if (!from) {
    result = { provider: null, status: 'skipped', error: 'EMAIL_FROM is not configured' }
  } else {
    try {
      result = await deliverWithResend(payload, from)
    } catch (error) {
      result = { provider: 'resend', status: 'failed', error: errorMessage(error) }
    }
  }

  await db.insert(emailDeliveries).values({
    userId: payload.userId,
    email: payload.to,
    type: payload.type,
    subject: payload.subject,
    provider: result.provider,
    status: result.status,
    error: result.error,
    metadata: payload.metadata ?? {},
    sentAt: result.status === 'sent' ? new Date() : null,
  })

  return result
}
