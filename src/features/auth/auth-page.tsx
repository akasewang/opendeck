'use client'

import { Icon } from '@iconify/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import SiteHeader from '@/components/layout/site-header'
import AuthPanel from '@/features/auth/auth-panel'
import { useAuth } from '@/features/auth/auth-provider'

function safeRedirect(value: string | null) {
  if (!value?.startsWith('/') || value.startsWith('//')) return '/dashboard'
  return value
}

export default function AuthPage() {
  const router = useRouter()
  const { user, isLoading } = useAuth()
  const [redirectTo, setRedirectTo] = useState<string | null>(null)
  const [inviteToken, setInviteToken] = useState<string | null>(null)
  const [authMessage, setAuthMessage] = useState<string | null>(null)
  const [authError, setAuthError] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setRedirectTo(safeRedirect(params.get('redirect')))
    setInviteToken(params.get('invite'))
    setAuthMessage(params.get('message'))
    setAuthError(params.get('error'))
  }, [])

  useEffect(() => {
    if (redirectTo && !isLoading && user) router.replace(redirectTo)
  }, [isLoading, redirectTo, router, user])

  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <SiteHeader />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-56 bg-[radial-gradient(circle_at_50%_100%,color-mix(in_srgb,var(--color-accent)_18%,transparent),transparent_65%)]"
      />
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-20">
        <div className="grid w-full max-w-5xl gap-8 lg:grid-cols-[1fr_28rem] lg:items-center">
          <section className="max-w-xl space-y-4">
            <div className="inline-flex items-center gap-2 rounded-md border border-border/60 bg-card/40 px-3 py-1.5 text-sm text-muted-foreground">
              <Icon icon="ri:lock-unlock-line" className="h-4 w-4 text-accent" />
              Public browsing, private detail access
            </div>
            <h1 className="text-balance text-3xl font-medium leading-tight text-primary sm:text-5xl">
              Sign in to open repository and organization details.
            </h1>
            <p className="max-w-lg text-pretty text-sm leading-relaxed text-muted-foreground sm:text-base">
              The dashboard remains visible to everyone. Account access unlocks row expansion,
              contributor context and deeper organization details.
            </p>
          </section>

          <AuthPanel
            inviteToken={inviteToken ?? undefined}
            redirect={redirectTo ?? undefined}
            message={authMessage ?? undefined}
            initialError={authError ?? undefined}
          />
        </div>
      </div>
    </main>
  )
}
