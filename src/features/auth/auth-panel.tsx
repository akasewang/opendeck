'use client'

import { Icon } from '@iconify/react'
import { motion } from 'framer-motion'
import { type ComponentProps, type FormEvent, useEffect, useState } from 'react'
import PianoTitle from '@/components/brand/piano-title'
import { cn } from '@/utils/cn'

type AuthPanelProps = {
  inviteToken?: string
  redirect?: string
  message?: string
  initialError?: string
  onClose?: () => void
  className?: string
}

const INPUT_CLASS =
  'h-10 w-full rounded-md border border-border/30 bg-background pl-9 pr-3 text-sm text-foreground transition-colors placeholder:text-muted-foreground hover:border-border/60 focus:border-border/70 disabled:cursor-not-allowed disabled:opacity-60'

function Field({
  icon,
  label,
  ...inputProps
}: { icon: string; label: string } & ComponentProps<'input'>) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="relative">
        <Icon
          icon={icon}
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        />
        <input className={INPUT_CLASS} {...inputProps} />
      </div>
    </label>
  )
}

export default function AuthPanel({
  inviteToken,
  redirect,
  message,
  initialError,
  onClose,
  className,
}: AuthPanelProps) {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(initialError ?? null)
  const [sent, setSent] = useState(false)
  const [devLink, setDevLink] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (initialError) setError(initialError)
  }, [initialError])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/auth/magic-link', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, inviteToken, redirect }),
      })
      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        setError(payload?.error || 'Unable to send a sign-in link.')
        return
      }

      setSent(true)
      setDevLink(typeof payload?.devLink === 'string' ? payload.devLink : null)
    } catch {
      setError('Unable to reach authentication right now.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 360, damping: 32 }}
      className={cn(
        'w-full max-w-md overflow-hidden rounded-xl border border-border/60 bg-card shadow-lg',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4 border-b border-border/50 px-6 py-5">
        <div className="min-w-0">
          <div className="w-40">
            <PianoTitle
              as="span"
              text="opendeck"
              interactive={false}
              sound={false}
              className="font-display font-normal tracking-normal whitespace-nowrap"
            />
          </div>
          <p className="mt-2 text-pretty text-sm leading-snug text-muted-foreground">
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

      <form onSubmit={submit} className="space-y-4 px-6 py-5">
        {inviteToken && (
          <div className="rounded-md border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">
            Invite token applied.
          </div>
        )}

        {sent ? (
          <div className="space-y-3">
            <div className="flex items-start gap-2 rounded-md border border-success/30 bg-success/10 px-3 py-3 text-sm text-success">
              <Icon icon="ri:mail-check-line" className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Check your inbox for a sign-in link{email ? ` at ${email}` : ''}. It expires in 30
                minutes.
              </span>
            </div>
            {devLink && (
              <a
                href={devLink}
                className="flex items-center justify-center gap-2 rounded-md border border-border/40 bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-border/70 hover:bg-muted-hover"
              >
                <Icon icon="ri:external-link-line" className="h-4 w-4" />
                Open dev sign-in link
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
              <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                <Icon icon="ri:error-warning-line" className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex h-10 w-full items-center justify-center gap-2 whitespace-nowrap rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:pointer-events-none disabled:opacity-60"
            >
              {isSubmitting && <Icon icon="ri:loader-4-line" className="h-4 w-4 animate-spin" />}
              Send magic link
            </button>

            <p className="text-center text-xs text-muted-foreground">
              We&apos;ll email you a secure magic link.
            </p>
          </>
        )}
      </form>
    </motion.section>
  )
}
