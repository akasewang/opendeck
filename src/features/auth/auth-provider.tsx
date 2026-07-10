'use client'

import { AnimatePresence, motion } from 'framer-motion'
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import AuthPanel from '@/features/auth/auth-panel'
import type { AuthUser } from '@/lib/auth'

type AuthPrompt = {
  open: boolean
  message?: string
}

type OpenAuthOptions = {
  message?: string
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

async function fetchSessionWithTimeout() {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), SESSION_FETCH_TIMEOUT_MS)
  try {
    return await fetch('/api/auth/session', {
      credentials: 'include',
      cache: 'no-store',
      signal: controller.signal,
    })
  } finally {
    window.clearTimeout(timeout)
  }
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [prompt, setPrompt] = useState<AuthPrompt>({ open: false })

  const refreshSession = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await fetchSessionWithTimeout()
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error || 'Unable to refresh session.')
      setUser(payload?.user ?? null)
    } catch {
      setUser((current) => current)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void refreshSession()
  }, [refreshSession])

  const openAuth = useCallback((options?: OpenAuthOptions) => {
    setPrompt({ open: true, message: options?.message })
  }, [])

  const closeAuth = useCallback(() => {
    setPrompt((current) => ({ ...current, open: false }))
  }, [])

  useEffect(() => {
    if (!prompt.open) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeAuth()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [closeAuth, prompt.open])

  const signOut = useCallback(async () => {
    await fetch('/api/auth/sign-out', { method: 'POST', credentials: 'include' }).catch(() => null)
    setUser(null)
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
            role="dialog"
            aria-label="Authentication"
            aria-modal="true"
            className="fixed inset-0 z-[80] flex items-center justify-center bg-black/55 px-4 py-6 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) closeAuth()
            }}
          >
            <AuthPanel message={prompt.message} onClose={closeAuth} />
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
