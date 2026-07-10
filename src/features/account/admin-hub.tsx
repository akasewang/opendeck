'use client'

import { Icon } from '@iconify/react'
import { motion, type Variants } from 'framer-motion'
import { type ReactNode, useCallback, useEffect, useState } from 'react'
import { INPUT_CLASS, PRIMARY_BUTTON_CLASS } from '@/components/ui/control-styles'
import { EmptyState } from '@/components/ui/empty-state'
import Select from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from '@/components/ui/toast'
import type { AdminUser, AllowlistRule, IngestionDashboard, Invite } from '@/features/account/types'
import { useAuth } from '@/features/auth/auth-provider'
import PageShell from '@/features/dashboard/components/page-shell'
import { cn } from '@/utils/cn'

const BUTTON_CLASS =
  'inline-flex h-9 items-center justify-center gap-2 rounded-md border border-border/40 bg-background px-3 text-sm font-medium text-foreground transition hover:border-border/70 hover:bg-muted-hover active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60'
const STICKY_TH =
  'sticky top-0 z-10 whitespace-nowrap border-b border-border/50 bg-card px-3 py-2 text-left text-xs font-medium text-muted-foreground'

const sectionStagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05, delayChildren: 0.03 } },
}
const sectionItem: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 30 } },
}

async function apiGet(path: string) {
  const response = await fetch(path, { credentials: 'include', cache: 'no-store' })
  const payload = await response.json().catch(() => null)
  if (!response.ok) throw new Error(payload?.error || 'Request failed.')
  return payload
}

async function apiPost(path: string, body: Record<string, unknown>) {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  })
  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    const message = payload?.error || 'Request failed.'
    toast(message, { tone: 'error' })
    throw new Error(message)
  }
  return payload
}

function CountBadge({ value }: { value: number }) {
  if (value <= 0) return null
  return (
    <span className="shrink-0 rounded-sm bg-muted/60 px-1.5 py-0.5 font-mono text-[11px] font-medium text-muted-foreground">
      {value}
    </span>
  )
}

function Panel({
  icon,
  title,
  right,
  className,
  bodyClassName,
  children,
}: {
  icon?: string
  title: string
  right?: ReactNode
  className?: string
  bodyClassName?: string
  children: ReactNode
}) {
  return (
    <motion.section
      variants={sectionItem}
      className={cn(
        'flex min-h-0 flex-col overflow-hidden rounded-lg border border-border/50 bg-background/40',
        className,
      )}
    >
      <div className="flex h-11 shrink-0 items-center justify-between gap-3 border-b border-border/40 px-4">
        <h2 className="flex min-w-0 items-center gap-2 text-sm font-semibold text-foreground">
          {icon && <Icon icon={icon} className="h-4 w-4 shrink-0 text-muted-foreground/70" />}
          <span className="truncate">{title}</span>
        </h2>
        {right}
      </div>
      <div className={cn('min-h-0 flex-1 overflow-auto', bodyClassName)}>{children}</div>
    </motion.section>
  )
}

function PanelEmpty({ children }: { children: ReactNode }) {
  return <div className="flex h-full items-center justify-center p-4">{children}</div>
}

