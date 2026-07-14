'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { toast } from '@/components/ui/toast'
import { API_ROUTES } from '@/config/routes'
import AuthPanel from '@/features/auth/components/auth-panel'
import type { AuthUser } from '@/features/auth/types/authentication'
import { authErrorMessage } from '@/features/auth/utils/auth-error-messages'
import { isSessionResponse } from '@/features/auth/utils/auth-response-validation'
import { apiErrorMessage } from '@/lib/api/errors'
import { fetchWithTimeout } from '@/lib/api/http-client'
import { safeRelativePath } from '@/lib/api/input-normalization'

type AuthPrompt = {
  open: boolean
  message?: string
  inviteToken?: string
  redirect?: string
}

type OpenAuthOptions = {
  message?: string
  inviteToken?: string
  redirect?: string
}

type AuthEntry = {
  inviteToken?: string
  redirect?: string
}

const AUTH_PARAMS = ['error', 'invite', 'redirect']

function readAuthParams() {
  const params = new URLSearchParams(window.location.search)
  if (!AUTH_PARAMS.some((key) => params.has(key))) return null

  const entry: AuthEntry = {
    inviteToken: params.get('invite') ?? undefined,
    redirect: safeRelativePath(params.get('redirect')),
  }
  const errorCode = params.get('error')

  const url = new URL(window.location.href)
  for (const key of AUTH_PARAMS) url.searchParams.delete(key)
  window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`)

  return { entry, errorCode }
}

type AuthContextValue = {
  user: AuthUser | null
  isLoading: boolean
  isAuthOpen: boolean
  openAuth: (options?: OpenAuthOptions) => void
  closeAuth: () => void
  signOut: () => Promise<void>
  refreshSession: () => Promise<void>
}

const SESSION_FETCH_TIMEOUT_MS = 10_000
const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

async function fetchSessionWithTimeout() {
  return fetchWithTimeout(
    API_ROUTES.auth.session,
    {
      credentials: 'include',
      cache: 'no-store',
    },
    SESSION_FETCH_TIMEOUT_MS,
  )
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [prompt, setPrompt] = useState<AuthPrompt>({ open: false })
  const [entry, setEntry] = useState<AuthEntry | null>(null)
  const dialogRef = useRef<HTMLDivElement>(null)

  const refreshSession = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await fetchSessionWithTimeout()
      const payload: unknown = await response.json().catch(() => null)
      if (!response.ok) throw new Error(apiErrorMessage(payload, 'Unable to refresh session.'))
      if (!isSessionResponse(payload)) throw new Error('Session API returned an invalid response.')
      setUser(payload.user)
    } catch (error) {
      console.error('Unable to refresh the authenticated session.', error)
      setUser((current) => current)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void refreshSession()
  }, [refreshSession])

  useEffect(() => {
    const parsed = readAuthParams()
    if (!parsed) return
    if (parsed.errorCode) toast(authErrorMessage(parsed.errorCode), { tone: 'error' })
    setEntry(parsed.entry)
  }, [])

  useEffect(() => {
    if (!entry || isLoading) return
    setEntry(null)

    if (user) {
      if (entry.redirect) router.replace(entry.redirect)
      return
    }

    setPrompt({
      open: true,
      inviteToken: entry.inviteToken,
      redirect: entry.redirect,
    })
  }, [entry, isLoading, router, user])

  const openAuth = useCallback((options?: OpenAuthOptions) => {
    setPrompt({
      open: true,
      message: options?.message,
      inviteToken: options?.inviteToken,
      redirect: options?.redirect,
    })
  }, [])

  const closeAuth = useCallback(() => {
    setPrompt((current) => ({ ...current, open: false }))
  }, [])

  useEffect(() => {
    if (!prompt.open) return

    const dialog = dialogRef.current
    if (!dialog) return
    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null

    const focusableElements = () =>
      Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        (element) => element.getAttribute('aria-hidden') !== 'true',
      )

    const initialFocus =
      dialog.querySelector<HTMLElement>('input:not([disabled])') ?? focusableElements()[0] ?? dialog
    initialFocus.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeAuth()
        return
      }

      if (event.key !== 'Tab') return
      const focusable = focusableElements()
      if (focusable.length === 0) {
        event.preventDefault()
        dialog.focus()
        return
      }

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const active = document.activeElement
      if (event.shiftKey && (active === first || !dialog.contains(active))) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && (active === last || !dialog.contains(active))) {
        event.preventDefault()
        first.focus()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      previouslyFocused?.focus()
    }
  }, [closeAuth, prompt.open])

  const signOut = useCallback(async () => {
    try {
      const response = await fetchWithTimeout(
        API_ROUTES.auth.signOut,
        { method: 'POST', credentials: 'include' },
        SESSION_FETCH_TIMEOUT_MS,
      )
      if (!response.ok) throw new Error('Unable to sign out.')
      setUser(null)
    } catch {
      toast('Unable to sign out. Please try again.', { tone: 'error' })
    }
  }, [])

  const value = useMemo(
    () => ({
      user,
      isLoading,
      isAuthOpen: prompt.open,
      openAuth,
      closeAuth,
      signOut,
      refreshSession,
    }),
    [closeAuth, isLoading, openAuth, prompt.open, refreshSession, signOut, user],
  )

  return (
    <AuthContext.Provider value={value}>
      {children}
      <AnimatePresence>
        {prompt.open && (
          <motion.div
            key="auth-dialog"
            ref={dialogRef}
            role="dialog"
            aria-labelledby="auth-dialog-title"
            aria-describedby="auth-dialog-description"
            aria-modal="true"
            tabIndex={-1}
            className="fixed inset-0 z-[80] flex items-center justify-center bg-black/55 px-4 py-6 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) closeAuth()
            }}
          >
            <AuthPanel
              message={prompt.message}
              inviteToken={prompt.inviteToken}
              redirect={prompt.redirect}
              onClose={closeAuth}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside AuthProvider')
  return value
}
