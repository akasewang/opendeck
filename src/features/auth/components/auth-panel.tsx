'use client'

import { Icon } from '@iconify/react'
import { motion } from 'framer-motion'
import { type ComponentProps, type FormEvent, useState } from 'react'
import PianoTitle from '@/components/brand/piano-title'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { MOTION_SPRING } from '@/config/motion'
import { API_ROUTES } from '@/config/routes'
import { authErrorMessage } from '@/features/auth/utils/auth-error-messages'
import { isRecord } from '@/lib/api/input-normalization'
import { cn } from '@/utils/cn'

type AuthPanelProps = {
  inviteToken?: string
  redirect?: string
  message?: string
  onClose?: () => void
  className?: string
}

function Field({
  icon,
  label,
  ...inputProps
}: { icon: string; label: string } & ComponentProps<'input'>) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <Input icon={icon} className="h-10" {...inputProps} />
    </label>
  )
}

export default function AuthPanel({
  inviteToken,
  redirect,
  message,
  onClose,
  className,
}: AuthPanelProps) {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [devLink, setDevLink] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      const response = await fetch(API_ROUTES.auth.magicLink, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, inviteToken, redirect }),
      })
      const payload: unknown = await response.json().catch(() => null)

      if (!response.ok) {
        const errorCode =
          isRecord(payload) && typeof payload.error === 'string' ? payload.error : null
        const retryAfterSeconds =
          isRecord(payload) &&
          typeof payload.retryAfterSeconds === 'number' &&
          Number.isSafeInteger(payload.retryAfterSeconds)
            ? payload.retryAfterSeconds
            : undefined
        setError(authErrorMessage(errorCode, retryAfterSeconds))
        return
      }

      setSent(true)
      setDevLink(isRecord(payload) && typeof payload.devLink === 'string' ? payload.devLink : null)
    } catch {
      setError(authErrorMessage('unreachable'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.98 }}
      transition={MOTION_SPRING.auth}
      className={cn(
        'w-full max-w-md overflow-hidden rounded-xl border border-border/60 bg-card shadow-lg',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4 border-b border-border/50 px-6 py-5">
        <div className="min-w-0">
          <h2 id="auth-dialog-title" className="sr-only">
            Sign in to OpenDeck
          </h2>
          <div className="w-40">
            <PianoTitle
              as="span"
              text="opendeck"
              interactive={false}
              sound={false}
              className="font-display font-normal tracking-normal whitespace-nowrap"
            />
          </div>
          <p
            id="auth-dialog-description"
            className="mt-2 text-pretty text-sm leading-snug text-muted-foreground"
          >
            {message ?? 'Sign in to unlock row details. Browsing stays public.'}
          </p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close authentication"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted-hover hover:text-foreground"
          >
            <Icon icon="ri:close-line" className="h-4 w-4" />
          </button>
        )}
      </div>

      <form onSubmit={submit} aria-busy={isSubmitting} className="space-y-4 px-6 py-5">
        {inviteToken && (
          <div className="rounded-md border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">
            Invite token applied.
          </div>
        )}

        {sent ? (
          <div className="space-y-3">
            <div
              role="status"
              aria-live="polite"
              className="flex items-start gap-2 rounded-md border border-success/30 bg-success/10 px-3 py-3 text-sm text-success"
            >
              <Icon icon="ri:mail-check-line" className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Check your inbox{email ? ` at ${email}` : ''} for a link to sign in. It expires in
                30 minutes.
              </span>
            </div>
            {devLink && (
              <a
                href={devLink}
                className="flex items-center justify-center gap-2 rounded-md border border-border/40 bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-border/70 hover:bg-muted-hover"
              >
                <Icon icon="ri:external-link-line" className="h-4 w-4" />
                Open dev link
              </a>
            )}
            <button
              type="button"
              onClick={() => {
                setSent(false)
                setDevLink(null)
              }}
              className="w-full text-center text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Use a different email
            </button>
          </div>
        ) : (
          <>
            <Field
              icon="ri:mail-line"
              label="Email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              placeholder="you@example.com"
              required
              disabled={isSubmitting}
            />

            {error && (
              <div
                role="alert"
                className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                <Icon icon="ri:error-warning-line" className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting}
              className="h-10 w-full px-4"
            >
              {isSubmitting && <Icon icon="ri:loader-4-line" className="h-4 w-4 animate-spin" />}
              Send magic link
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              We&apos;ll email you a secure magic link.
            </p>
          </>
        )}
      </form>
    </motion.section>
  )
}
