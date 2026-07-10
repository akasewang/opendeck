'use client'

import { Icon } from '@iconify/react'
import { motion } from 'framer-motion'
import { useCallback, useEffect, useState } from 'react'
import Select from '@/components/ui/select'
import { toast } from '@/components/ui/toast'
import { useAuth } from '@/features/auth/auth-provider'
import { sectionItem } from '@/features/repositories/components/repo-detail-motion'
import type { Repo } from '@/features/repositories/types'
import { cn } from '@/utils/cn'

type PersonalRepoPayload = {
  state: {
    savedAt: string | null
    hiddenAt: string | null
    dismissedAt: string | null
    reviewedAt: string | null
    pipelineStage: string
    note: string | null
    alertEnabled: boolean
  }
  following: boolean
  collections: Array<{
    id: string
    name: string
    containsRepo: boolean
  }>
}

export function PersonalRepoPanel({ record, fullName }: { record: Repo; fullName?: string }) {
  const { user } = useAuth()
  const [payload, setPayload] = useState<PersonalRepoPayload | null>(null)
  const [note, setNote] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isLoadingState, setIsLoadingState] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const repoId = record.id

  const loadState = useCallback(async () => {
    if (!user || !fullName) {
      setPayload(null)
      setNote('')
      setIsLoadingState(false)
      setLoadError(null)
      return
    }

    setIsLoadingState(true)
    setLoadError(null)
    try {
      const response = await fetch(`/api/account/repo?fullName=${encodeURIComponent(fullName)}`, {
        credentials: 'include',
        cache: 'no-store',
      })
      const data = await response.json().catch(() => null)
      if (!response.ok) throw new Error(data?.error || 'Unable to load repository state.')
      setPayload(data.item)
      setNote(data.item?.state?.note ?? '')
      setLoadError(null)
    } catch (error) {
      setPayload(null)
      setNote('')
      setLoadError(error instanceof Error ? error.message : 'Unable to load repository state.')
    } finally {
      setIsLoadingState(false)
    }
  }, [fullName, user])

  useEffect(() => {
    void loadState()
  }, [loadState])

  useEffect(() => {
    if (!user || !fullName) return
    void fetch('/api/account/recent', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ targetType: 'repo', targetKey: fullName, fullName, repoId }),
    }).catch(() => null)
  }, [fullName, repoId, user])

  if (!user || !fullName) return null

  const update = async (patch: Record<string, unknown>, message = 'Repository updated') => {
    setIsSaving(true)
    try {
      const response = await fetch('/api/account/repo', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ repoId, fullName, ...patch }),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok) throw new Error(data?.error || 'Unable to update repository.')
      setPayload(data.item)
      setNote(data.item?.state?.note ?? '')
      toast(message)
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Unable to update repository', {
        tone: 'error',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const updateCollection = async (collectionId: string, containsRepo: boolean) => {
    setIsSaving(true)
    try {
      const response = await fetch('/api/account/collections/item', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          collectionId,
          repoId,
          fullName,
          action: containsRepo ? 'remove' : 'add',
        }),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok) throw new Error(data?.error || 'Unable to update collection.')
      setPayload(data.item)
      toast(containsRepo ? 'Removed from collection' : 'Added to collection')
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Unable to update collection', {
        tone: 'error',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const state = payload?.state
  const isSaved = Boolean(state?.savedAt)
  const isFollowing = Boolean(payload?.following)

  const toggleRepositoryFollow = async () => {
    setIsSaving(true)
    try {
      const response = await fetch('/api/account/follows', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          targetType: 'repo',
          targetKey: fullName,
          repoId,
          fullName,
          following: !isFollowing,
        }),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok) throw new Error(data?.error || 'Unable to update follow state.')
      setPayload((current) =>
        current ? { ...current, following: Boolean(data.following) } : current,
      )
      toast(data.following ? 'Repository followed' : 'Repository unfollowed')
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Unable to update follow state', {
        tone: 'error',
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <motion.div
      variants={sectionItem}
      className="rounded-lg border border-border/50 bg-background/35 p-3"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h4 className="text-balance text-xs font-semibold text-muted-foreground">My Deck</h4>
          <p className="mt-1 text-sm text-muted-foreground">
            Save this repo, track your contribution stage and keep private notes.
          </p>
          {loadError && (
            <p className="mt-2 text-xs text-destructive">
              {loadError}{' '}
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation()
                  void loadState()
                }}
                className="font-medium underline underline-offset-2"
              >
                Retry
              </button>
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={isSaving || isLoadingState || Boolean(loadError)}
            onClick={(event) => {
              event.stopPropagation()
              void update({ saved: !isSaved }, isSaved ? 'Repository unsaved' : 'Repository saved')
            }}
            className={cn(
              'inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium transition-colors disabled:opacity-60',
              isSaved
                ? 'border-success/30 bg-success/10 text-success'
                : 'border-border/40 bg-background text-foreground hover:bg-muted-hover',
            )}
          >
            <Icon
              icon={isSaved ? 'ri:bookmark-fill' : 'ri:bookmark-line'}
              className="h-3.5 w-3.5"
            />
            {isSaved ? 'Saved' : 'Save'}
          </button>
          <button
            type="button"
            disabled={isSaving || isLoadingState || Boolean(loadError)}
            onClick={(event) => {
              event.stopPropagation()
              void toggleRepositoryFollow()
            }}
            className={cn(
              'inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium transition-colors disabled:opacity-60',
              isFollowing
                ? 'border-success/30 bg-success/10 text-success'
                : 'border-border/40 bg-background text-foreground hover:bg-muted-hover',
            )}
          >
            <Icon
              icon={isFollowing ? 'ri:notification-3-fill' : 'ri:notification-3-line'}
              className="h-3.5 w-3.5"
            />
            {isFollowing ? 'Following' : 'Follow'}
          </button>
        </div>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-[14rem_1fr_auto]">
        <div className="space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">Stage</span>
          <Select
            value={state?.pipelineStage ?? 'interested'}
            onChange={(event) => void update({ pipelineStage: event.target.value })}
            disabled={isSaving || isLoadingState || Boolean(loadError)}
            options={[
              { value: 'interested', label: 'Interested' },
              { value: 'opened_issue', label: 'Opened issue' },
              { value: 'submitted_pr', label: 'Submitted PR' },
              { value: 'done', label: 'Done' },
            ]}
            placeholder="Stage"
            clearable={false}
            ariaLabel="Pipeline stage"
          />
        </div>
        <label className="space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">Private note</span>
          <input
            value={note}
            disabled={isSaving || isLoadingState || Boolean(loadError)}
            onClick={(event) => event.stopPropagation()}
            onChange={(event) => setNote(event.target.value)}
            onBlur={() => void update({ note }, 'Note saved')}
            placeholder="Why this repo matters"
            className="h-9 w-full rounded-md border border-border/40 bg-background px-2 text-sm text-foreground"
          />
        </label>
        <div className="flex flex-wrap items-end gap-2">
          <button
            type="button"
            disabled={isSaving || isLoadingState || Boolean(loadError)}
            onClick={(event) => {
              event.stopPropagation()
              void update({ reviewed: true }, 'Marked reviewed')
            }}
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border/40 bg-background px-2.5 text-xs font-medium text-foreground transition-colors hover:bg-muted-hover disabled:opacity-60"
          >
            Reviewed
          </button>
          <button
            type="button"
            disabled={isSaving || isLoadingState || Boolean(loadError)}
            onClick={(event) => {
              event.stopPropagation()
              void update({ hidden: true }, 'Repository hidden')
            }}
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border/40 bg-background px-2.5 text-xs font-medium text-foreground transition-colors hover:bg-muted-hover disabled:opacity-60"
          >
            Hide
          </button>
        </div>
      </div>

      {payload?.collections && payload.collections.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {payload.collections.slice(0, 6).map((collection) => (
            <button
              key={collection.id}
              type="button"
              disabled={isSaving || isLoadingState || Boolean(loadError)}
              onClick={(event) => {
                event.stopPropagation()
                void updateCollection(collection.id, collection.containsRepo)
              }}
              className={cn(
                'inline-flex h-7 items-center gap-1 rounded-md border px-2 text-xs transition-colors disabled:opacity-60',
                collection.containsRepo
                  ? 'border-info/30 bg-info/10 text-info'
                  : 'border-border/40 text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon
                icon={collection.containsRepo ? 'ri:folder-check-line' : 'ri:folder-add-line'}
                className="h-3.5 w-3.5"
              />
              {collection.name}
            </button>
          ))}
        </div>
      )}
    </motion.div>
  )
}
