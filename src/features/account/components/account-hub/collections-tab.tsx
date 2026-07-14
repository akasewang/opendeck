'use client'

import { Icon } from '@iconify/react'
import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import { Button, buttonVariants } from '@/components/ui/button'
import CountPill from '@/components/ui/count-pill'
import { Input } from '@/components/ui/input'
import { TextArea } from '@/components/ui/text-area'
import { DataPanel as Panel, DataPanelEmpty as PanelEmpty } from '@/components/ui/data-panel'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusPill } from '@/components/ui/status-pill'
import { SimpleTag } from '@/components/ui/tag'
import { toast } from '@/components/ui/toast'
import { API_ROUTES, appRoute } from '@/config/routes'
import {
  ACCOUNT_HUB_LIST_CARD_CLASS,
  ACCOUNT_HUB_LIST_ITEM_EXIT,
  ACCOUNT_HUB_LIST_ITEM_LAYOUT,
  ACCOUNT_HUB_SECTION_ITEM,
  ACCOUNT_HUB_SECTION_STAGGER,
  ConfirmButton,
} from '@/features/account/components/account-hub/account-hub-elements'
import { postAccountApi } from '@/features/account/api/account-api-client'
import type {
  AccountHubCollectionDetail,
  AccountOverview,
} from '@/features/account/types/account-hub'
import { recommendationKey, repositoryName } from '@/features/account/utils/account-formatters'
import { RepoSearchInput } from '@/features/repositories/components/repo-search-input'
import type { RepositoryApiItem } from '@/features/repositories/types/repository'
import { formatNumber } from '@/utils/format-number'
import { cn } from '@/utils/cn'

export function CollectionsTab({
  overview,
  openCollectionId,
  collectionDetail,
  collectionDetailLoading,
  collectionExcludedRepoNames,
  collectionName,
  setCollectionName,
  collectionDescription,
  setCollectionDescription,
  setOpenCollectionId,
  setCollectionDetail,
  loadCollectionDetail,
  loadOverview,
  removeCollection,
  removeCollectionItem,
}: {
  overview: AccountOverview
  openCollectionId: string | null
  collectionDetail: AccountHubCollectionDetail | null
  collectionDetailLoading: boolean
  collectionExcludedRepoNames: string[]
  collectionName: string
  setCollectionName: (value: string) => void
  collectionDescription: string
  setCollectionDescription: (value: string) => void
  setOpenCollectionId: (value: string | null) => void
  setCollectionDetail: (value: AccountHubCollectionDetail | null) => void
  loadCollectionDetail: (id: string) => Promise<void>
  loadOverview: () => Promise<void>
  removeCollection: (id: string) => Promise<void>
  removeCollectionItem: (repo: RepositoryApiItem) => Promise<void>
}) {
  if (openCollectionId) {
    return (
      <CollectionDetailView
        openCollectionId={openCollectionId}
        collectionDetail={collectionDetail}
        collectionDetailLoading={collectionDetailLoading}
        collectionExcludedRepoNames={collectionExcludedRepoNames}
        setOpenCollectionId={setOpenCollectionId}
        setCollectionDetail={setCollectionDetail}
        loadCollectionDetail={loadCollectionDetail}
        loadOverview={loadOverview}
        removeCollectionItem={removeCollectionItem}
      />
    )
  }

  return (
    <CollectionsListView
      overview={overview}
      collectionName={collectionName}
      setCollectionName={setCollectionName}
      collectionDescription={collectionDescription}
      setCollectionDescription={setCollectionDescription}
      setOpenCollectionId={setOpenCollectionId}
      setCollectionDetail={setCollectionDetail}
      loadCollectionDetail={loadCollectionDetail}
      loadOverview={loadOverview}
      removeCollection={removeCollection}
    />
  )
}

