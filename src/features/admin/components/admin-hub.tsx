'use client'

import { Icon } from '@iconify/react'
import { AnimatePresence, motion, type TargetAndTransition, type Variants } from 'framer-motion'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, cardVariants } from '@/components/ui/card'
import {
  DataPanel,
  type DataPanelProps,
  DataPanelEmpty as PanelEmpty,
} from '@/components/ui/data-panel'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorBanner } from '@/components/ui/error-banner'
import { Input } from '@/components/ui/input'
import Select from '@/components/ui/select'
import { Skeleton, SkeletonPanel } from '@/components/ui/skeleton'
import { StatusPill } from '@/components/ui/status-pill'
import { toast } from '@/components/ui/toast'
import { API_ROUTES } from '@/config/routes'
import {
  MOTION_DURATION_SECONDS,
  MOTION_EASING,
  MOTION_SPRING,
  MOTION_STAGGER_STEP_SECONDS,
} from '@/config/motion'
import { getAdminApi, postAdminApi } from '@/features/admin/api/admin-api-client'
import type {
  AdminAllowlistRule,
  AdminIngestionDashboard,
  AdminInvite,
  AdminUser,
} from '@/features/admin/types/admin-api'
import {
  isAdminIngestionDashboard,
  isAdminInviteResponse,
  isAdminSecurityResponse,
  isAdminUsersResponse,
} from '@/features/admin/utils/admin-response-validation'
import { useAuth } from '@/features/auth/providers/auth-provider'
import PageHeader from '@/features/dashboard/components/page-header'
import PageShell from '@/features/dashboard/components/page-shell'
import { ApiError } from '@/lib/api/errors'
import { cn } from '@/utils/cn'

const STICKY_TH =
  'sticky top-0 z-10 whitespace-nowrap border-b border-b-row-divider bg-sidebar px-3 py-2 text-left text-2xs font-semibold uppercase tracking-normal text-muted-foreground/70 transition-shadow group-data-[scrolled]/scroll:shadow-table-header'

const ADMIN_HUB_SECTION_STAGGER: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05, delayChildren: 0.03 } },
}

const ADMIN_HUB_SECTION_ITEM: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: MOTION_SPRING.standard },
}

const ADMIN_HUB_LIST_ITEM_EXIT: TargetAndTransition = {
  opacity: 0,
  scale: 0.96,
  transition: { duration: MOTION_DURATION_SECONDS.standard, ease: MOTION_EASING.exit },
}

const ADMIN_HUB_LIST_ITEM_LAYOUT = MOTION_SPRING.layout

function Panel({ ...props }: Omit<DataPanelProps, 'variants'>) {
  return <DataPanel variants={ADMIN_HUB_SECTION_ITEM} {...props} />
}

