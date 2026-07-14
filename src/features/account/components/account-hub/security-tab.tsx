'use client'

import { Icon } from '@iconify/react'
import { AnimatePresence, motion } from 'framer-motion'
import { type Dispatch, type SetStateAction, useState } from 'react'
import { Button } from '@/components/ui/button'
import { cardVariants } from '@/components/ui/card'
import { DataPanel as Panel } from '@/components/ui/data-panel'
import { Input } from '@/components/ui/input'
import { StatusPill } from '@/components/ui/status-pill'
import { toast } from '@/components/ui/toast'
import { API_ROUTES } from '@/config/routes'
import {
  ACCOUNT_HUB_ICON_BUTTON_CLASS,
  ACCOUNT_HUB_LIST_ITEM_EXIT,
  ACCOUNT_HUB_LIST_ITEM_LAYOUT,
} from '@/features/account/components/account-hub/account-hub-elements'
import { postAccountApi } from '@/features/account/api/account-api-client'
import type { AccountOverview } from '@/features/account/types/account-hub'
import { formatWhen } from '@/features/account/utils/account-formatters'
import { isAuthUser } from '@/features/auth/utils/auth-response-validation'
import { isRecord } from '@/lib/api/input-normalization'
import { cn } from '@/utils/cn'

export function SecurityTab({
  overview,
  setOverview,
  profileName,
  setProfileName,
  profileEmail,
  setProfileEmail,
  deleteConfirm,
  setDeleteConfirm,
  refreshSession,
  signOut,
  loadOverview,
  removeSession,
}: {
  overview: AccountOverview
  setOverview: Dispatch<SetStateAction<AccountOverview | null>>
  profileName: string
  setProfileName: (value: string) => void
  profileEmail: string
  setProfileEmail: (value: string) => void
  deleteConfirm: string
  setDeleteConfirm: (value: string) => void
  refreshSession: () => void | Promise<void>
  signOut: () => void | Promise<void>
  loadOverview: () => Promise<void>
  removeSession: (session: AccountOverview['sessions'][number]) => Promise<void>
}) {
  const [pendingAction, setPendingAction] = useState<
    'profile' | 'other-sessions' | 'all-sessions' | 'delete-account' | null
  >(null)

  return (
    <div className="grid gap-5">
      <Panel icon="ri:user-3-line" title="Profile" scrollable={false} bodyClassName="space-y-3 p-4">
        <form
          className="space-y-3"
          onSubmit={async (event) => {
            event.preventDefault()
            if (pendingAction) return
            setPendingAction('profile')
            try {
              const payload = await postAccountApi(API_ROUTES.account.profile, {
                name: profileName,
                email: profileEmail,
              })
              if (!isRecord(payload) || !isAuthUser(payload.user)) {
                toast('Account API returned an invalid profile response.', { tone: 'error' })
                return
              }
              await refreshSession()
              toast('Profile updated')
              setOverview({ ...overview, user: payload.user })
            } catch {
              // The shared API client already reports the server error.
            } finally {
              setPendingAction(null)
            }
          }}
        >
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">Name</span>
            <Input
              value={profileName}
              onChange={(event) => setProfileName(event.target.value)}
              autoComplete="name"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">Email</span>
            <Input
              type="email"
              value={profileEmail}
              onChange={(event) => setProfileEmail(event.target.value)}
              autoComplete="email"
              aria-describedby="profile-email-help"
              disabled
            />
            <span id="profile-email-help" className="block text-xs text-muted-foreground">
              Email changes require verification and are currently disabled.
            </span>
          </label>
          <Button
            type="submit"
            variant="primary"
            className="self-start"
            disabled={pendingAction !== null}
          >
            {pendingAction === 'profile' ? 'Saving...' : 'Save profile'}
          </Button>
        </form>
      </Panel>

      <Panel
        icon="ri:device-line"
        title="Sessions"
        count={overview.sessions.length}
        className="h-[24rem]"
        bodyClassName="space-y-2 p-3"
        right={
          <div className="flex shrink-0 items-center gap-2">
            <Button
              size="sm"
              disabled={pendingAction !== null}
              onClick={async () => {
                if (pendingAction) return
                setPendingAction('other-sessions')
                try {
                  await postAccountApi(API_ROUTES.account.sessionsSignOut, {})
                  toast('Other sessions signed out')
                  await loadOverview()
                } catch {
                  // The shared API client already reports the server error.
                } finally {
                  setPendingAction(null)
                }
              }}
            >
              <Icon icon="ri:logout-circle-line" className="h-3.5 w-3.5" />
              Other devices
            </Button>
            <Button
              size="sm"
              disabled={pendingAction !== null}
              onClick={async () => {
                if (pendingAction) return
                setPendingAction('all-sessions')
                try {
                  await postAccountApi(API_ROUTES.account.sessionsSignOut, {
                    includeCurrent: true,
                  })
                  await signOut()
                } catch {
                  // The shared API client already reports the server error.
                } finally {
                  setPendingAction(null)
                }
              }}
            >
              <Icon icon="ri:logout-box-r-line" className="h-3.5 w-3.5" />
              Everywhere
            </Button>
          </div>
        }
      >
        <AnimatePresence mode="popLayout">
          {overview.sessions.map((session) => (
            <motion.div
              key={session.id}
              layout
              exit={ACCOUNT_HUB_LIST_ITEM_EXIT}
              transition={{ layout: ACCOUNT_HUB_LIST_ITEM_LAYOUT }}
              className={cardVariants({ className: 'flex items-center gap-3 p-3 text-sm' })}
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-foreground">
                  {session.userAgent || 'Unknown client'}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Last seen {formatWhen(session.lastSeenAt)}
                </div>
              </div>
              {session.current ? (
                <StatusPill tone="success" size="sm" className="shrink-0">
                  Current
                </StatusPill>
              ) : (
                <button
                  type="button"
                  onClick={() => void removeSession(session)}
                  aria-label={`Sign out ${session.userAgent || 'this session'}`}
                  title="Sign out this session"
                  className={cn(
                    ACCOUNT_HUB_ICON_BUTTON_CLASS,
                    'hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive',
                  )}
                >
                  <Icon icon="ri:close-line" className="h-4 w-4" />
                </button>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </Panel>

      <Panel
        icon="ri:alert-line"
        title="Delete account"
        scrollable={false}
        className="border-destructive/30 bg-destructive/5"
        bodyClassName="space-y-3 p-4"
      >
        <form
          className="space-y-3"
          onSubmit={async (event) => {
            event.preventDefault()
            if (pendingAction) return
            setPendingAction('delete-account')
            try {
              await postAccountApi(API_ROUTES.account.delete, { confirmEmail: deleteConfirm })
              await signOut()
            } catch {
              // The shared API client already reports the server error.
            } finally {
              setPendingAction(null)
            }
          }}
        >
          <p className="text-sm text-muted-foreground">
            This removes your saved repos, collections, follows, preferences and sessions. Type your
            account email to confirm.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              type="email"
              value={deleteConfirm}
              onChange={(event) => setDeleteConfirm(event.target.value)}
              placeholder={overview.user.email}
              autoComplete="off"
              aria-label="Confirm account email"
            />
            <Button
              type="submit"
              variant="destructive"
              className="px-4"
              disabled={pendingAction !== null}
            >
              <Icon icon="ri:delete-bin-line" className="h-4 w-4" />
              {pendingAction === 'delete-account' ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </form>
      </Panel>
    </div>
  )
}