export default function AdminHub() {
  const { user, isLoading, openAuth } = useAuth()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [invites, setInvites] = useState<Invite[]>([])
  const [allowlist, setAllowlist] = useState<AllowlistRule[]>([])
  const [ingestion, setIngestion] = useState<IngestionDashboard | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('user')
  const [createdInviteToken, setCreatedInviteToken] = useState<string | null>(null)
  const [allowPattern, setAllowPattern] = useState('')
  const [allowKind, setAllowKind] = useState('email')
  const [isLoadingData, setIsLoadingData] = useState(true)

  const load = useCallback(async () => {
    setError(null)
    try {
      const [userPayload, securityPayload, ingestionPayload] = await Promise.all([
        apiGet('/api/admin/users'),
        apiGet('/api/admin/security'),
        apiGet('/api/admin/ingestion'),
      ])
      setUsers(userPayload.users ?? [])
      setInvites(securityPayload.invites ?? [])
      setAllowlist(securityPayload.allowlist ?? [])
      setIngestion(ingestionPayload)
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Unable to load admin tools.')
    } finally {
      setIsLoadingData(false)
    }
  }, [])

  useEffect(() => {
    if (!isLoading && user?.role === 'admin') void load()
  }, [isLoading, load, user?.role])

  if (isLoading || (user?.role === 'admin' && isLoadingData)) {
    return (
      <PageShell className="space-y-5">
        <div className="space-y-2">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-full max-w-xl" />
        </div>
        <Skeleton className="h-[26rem] rounded-lg" />
        <div className="grid gap-5 xl:grid-cols-2">
          <Skeleton className="h-52 rounded-lg" />
          <Skeleton className="h-52 rounded-lg" />
        </div>
        <div className="grid gap-5 xl:grid-cols-2">
          <Skeleton className="h-[22rem] rounded-lg" />
          <Skeleton className="h-[22rem] rounded-lg" />
        </div>
      </PageShell>
    )
  }

  if (!user) {
    return (
      <PageShell>
        <EmptyState
          icon="ri:shield-user-line"
          title="Admin access only"
          description="Sign in as an admin to manage users, invites and allowlist rules."
          className="mx-auto mt-10 max-w-xl py-14"
        >
          <button type="button" onClick={() => openAuth()} className={PRIMARY_BUTTON_CLASS}>
            <Icon icon="ri:login-circle-line" className="h-4 w-4" />
            Sign in
          </button>
        </EmptyState>
      </PageShell>
    )
  }

  if (user.role !== 'admin') {
    return (
      <PageShell>
        <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <Icon icon="ri:lock-line" className="h-4 w-4 shrink-0" />
          Admin access is required.
        </div>
      </PageShell>
    )
  }

  return (
    <PageShell className="space-y-5">
      <motion.div variants={sectionStagger} initial="hidden" animate="show" className="space-y-5">
        <motion.div variants={sectionItem}>
          <h1 className="text-lg font-medium text-primary">Admin</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Manage user roles, suspensions, invite-only onboarding and email allowlist rules.
          </p>
        </motion.div>

        {error && (
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            <Icon icon="ri:error-warning-line" className="h-4 w-4 shrink-0" />
            <span className="min-w-0 flex-1">{error}</span>
            <button type="button" onClick={() => void load()} className={BUTTON_CLASS}>
              <Icon icon="ri:refresh-line" className="h-4 w-4" />
              Retry
            </button>
          </div>
        )}

        <Panel
          icon="ri:team-line"
          title="Users"
          right={<CountBadge value={users.length} />}
          className="h-[26rem]"
        >
          <table className="w-full min-w-[48rem] border-separate border-spacing-0 text-sm">
            <thead>
              <tr>
                <th className={STICKY_TH}>User</th>
                <th className={STICKY_TH}>Role</th>
                <th className={STICKY_TH}>Status</th>
                <th className={STICKY_TH}>Sessions</th>
                <th className={STICKY_TH}>Action</th>
              </tr>
            </thead>
            <tbody>
              {users.map((row) => (
                <tr key={row.id} className="transition-colors hover:bg-row-hover">
                  <td className="border-b border-border/40 px-3 py-2">
                    <div className="font-medium text-foreground">{row.name}</div>
                    <div className="text-xs text-muted-foreground">{row.email}</div>
                  </td>
                  <td className="border-b border-border/40 px-3 py-2">
                    <Select
                      value={row.role}
                      onChange={async (event) => {
                        await apiPost('/api/admin/users', {
                          userId: row.id,
                          role: event.target.value,
                          status: row.status,
                        })
                        toast('User role updated')
                        await load()
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
                    <span
                      className={cn(
                        'rounded-sm border px-2 py-1 text-xs font-medium capitalize',
                        row.status === 'active'
                          ? 'border-success/30 bg-success/10 text-success'
                          : 'border-destructive/30 bg-destructive/10 text-destructive',
                      )}
                    >
                      {row.status}
                    </span>
                  </td>
                  <td className="border-b border-border/40 px-3 py-2 font-mono tabular-nums">
                    {row.sessionCount}
                  </td>
                  <td className="border-b border-border/40 px-3 py-2">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={async () => {
                          await apiPost('/api/admin/users', {
                            userId: row.id,
                            role: row.role,
                            status: row.status === 'active' ? 'suspended' : 'active',
                          })
                          toast('User status updated')
                          await load()
                        }}
                        className={BUTTON_CLASS}
                      >
                        {row.status === 'active' ? 'Suspend' : 'Activate'}
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          if (
                            !window.confirm(
                              `Permanently delete ${row.email}? This removes the account and all of its data.`,
                            )
                          )
                            return
                          await apiPost('/api/admin/users/delete', { userId: row.id })
                          toast('User deleted')
                          await load()
                        }}
                        className={cn(
                          BUTTON_CLASS,
                          'text-destructive hover:border-destructive/50 hover:bg-destructive/10',
                        )}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>

        <div className="grid items-start gap-5 xl:grid-cols-2">
          <Panel icon="ri:user-add-line" title="Create invite" bodyClassName="p-4">
            <form
              className="space-y-3"
              onSubmit={async (event) => {
                event.preventDefault()
                const payload = await apiPost('/api/admin/invites', {
                  email: inviteEmail,
                  role: inviteRole,
                })
                setCreatedInviteToken(payload.invite.token)
                setInviteEmail('')
                toast('Invite created')
                await load()
              }}
            >
              <input
                value={inviteEmail}
                onChange={(event) => setInviteEmail(event.target.value)}
                placeholder="Email, optional"
                className={INPUT_CLASS}
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
              />
              <button type="submit" className={PRIMARY_BUTTON_CLASS}>
                <Icon icon="ri:user-add-line" className="h-4 w-4" />
                Create invite
              </button>
              {createdInviteToken && (
                <button
                  type="button"
                  onClick={() => {
                    if (!navigator.clipboard) return
                    navigator.clipboard
                      .writeText(`${window.location.origin}/auth?invite=${createdInviteToken}`)
                      .then(
                        () => toast('Invite link copied'),
                        () => {},
                      )
                  }}
                  className="group flex w-full items-center justify-between gap-2 rounded-md border border-success/30 bg-success/10 p-2.5 text-left text-sm text-success transition-colors hover:bg-success/15"
                >
                  <span className="min-w-0 truncate font-mono text-xs">
                    /auth?invite={createdInviteToken}
                  </span>
                  <Icon
                    icon="ri:file-copy-line"
                    className="h-3.5 w-3.5 shrink-0 opacity-60 transition-opacity group-hover:opacity-100"
                  />
                </button>
              )}
            </form>
          </Panel>

          <Panel icon="ri:shield-check-line" title="Allowlist" bodyClassName="p-4">
            <form
              className="space-y-3"
              onSubmit={async (event) => {
                event.preventDefault()
                await apiPost('/api/admin/allowlist', {
                  pattern: allowPattern,
                  kind: allowKind,
                })
                setAllowPattern('')
                toast('Allowlist rule saved')
                await load()
              }}
            >
              <input
                value={allowPattern}
                onChange={(event) => setAllowPattern(event.target.value)}
                placeholder="person@example.com or example.com"
                className={INPUT_CLASS}
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
              />
              <button type="submit" className={PRIMARY_BUTTON_CLASS}>
                <Icon icon="ri:shield-check-line" className="h-4 w-4" />
                Add rule
              </button>
            </form>
          </Panel>
        </div>

        <div className="grid items-start gap-5 xl:grid-cols-2">
          <Panel
            icon="ri:mail-line"
            title="Open invites"
            right={<CountBadge value={invites.length} />}
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
              <div className="space-y-2">
                {invites.map((invite) => (
                  <div
                    key={invite.id}
                    className="rounded-lg border border-border/50 bg-background/40 p-3 text-sm transition-colors hover:border-border/70"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="truncate font-medium text-foreground">
                        {invite.email || 'Any email'}
                      </div>
                      {invite.acceptedAt && (
                        <span className="shrink-0 rounded-sm border border-success/30 bg-success/10 px-1.5 py-0.5 text-[11px] font-medium text-success">
                          Accepted
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {invite.role} · expires {new Date(invite.expiresAt).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel
            icon="ri:shield-keyhole-line"
            title="Allowlist rules"
            right={<CountBadge value={allowlist.length} />}
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
              <div className="space-y-2">
                {allowlist.map((rule) => (
                  <div
                    key={rule.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border/50 bg-background/40 p-3 text-sm transition-colors hover:border-border/70"
                  >
                    <div className="min-w-0">
                      <div className="truncate font-medium text-foreground">{rule.pattern}</div>
                      <div className="text-xs capitalize text-muted-foreground">{rule.kind}</div>
                    </div>
                    <button
                      type="button"
                      aria-label={`Remove ${rule.pattern}`}
                      onClick={async () => {
                        await apiPost('/api/admin/allowlist/delete', { id: rule.id })
                        toast('Allowlist rule removed')
                        await load()
                      }}
                      className={BUTTON_CLASS}
                    >
                      <Icon icon="ri:delete-bin-line" className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>

        {ingestion && (
          <>
            <motion.section variants={sectionItem} className="space-y-3">
              <h2 className="text-sm font-semibold text-foreground">Ingestion and delivery</h2>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                {[
                  ['Repos', ingestion.stats.repos],
                  ['Users', ingestion.stats.users],
                  ['Saved searches', ingestion.stats.savedSearches],
                  ['Shared collections', ingestion.stats.sharedCollections],
                  ['Emails sent', ingestion.stats.emailDeliveries.sent ?? 0],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-lg border border-border/50 bg-background/40 px-4 py-3 transition-colors hover:border-border/70"
                  >
                    <div className="text-xs font-medium text-muted-foreground">{label}</div>
                    <div className="mt-2 font-mono text-xl font-semibold tabular-nums text-foreground">
                      {value}
                    </div>
                  </div>
                ))}
              </div>
            </motion.section>

            <Panel
              icon="ri:database-2-line"
              title="Ingestion runs"
              right={<CountBadge value={ingestion.latestRuns.length} />}
              className="h-[22rem]"
            >
              <table className="w-full min-w-[44rem] border-separate border-spacing-0 text-sm">
                <thead>
                  <tr>
                    <th className={STICKY_TH}>Kind</th>
                    <th className={STICKY_TH}>Status</th>
                    <th className={STICKY_TH}>Started</th>
                    <th className={STICKY_TH}>Tokens</th>
                    <th className={STICKY_TH}>Rate limit</th>
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
                  {ingestion.latestRuns.map((run) => (
                    <tr key={run.id} className="transition-colors hover:bg-row-hover">
                      <td className="border-b border-border/40 px-3 py-2">{run.kind}</td>
                      <td className="border-b border-border/40 px-3 py-2">
                        <span
                          className={cn(
                            'rounded-sm border px-2 py-1 text-xs font-medium capitalize',
                            run.status === 'success'
                              ? 'border-success/30 bg-success/10 text-success'
                              : run.error || run.status === 'failed' || run.status === 'error'
                                ? 'border-destructive/30 bg-destructive/10 text-destructive'
                                : 'border-border/40 text-muted-foreground',
                          )}
                        >
                          {run.status}
                        </span>
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </Panel>

            <Panel
              icon="ri:history-line"
              title="Recent admin activity"
              right={<CountBadge value={ingestion.auditLogs.length} />}
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
                    <div
                      key={log.id}
                      className="rounded-lg border border-border/50 bg-background/40 p-3 transition-colors hover:border-border/70"
                    >
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
                    </div>
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