export default function AdminHub() {
  const { user, isLoading, openAuth } = useAuth()
  const activeAdminIdRef = useRef<string | null>(null)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [invites, setInvites] = useState<AdminInvite[]>([])
  const [allowlist, setAllowlist] = useState<AdminAllowlistRule[]>([])
  const [ingestion, setIngestion] = useState<AdminIngestionDashboard | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('user')
  const [createdInviteToken, setCreatedInviteToken] = useState<string | null>(null)
  const [allowPattern, setAllowPattern] = useState('')
  const [allowKind, setAllowKind] = useState('email')
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [pendingAction, setPendingAction] = useState<string | null>(null)
  const [copiedInvite, setCopiedInvite] = useState(false)

  const isBusy = pendingAction !== null

  const load = useCallback(async () => {
    const requestedAdminId = activeAdminIdRef.current
    if (!requestedAdminId) {
      setIsLoadingData(false)
      return
    }

    setError(null)
    try {
      const [userPayload, securityPayload, ingestionPayload] = await Promise.all([
        getAdminApi(API_ROUTES.admin.users),
        getAdminApi(API_ROUTES.admin.security),
        getAdminApi(API_ROUTES.admin.ingestion),
      ])
      if (
        !isAdminUsersResponse(userPayload) ||
        !isAdminSecurityResponse(securityPayload) ||
        !isAdminIngestionDashboard(ingestionPayload)
      ) {
        throw new Error('Admin API returned an invalid response.')
      }
      if (activeAdminIdRef.current !== requestedAdminId) return
      setUsers(userPayload.users ?? [])
      setInvites(securityPayload.invites ?? [])
      setAllowlist(securityPayload.allowlist ?? [])
      setIngestion(ingestionPayload)
    } catch (nextError) {
      if (activeAdminIdRef.current !== requestedAdminId) return
      setError(nextError instanceof Error ? nextError.message : 'Unable to load admin tools.')
    } finally {
      if (activeAdminIdRef.current === requestedAdminId) setIsLoadingData(false)
    }
  }, [])

  useEffect(() => {
    const isAdmin = user?.role === 'admin'
    activeAdminIdRef.current = isAdmin ? user.id : null
    setUsers([])
    setInvites([])
    setAllowlist([])
    setIngestion(null)
    setError(null)
    setCreatedInviteToken(null)
    setIsLoadingData(isAdmin)
  }, [user?.id, user?.role])

  useEffect(() => {
    const adminId = user?.id
    if (!isLoading && adminId && user?.role === 'admin') void load()
  }, [isLoading, load, user?.id, user?.role])

  useEffect(() => {
    if (!copiedInvite) return
    const timer = setTimeout(() => setCopiedInvite(false), 1600)
    return () => clearTimeout(timer)
  }, [copiedInvite])

  const runAction = async (key: string, action: () => Promise<void>) => {
    if (pendingAction) return
    setPendingAction(key)
    try {
      await action()
    } catch (actionError) {
      if (!(actionError instanceof ApiError)) {
        toast(actionError instanceof Error ? actionError.message : 'Admin action failed.', {
          tone: 'error',
        })
      }
    } finally {
      setPendingAction(null)
    }
  }

  const removeAllowlistRule = async (rule: AdminAllowlistRule) => {
    const index = allowlist.findIndex((item) => item.id === rule.id)
    if (index < 0) return

    setAllowlist((current) => current.filter((item) => item.id !== rule.id))

    try {
      await postAdminApi(API_ROUTES.admin.allowlistDelete, { id: rule.id })
      toast('Allowlist rule removed')
      void load()
    } catch {
      setAllowlist((current) => {
        const next = [...current]
        next.splice(index, 0, rule)
        return next
      })
    }
  }

  if (isLoading || (user?.role === 'admin' && isLoadingData)) {
    return (
      <PageShell aria-busy="true" className="space-y-5">
        <h1 className="sr-only">Loading admin</h1>
        <div className="flex min-w-0 flex-col gap-1.5">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-3.5 w-full max-w-xl" />
        </div>
        <SkeletonPanel className="h-[26rem]" />
        <div className="grid gap-5 xl:grid-cols-2">
          <SkeletonPanel className="h-52" />
          <SkeletonPanel className="h-52" />
        </div>
        <div className="grid gap-5 xl:grid-cols-2">
          <SkeletonPanel className="h-[22rem]" />
          <SkeletonPanel className="h-[22rem]" />
        </div>
      </PageShell>
    )
  }

  if (!user) {
    return (
      <PageShell>
        <h1 className="sr-only">Admin</h1>
        <EmptyState
          icon="ri:shield-user-line"
          title="Admin access only"
          description="Sign in as an admin to manage users, invites and allowlist rules."
          className="mx-auto mt-10 max-w-xl py-14"
        >
          <Button variant="primary" onClick={() => openAuth()}>
            <Icon icon="ri:login-circle-line" className="h-4 w-4" />
            Sign in
          </Button>
        </EmptyState>
      </PageShell>
    )
  }

  if (user.role !== 'admin') {
    return (
      <PageShell>
        <h1 className="sr-only">Admin</h1>
        <ErrorBanner icon="ri:lock-line" message="Admin access is required." />
      </PageShell>
    )
  }

  return (
    <PageShell className="space-y-5">
      <motion.div
        variants={ADMIN_HUB_SECTION_STAGGER}
        initial="hidden"
        animate="show"
        className="space-y-5"
      >
        <motion.div variants={ADMIN_HUB_SECTION_ITEM}>
          <PageHeader
            title="Admin"
            description="Manage user roles, suspensions, invite-only onboarding and email allowlist rules."
          />
        </motion.div>

        <AnimatePresence>
          {error && <ErrorBanner message={error} onRetry={() => void load()} />}
        </AnimatePresence>

        <Panel icon="ri:team-line" title="Users" count={users.length} className="h-[26rem]">
          <table className="w-full min-w-[48rem] border-separate border-spacing-0 text-sm">
            <caption className="sr-only">Admin users</caption>
            <thead>
              <tr>
                <th scope="col" className={STICKY_TH}>
                  User
                </th>
                <th scope="col" className={STICKY_TH}>
                  Role
                </th>
                <th scope="col" className={STICKY_TH}>
                  Status
                </th>
                <th scope="col" className={STICKY_TH}>
                  Sessions
                </th>
                <th scope="col" className={STICKY_TH}>
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {users.map((row, index) => {
                  const roleKey = `role:${row.id}`
                  const statusKey = `status:${row.id}`
                  const deleteKey = `delete:${row.id}`

                  return (
                    <motion.tr
                      key={row.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{
                        opacity: 0,
                        transition: { duration: MOTION_DURATION_SECONDS.short },
                      }}
                      transition={{
                        duration: MOTION_DURATION_SECONDS.moderate,
                        delay: Math.min(index, 12) * MOTION_STAGGER_STEP_SECONDS,
                        ease: MOTION_EASING.standard,
                      }}
                      className="transition-colors hover:bg-row-hover"
                    >
                      <td className="border-b border-border/40 px-3 py-2">
                        <div className="font-medium text-foreground">{row.name}</div>
                        <div className="text-xs text-muted-foreground">{row.email}</div>
                      </td>
                      <td className="border-b border-border/40 px-3 py-2">
                        <Select
                          value={row.role}
                          disabled={isBusy}
                          onChange={(event) => {
                            const role = event.target.value
                            void runAction(roleKey, async () => {
                              await postAdminApi(API_ROUTES.admin.users, {
                                userId: row.id,
                                role,
                                status: row.status,
                              })
                              toast('User role updated')
                              await load()
                            })
                          }}
                          options={[
                            { value: 'user', label: 'User' },
                            { value: 'admin', label: 'Admin' },
                          ]}
                          placeholder="Role"
                          clearable={false}
                          className="w-32"
                        />
                      </td>
                      <td className="border-b border-border/40 px-3 py-2">
                        <StatusPill tone={row.status === 'active' ? 'success' : 'destructive'}>
                          {row.status}
                        </StatusPill>
                      </td>
                      <td className="border-b border-border/40 px-3 py-2 font-mono tabular-nums">
                        {row.sessionCount}
                      </td>
                      <td className="border-b border-border/40 px-3 py-2">
                        <div className="flex items-center gap-2">
                          <Button
                            disabled={isBusy}
                            onClick={() =>
                              void runAction(statusKey, async () => {
                                await postAdminApi(API_ROUTES.admin.users, {
                                  userId: row.id,
                                  role: row.role,
                                  status: row.status === 'active' ? 'suspended' : 'active',
                                })
                                toast('User status updated')
                                await load()
                              })
                            }
                          >
                            {pendingAction === statusKey && (
                              <Icon icon="ri:loader-4-line" className="h-4 w-4 animate-spin" />
                            )}
                            {row.status === 'active' ? 'Suspend' : 'Activate'}
                          </Button>
                          <Button
                            disabled={isBusy}
                            onClick={() => {
                              if (
                                !window.confirm(
                                  `Permanently delete ${row.email}? This removes the account and all of its data.`,
                                )
                              )
                                return

                              void runAction(deleteKey, async () => {
                                await postAdminApi(API_ROUTES.admin.userDelete, { userId: row.id })
                                toast('User deleted')
                                await load()
                              })
                            }}
                            className="text-destructive hover:border-destructive/50 hover:bg-destructive/10"
                          >
                            {pendingAction === deleteKey && (
                              <Icon icon="ri:loader-4-line" className="h-4 w-4 animate-spin" />
                            )}
                            Delete
                          </Button>
                        </div>
                      </td>
                    </motion.tr>
                  )
                })}
              </AnimatePresence>
            </tbody>
          </table>
        </Panel>

        <div className="grid items-start gap-5 xl:grid-cols-2">
          <Panel icon="ri:user-add-line" title="Create invite" bodyClassName="p-4">
            <form
              className="space-y-3"
              onSubmit={(event) => {
                event.preventDefault()
                void runAction('create-invite', async () => {
                  const payload = await postAdminApi(API_ROUTES.admin.invites, {
                    email: inviteEmail,
                    role: inviteRole,
                  })
                  if (!isAdminInviteResponse(payload)) {
                    throw new Error('Admin API returned an invalid invite response.')
                  }
                  setCreatedInviteToken(payload.invite.token)
                  setInviteEmail('')
                  toast('Invite created')
                  await load()
                })
              }}
            >
              <Input
                type="email"
                value={inviteEmail}
                onChange={(event) => setInviteEmail(event.target.value)}
                placeholder="Email, optional"
                aria-label="Invite email"
                autoComplete="off"
                disabled={isBusy}
              />
              <Select
                value={inviteRole}
                onChange={(event) => setInviteRole(event.target.value)}
                options={[
                  { value: 'user', label: 'User' },
                  { value: 'admin', label: 'Admin' },
                ]}
                placeholder="Invite role"
                clearable={false}
                disabled={isBusy}
              />
              <Button type="submit" variant="primary" disabled={isBusy}>
                <Icon
                  icon={pendingAction === 'create-invite' ? 'ri:loader-4-line' : 'ri:user-add-line'}
                  className={cn('h-4 w-4', pendingAction === 'create-invite' && 'animate-spin')}
                />
                Create invite
              </Button>
              <AnimatePresence>
                {createdInviteToken && (
                  <motion.button
                    key="invite-link"
                    type="button"
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{
                      duration: MOTION_DURATION_SECONDS.standard,
                      ease: MOTION_EASING.standard,
                    }}
                    onClick={async () => {
                      if (!navigator.clipboard) {
                        toast('Clipboard is unavailable in this browser.', { tone: 'error' })
                        return
                      }

                      try {
                        await navigator.clipboard.writeText(
                          `${window.location.origin}/?invite=${createdInviteToken}`,
                        )
                        setCopiedInvite(true)
                        toast('Invite link copied')
                      } catch {
                        toast('Unable to copy the invite link.', { tone: 'error' })
                      }
                    }}
                    className="group flex w-full items-center justify-between gap-2 rounded-md border border-success/30 bg-success/10 p-2.5 text-left text-sm text-success transition-colors hover:bg-success/15"
                  >
                    <span className="min-w-0 truncate font-mono text-xs">
                      /?invite={createdInviteToken}
                    </span>
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.span
                        key={copiedInvite ? 'copied' : 'copy'}
                        initial={{ opacity: 0, scale: 0.6 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.6 }}
                        transition={{
                          duration: MOTION_DURATION_SECONDS.fast,
                          ease: MOTION_EASING.standard,
                        }}
                        className="flex shrink-0 opacity-60 transition-opacity group-hover:opacity-100"
                      >
                        <Icon
                          icon={copiedInvite ? 'ri:check-line' : 'ri:file-copy-line'}
                          className="h-3.5 w-3.5"
                        />
                      </motion.span>
                    </AnimatePresence>
                  </motion.button>
                )}
              </AnimatePresence>
            </form>
          </Panel>

          <Panel icon="ri:shield-check-line" title="Allowlist" bodyClassName="p-4">
            <form
              className="space-y-3"
              onSubmit={(event) => {
                event.preventDefault()
                void runAction('add-rule', async () => {
                  await postAdminApi(API_ROUTES.admin.allowlist, {
                    pattern: allowPattern,
                    kind: allowKind,
                  })
                  setAllowPattern('')
                  toast('Allowlist rule saved')
                  await load()
                })
              }}
            >
              <Input
                value={allowPattern}
                onChange={(event) => setAllowPattern(event.target.value)}
                placeholder="person@example.com or example.com"
                aria-label="Allowlist email or domain"
                autoComplete="off"
                disabled={isBusy}
              />
              <Select
                value={allowKind}
                onChange={(event) => setAllowKind(event.target.value)}
                options={[
                  { value: 'email', label: 'Email' },
                  { value: 'domain', label: 'Domain' },
                ]}
                placeholder="Rule type"
                clearable={false}
                disabled={isBusy}
              />
              <Button type="submit" variant="primary" disabled={isBusy}>
                <Icon
                  icon={pendingAction === 'add-rule' ? 'ri:loader-4-line' : 'ri:shield-check-line'}
                  className={cn('h-4 w-4', pendingAction === 'add-rule' && 'animate-spin')}
                />
                Add rule
              </Button>
            </form>
          </Panel>
        </div>

        <div className="grid items-start gap-5 xl:grid-cols-2">
          <Panel
            icon="ri:mail-line"
            title="Open invites"
            count={invites.length}
            className="h-[22rem]"
            bodyClassName="p-3"
          >
            {invites.length === 0 ? (
              <PanelEmpty>
                <EmptyState
                  icon="ri:mail-add-line"
                  title="No open invites"
                  description="Invites you create will show up here with their expiry."
                />
              </PanelEmpty>
            ) : (
              <motion.div variants={ADMIN_HUB_SECTION_STAGGER} className="space-y-2">
                {invites.map((invite) => {
                  const expired = !invite.acceptedAt && new Date(invite.expiresAt) < new Date()
                  return (
                    <motion.div
                      key={invite.id}
                      variants={ADMIN_HUB_SECTION_ITEM}
                      className={cardVariants({ className: 'p-3 text-sm' })}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="truncate font-medium text-foreground">
                          {invite.email || 'Any email'}
                        </div>
                        {invite.acceptedAt ? (
                          <StatusPill tone="success" size="sm" className="shrink-0">
                            Accepted
                          </StatusPill>
                        ) : expired ? (
                          <StatusPill tone="destructive" size="sm" className="shrink-0">
                            Expired
                          </StatusPill>
                        ) : null}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {invite.role} · {expired ? 'expired' : 'expires'}{' '}
                        {new Date(invite.expiresAt).toLocaleDateString()}
                      </div>
                    </motion.div>
                  )
                })}
              </motion.div>
            )}
          </Panel>

          <Panel
            icon="ri:shield-keyhole-line"
            title="Allowlist rules"
            count={allowlist.length}
            className="h-[22rem]"
            bodyClassName="p-3"
          >
            {allowlist.length === 0 ? (
              <PanelEmpty>
                <EmptyState
                  icon="ri:shield-check-line"
                  title="No allowlist rules"
                  description="Without rules, any email may sign up unless invite-only mode is on."
                />
              </PanelEmpty>
            ) : (
              <div className="relative space-y-2">
                <AnimatePresence mode="popLayout">
                  {allowlist.map((rule) => (
                    <motion.div
                      key={rule.id}
                      layout
                      exit={ADMIN_HUB_LIST_ITEM_EXIT}
                      transition={{ layout: ADMIN_HUB_LIST_ITEM_LAYOUT }}
                      className={cardVariants({
                        className: 'flex items-center justify-between gap-3 p-3 text-sm',
                      })}
                    >
                      <div className="min-w-0">
                        <div className="truncate font-medium text-foreground">{rule.pattern}</div>
                        <div className="text-xs capitalize text-muted-foreground">{rule.kind}</div>
                      </div>
                      <Button
                        aria-label={`Remove ${rule.pattern}`}
                        disabled={isBusy}
                        onClick={() => void removeAllowlistRule(rule)}
                        className="text-muted-foreground hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Icon icon="ri:delete-bin-line" className="h-4 w-4" />
                      </Button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </Panel>
        </div>

        {ingestion && (
          <>
            <motion.section variants={ADMIN_HUB_SECTION_ITEM} className="space-y-3">
              <h2 className="text-sm font-semibold text-foreground">Ingestion and delivery</h2>
              <motion.div
                variants={ADMIN_HUB_SECTION_STAGGER}
                className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5"
              >
                {[
                  { label: 'Repos', value: ingestion.stats.repos },
                  { label: 'Users', value: ingestion.stats.users },
                  { label: 'Saved searches', value: ingestion.stats.savedSearches },
                  { label: 'Shared collections', value: ingestion.stats.sharedCollections },
                  { label: 'Emails sent', value: ingestion.stats.emailDeliveries.sent ?? 0 },
                ].map(({ label, value }) => (
                  <motion.div
                    key={label}
                    variants={ADMIN_HUB_SECTION_ITEM}
                    className={cardVariants({ className: 'px-4 py-3' })}
                  >
                    <div className="text-xs font-medium text-muted-foreground">{label}</div>
                    <div className="mt-2 font-mono text-xl font-semibold tabular-nums text-foreground">
                      {value.toLocaleString()}
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </motion.section>

            <Panel
              icon="ri:database-2-line"
              title="Ingestion runs"
              count={ingestion.latestRuns.length}
              className="h-[22rem]"
            >
              <table className="w-full min-w-[44rem] border-separate border-spacing-0 text-sm">
                <caption className="sr-only">Ingestion runs</caption>
                <thead>
                  <tr>
                    <th scope="col" className={STICKY_TH}>
                      Kind
                    </th>
                    <th scope="col" className={STICKY_TH}>
                      Status
                    </th>
                    <th scope="col" className={STICKY_TH}>
                      Started
                    </th>
                    <th scope="col" className={STICKY_TH}>
                      Tokens
                    </th>
                    <th scope="col" className={STICKY_TH}>
                      Rate limit
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {ingestion.latestRuns.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-3 py-8 text-center text-sm text-muted-foreground"
                      >
                        No ingestion runs recorded yet.
                      </td>
                    </tr>
                  )}
                  {ingestion.latestRuns.map((run, index) => (
                    <motion.tr
                      key={run.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{
                        duration: MOTION_DURATION_SECONDS.moderate,
                        delay: Math.min(index, 12) * MOTION_STAGGER_STEP_SECONDS,
                        ease: MOTION_EASING.standard,
                      }}
                      className="transition-colors hover:bg-row-hover"
                    >
                      <td className="border-b border-border/40 px-3 py-2">{run.kind}</td>
                      <td className="border-b border-border/40 px-3 py-2">
                        <StatusPill
                          tone={
                            run.status === 'success'
                              ? 'success'
                              : run.error || run.status === 'failed' || run.status === 'error'
                                ? 'destructive'
                                : 'neutral'
                          }
                        >
                          {run.status}
                        </StatusPill>
                      </td>
                      <td className="border-b border-border/40 px-3 py-2">
                        {new Date(run.startedAt).toLocaleString()}
                      </td>
                      <td className="border-b border-border/40 px-3 py-2 font-mono tabular-nums">
                        {run.tokensUsed}
                      </td>
                      <td className="border-b border-border/40 px-3 py-2 font-mono tabular-nums">
                        {run.rateLimitRemaining ?? 'n/a'}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </Panel>

            <Panel
              icon="ri:history-line"
              title="Recent admin activity"
              count={ingestion.auditLogs.length}
              className="h-[24rem]"
              bodyClassName="p-3"
            >
              {ingestion.auditLogs.length === 0 ? (
                <PanelEmpty>
                  <EmptyState
                    icon="ri:history-line"
                    title="No admin activity yet"
                    description="Role changes, invites and allowlist edits are audited here."
                  />
                </PanelEmpty>
              ) : (
                <div className="grid gap-2 xl:grid-cols-2">
                  {ingestion.auditLogs.map((log) => (
                    <Card key={log.id} className="p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-foreground">{log.action}</div>
                          <div className="mt-1 truncate text-xs text-muted-foreground">
                            {log.targetType}
                            {log.targetId ? ` · ${log.targetId}` : ''}
                          </div>
                        </div>
                        <div className="shrink-0 text-xs text-muted-foreground">
                          {new Date(log.createdAt).toLocaleString()}
                        </div>
                      </div>
                      {Object.keys(log.metadata ?? {}).length > 0 && (
                        <pre className="mt-2 overflow-x-auto rounded-md bg-muted/40 p-2 text-xs text-muted-foreground">
                          {JSON.stringify(log.metadata, null, 2)}
                        </pre>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </Panel>
          </>
        )}
      </motion.div>
    </PageShell>
  )
}
