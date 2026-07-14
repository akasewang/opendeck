'use client'

import { Icon } from '@iconify/react'
import { AnimatePresence, motion } from 'framer-motion'
import { type Dispatch, type SetStateAction, useState } from 'react'
import { Button } from '@/components/ui/button'
import { CheckboxRow } from '@/components/ui/checkbox-row'
import { DataPanel as Panel, DataPanelEmpty as PanelEmpty } from '@/components/ui/data-panel'
import { EmptyState } from '@/components/ui/empty-state'
import { Input } from '@/components/ui/input'
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
import type { AccountHubSearchPreview, AccountOverview } from '@/features/account/types/account-hub'
import { formatWhen, repositoryName } from '@/features/account/utils/account-formatters'
import { isAccountSearchPreview } from '@/features/account/utils/account-response-validation'
import { formatNumber } from '@/utils/format-number'
import { cn } from '@/utils/cn'

export function SavedSearchesTab({
  savedSearches,
  searchName,
  setSearchName,
  searchQuery,
  setSearchQuery,
  searchLanguage,
  setSearchLanguage,
  searchTopic,
  setSearchTopic,
  searchMinStars,
  setSearchMinStars,
  searchAlertsEnabled,
  setSearchAlertsEnabled,
  searchPreview,
  setSearchPreview,
  searchPreviewLoading,
  setSearchPreviewLoading,
  removeSavedSearch,
  loadOverview,
}: {
  savedSearches: AccountOverview['savedSearches']
  searchName: string
  setSearchName: (value: string) => void
  searchQuery: string
  setSearchQuery: (value: string) => void
  searchLanguage: string
  setSearchLanguage: (value: string) => void
  searchTopic: string
  setSearchTopic: (value: string) => void
  searchMinStars: string
  setSearchMinStars: (value: string) => void
  searchAlertsEnabled: boolean
  setSearchAlertsEnabled: (value: boolean) => void
  searchPreview: AccountHubSearchPreview | null
  setSearchPreview: Dispatch<SetStateAction<AccountHubSearchPreview | null>>
  searchPreviewLoading: boolean
  setSearchPreviewLoading: (value: boolean) => void
  removeSavedSearch: (id: string) => Promise<void>
  loadOverview: () => Promise<void>
}) {
  const [isSavingSearch, setIsSavingSearch] = useState(false)
  const filters = {
    language: searchLanguage,
    topic: searchTopic,
    minStars: searchMinStars.trim() || '0',
    contributionReadyOnly: true,
  }

  return (
    <section className="grid gap-5 lg:grid-cols-[22rem_1fr]">
      <Panel icon="ri:add-line" title="Saved search alerts" bodyClassName="space-y-3 p-4">
        <form
          className="space-y-3"
          onSubmit={async (event) => {
            event.preventDefault()
            if (isSavingSearch) return
            setIsSavingSearch(true)
            try {
              await postAccountApi(API_ROUTES.account.savedSearches, {
                name: searchName,
                query: searchQuery,
                filters,
                alertEnabled: searchAlertsEnabled,
              })
              setSearchName('')
              setSearchQuery('')
              toast('Saved search created')
              await loadOverview()
            } catch {
              // The shared API client already reports the server error.
            } finally {
              setIsSavingSearch(false)
            }
          }}
        >
          <Input
            value={searchName}
            onChange={(event) => setSearchName(event.target.value)}
            placeholder="Name"
            aria-label="Saved search name"
          />
          <Input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search text"
            aria-label="Saved search text"
          />
          <Input
            value={searchLanguage}
            onChange={(event) => setSearchLanguage(event.target.value)}
            placeholder="Language"
            aria-label="Saved search language"
          />
          <Input
            value={searchTopic}
            onChange={(event) => setSearchTopic(event.target.value)}
            placeholder="Topic"
            aria-label="Saved search topic"
          />
          <Input
            value={searchMinStars}
            onChange={(event) => setSearchMinStars(event.target.value)}
            placeholder="Minimum stars"
            inputMode="numeric"
            aria-label="Saved search minimum stars"
          />
          <CheckboxRow checked={searchAlertsEnabled} onChange={setSearchAlertsEnabled}>
            Alert me when new repositories match
          </CheckboxRow>
          <div className="flex flex-col gap-2">
            <Button type="submit" variant="primary" className="w-full" disabled={isSavingSearch}>
              <Icon
                icon={isSavingSearch ? 'ri:loader-4-line' : 'ri:search-eye-line'}
                className={cn('h-4 w-4', isSavingSearch && 'animate-spin')}
              />
              {isSavingSearch ? 'Saving...' : 'Save search'}
            </Button>
            <Button
              disabled={searchPreviewLoading}
              onClick={async () => {
                setSearchPreviewLoading(true)
                try {
                  const payload = await postAccountApi(API_ROUTES.account.savedSearchPreview, {
                    query: searchQuery,
                    filters,
                  })
                  if (!isAccountSearchPreview(payload)) {
                    toast('Account API returned an invalid search preview.', { tone: 'error' })
                    return
                  }
                  setSearchPreview({
                    totalCount: payload.totalCount,
                    items: payload.items,
                  })
                } catch {
                } finally {
                  setSearchPreviewLoading(false)
                }
              }}
              className="w-full"
            >
              <Icon
                icon={searchPreviewLoading ? 'ri:loader-4-line' : 'ri:eye-line'}
                className={cn('h-4 w-4', searchPreviewLoading && 'animate-spin')}
              />
              Preview matches
            </Button>
          </div>
          {searchPreview && (
            <div className="rounded-md border border-border/40 bg-background/40 px-3 py-2.5 text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">
                {formatNumber(searchPreview.totalCount)}
              </span>{' '}
              {searchPreview.totalCount === 1 ? 'repository matches' : 'repositories match'} right
              now.
              {searchPreview.items.length > 0 && (
                <ul className="mt-1.5 space-y-1">
                  {searchPreview.items.slice(0, 3).map((repo) => (
                    <li key={repo.opendeck_id ?? repositoryName(repo)} className="truncate">
                      <a
                        href={appRoute.repository(repositoryName(repo))}
                        className="text-foreground transition-colors hover:text-primary"
                      >
                        {repositoryName(repo)}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </form>
      </Panel>
      <Panel
        icon="ri:search-eye-line"
        title="Saved searches"
        count={savedSearches.length}
        bodyClassName="p-3"
      >
        {savedSearches.length === 0 ? (
          <PanelEmpty>
            <EmptyState
              icon="ri:search-eye-line"
              title="No saved searches"
              description="Save a search with language, topic or star filters and get alerts when new repositories match."
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
              {savedSearches.map((search) => (
                <motion.div
                  key={search.id}
                  layout
                  variants={ACCOUNT_HUB_SECTION_ITEM}
                  exit={ACCOUNT_HUB_LIST_ITEM_EXIT}
                  transition={{ layout: ACCOUNT_HUB_LIST_ITEM_LAYOUT }}
                  className={cn(
                    ACCOUNT_HUB_LIST_CARD_CLASS,
                    'flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between',
                  )}
                >
                  <div className="min-w-0 sm:flex-1">
                    <div className="flex items-center gap-2.5">
                      <div className="truncate text-sm font-semibold text-foreground">
                        {search.name}
                      </div>
                      {search.alertEnabled && (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-sm border border-border/40 px-1.5 py-0.5 text-2xs text-muted-foreground">
                          <Icon icon="ri:notification-3-line" className="h-3 w-3" />
                          Alerts on
                        </span>
                      )}
                    </div>
                    <div className="mt-1 truncate text-[13px] text-muted-foreground">
                      {search.query || 'Search by filters only'} · last checked{' '}
                      {formatWhen(search.lastCheckedAt)}
                    </div>
                  </div>
                  <ConfirmButton label="Delete" onConfirm={() => removeSavedSearch(search.id)} />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </Panel>
    </section>
  )
}