function CollectionDetailView({
  openCollectionId,
  collectionDetail,
  collectionDetailLoading,
  collectionExcludedRepoNames,
  setOpenCollectionId,
  setCollectionDetail,
  loadCollectionDetail,
  loadOverview,
  removeCollectionItem,
}: {
  openCollectionId: string
  collectionDetail: AccountHubCollectionDetail | null
  collectionDetailLoading: boolean
  collectionExcludedRepoNames: string[]
  setOpenCollectionId: (value: string | null) => void
  setCollectionDetail: (value: AccountHubCollectionDetail | null) => void
  loadCollectionDetail: (id: string) => Promise<void>
  loadOverview: () => Promise<void>
  removeCollectionItem: (repo: RepositoryApiItem) => Promise<void>
}) {
  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <Button
            onClick={() => {
              setOpenCollectionId(null)
              setCollectionDetail(null)
            }}
          >
            <Icon icon="ri:arrow-left-line" className="h-4 w-4" />
            Back
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-sm font-semibold text-foreground">
                {collectionDetail?.collection.name ?? 'Collection'}
              </h2>
              <CountPill count={collectionDetail?.items.length ?? 0} />
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {collectionDetail?.collection.description ||
                'Search below to add repositories to this collection.'}
            </p>
          </div>
        </div>
        {collectionDetail?.collection.visibility === 'shared' &&
          collectionDetail.collection.shareSlug && (
            <a
              href={appRoute.sharedCollection(collectionDetail.collection.shareSlug)}
              className={buttonVariants()}
            >
              Public page
              <Icon icon="ri:external-link-line" className="h-3.5 w-3.5" />
            </a>
          )}
      </div>

      <RepoSearchInput
        onPick={async (fullName, repo) => {
          await postAccountApi(API_ROUTES.account.collectionItem, {
            collectionId: openCollectionId,
            fullName,
            repoId: repo?.opendeck_id,
            action: 'add',
          })
          toast('Added to collection')
          await Promise.all([loadCollectionDetail(openCollectionId), loadOverview()])
        }}
        exclude={collectionExcludedRepoNames}
        placeholder="Search the index to add repositories..."
      />

      {collectionDetailLoading && !collectionDetail ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="h-16" />
          ))}
        </div>
      ) : (collectionDetail?.items ?? []).length === 0 ? (
        <EmptyState
          icon="ri:folder-open-line"
          title="This collection is empty"
          description="Use the search above to add repositories, or add them from any repository row."
        />
      ) : (
        <motion.div
          variants={ACCOUNT_HUB_SECTION_STAGGER}
          initial="hidden"
          animate="show"
          className="relative space-y-2"
        >
          <AnimatePresence mode="popLayout">
            {(collectionDetail?.items ?? []).map((repo) => (
              <motion.div
                key={recommendationKey(repo)}
                layout
                variants={ACCOUNT_HUB_SECTION_ITEM}
                exit={ACCOUNT_HUB_LIST_ITEM_EXIT}
                transition={{ layout: ACCOUNT_HUB_LIST_ITEM_LAYOUT }}
                className={cn(
                  ACCOUNT_HUB_LIST_CARD_CLASS,
                  'flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between',
                )}
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <a
                      href={appRoute.repository(repositoryName(repo))}
                      className="truncate text-sm font-semibold text-foreground transition-colors hover:text-primary"
                    >
                      {repositoryName(repo)}
                    </a>
                    {repo.language && <SimpleTag>{repo.language}</SimpleTag>}
                    <span className="inline-flex items-center gap-1 font-mono text-xs tabular-nums text-muted-foreground">
                      <Icon icon="ri:star-line" className="h-3 w-3" />
                      {formatNumber(repo.stargazers_count ?? 0)}
                    </span>
                  </div>
                  <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">
                    {repo.description || 'No description available.'}
                  </p>
                </div>
                <Button onClick={() => removeCollectionItem(repo)}>
                  <Icon icon="ri:close-line" className="h-3.5 w-3.5" />
                  Remove
                </Button>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </section>
  )
}

function CollectionsListView({
  overview,
  collectionName,
  setCollectionName,
  collectionDescription,
  setCollectionDescription,
  setOpenCollectionId,
  setCollectionDetail,
  loadCollectionDetail,
  loadOverview,
  removeCollection,
}: {
  overview: AccountOverview
  collectionName: string
  setCollectionName: (value: string) => void
  collectionDescription: string
  setCollectionDescription: (value: string) => void
  setOpenCollectionId: (value: string | null) => void
  setCollectionDetail: (value: AccountHubCollectionDetail | null) => void
  loadCollectionDetail: (id: string) => Promise<void>
  loadOverview: () => Promise<void>
  removeCollection: (id: string) => Promise<void>
}) {
  const [pendingAction, setPendingAction] = useState<string | null>(null)

  return (
    <section className="grid gap-5 lg:grid-cols-[22rem_1fr]">
      <Panel icon="ri:folder-add-line" title="New collection" bodyClassName="space-y-3 p-4">
        <form
          className="space-y-3"
          onSubmit={async (event) => {
            event.preventDefault()
            if (pendingAction) return
            setPendingAction('create')
            try {
              await postAccountApi(API_ROUTES.account.collections, {
                name: collectionName,
                description: collectionDescription,
              })
              setCollectionName('')
              setCollectionDescription('')
              toast('Collection saved')
              await loadOverview()
            } catch {
              // The shared API client already reports the server error.
            } finally {
              setPendingAction(null)
            }
          }}
        >
          <Input
            value={collectionName}
            onChange={(event) => setCollectionName(event.target.value)}
            placeholder="Collection name"
            aria-label="Collection name"
          />
          <TextArea
            value={collectionDescription}
            onChange={(event) => setCollectionDescription(event.target.value)}
            placeholder="Description"
            aria-label="Collection description"
          />
          <Button
            type="submit"
            variant="primary"
            className="w-full"
            disabled={pendingAction !== null}
          >
            <Icon icon="ri:add-line" className="h-4 w-4" />
            {pendingAction === 'create' ? 'Creating...' : 'Create collection'}
          </Button>
          <div className="space-y-2 border-t border-border/40 pt-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Templates
            </h3>
            {overview.collectionTemplates.map((template) => (
              <Button
                key={template.key}
                disabled={pendingAction !== null}
                onClick={async () => {
                  if (pendingAction) return
                  setPendingAction(`template:${template.key}`)
                  try {
                    await postAccountApi(API_ROUTES.account.collectionTemplate, {
                      key: template.key,
                    })
                    toast('Template added')
                    await loadOverview()
                  } catch {
                    // The shared API client already reports the server error.
                  } finally {
                    setPendingAction(null)
                  }
                }}
                className="w-full justify-start"
                title={template.description}
              >
                <Icon icon="ri:layout-masonry-line" className="h-4 w-4 text-muted-foreground" />
                {template.name}
              </Button>
            ))}
          </div>
        </form>
      </Panel>
      <Panel
        icon="ri:folder-line"
        title="Collections"
        count={overview.collections.length}
        bodyClassName="p-3"
      >
        {overview.collections.length === 0 ? (
          <PanelEmpty>
            <EmptyState
              icon="ri:folder-open-line"
              title="No collections yet"
              description="Create a collection or start from a template to group repositories."
            />
          </PanelEmpty>
        ) : (
          <motion.div
            variants={ACCOUNT_HUB_SECTION_STAGGER}
            initial="hidden"
            animate="show"
            className="relative space-y-3"
          >
            <AnimatePresence mode="popLayout">
              {overview.collections.map((collection) => (
                <motion.div
                  key={collection.id}
                  layout
                  variants={ACCOUNT_HUB_SECTION_ITEM}
                  exit={ACCOUNT_HUB_LIST_ITEM_EXIT}
                  transition={{ layout: ACCOUNT_HUB_LIST_ITEM_LAYOUT }}
                  className={cn(
                    ACCOUNT_HUB_LIST_CARD_CLASS,
                    'flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between',
                  )}
                >
                  <div className="min-w-0 lg:flex-1">
                    <div className="flex items-center gap-2.5">
                      <h3 className="min-w-0 text-sm font-semibold">
                        <button
                          type="button"
                          onClick={() => {
                            setOpenCollectionId(collection.id)
                            setCollectionDetail(null)
                            void loadCollectionDetail(collection.id)
                          }}
                          className="block max-w-full truncate text-left text-foreground transition-colors hover:text-primary"
                        >
                          {collection.name}
                        </button>
                      </h3>
                      <CountPill count={collection.itemCount} />
                      {collection.visibility === 'shared' && (
                        <StatusPill tone="neutral" size="sm" className="shrink-0">
                          Shared
                        </StatusPill>
                      )}
                    </div>
                    <p className="mt-1 truncate text-[13px] text-muted-foreground">
                      {collection.description || 'No description.'}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Button
                      onClick={() => {
                        setOpenCollectionId(collection.id)
                        setCollectionDetail(null)
                        void loadCollectionDetail(collection.id)
                      }}
                    >
                      <Icon icon="ri:eye-line" className="h-3.5 w-3.5" />
                      View
                    </Button>
                    <Button
                      disabled={pendingAction !== null}
                      onClick={async () => {
                        if (pendingAction) return
                        setPendingAction(`share:${collection.id}`)
                        try {
                          await postAccountApi(API_ROUTES.account.collectionShare, {
                            id: collection.id,
                            enabled: collection.visibility !== 'shared',
                          })
                          toast(
                            collection.visibility === 'shared'
                              ? 'Collection private'
                              : 'Collection shared',
                          )
                          await loadOverview()
                        } catch {
                          // The shared API client already reports the server error.
                        } finally {
                          setPendingAction(null)
                        }
                      }}
                    >
                      <Icon
                        icon={collection.visibility === 'shared' ? 'ri:lock-line' : 'ri:share-line'}
                        className="h-3.5 w-3.5"
                      />
                      {collection.visibility === 'shared' ? 'Unshare' : 'Share'}
                    </Button>
                    {collection.shareSlug && (
                      <a
                        href={appRoute.sharedCollection(collection.shareSlug)}
                        className={buttonVariants()}
                      >
                        Open
                        <Icon icon="ri:external-link-line" className="h-3.5 w-3.5" />
                      </a>
                    )}
                    <ConfirmButton
                      label="Delete"
                      onConfirm={() => removeCollection(collection.id)}
                    />
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </Panel>
    </section>
  )
}
