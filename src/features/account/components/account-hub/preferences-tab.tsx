'use client'

import { Icon } from '@iconify/react'
import { type Dispatch, type SetStateAction, useState } from 'react'
import { Button } from '@/components/ui/button'
import { CheckboxRow } from '@/components/ui/checkbox-row'
import { DataPanel as Panel } from '@/components/ui/data-panel'
import { Input } from '@/components/ui/input'
import Select from '@/components/ui/select'
import { toast } from '@/components/ui/toast'
import { API_ROUTES } from '@/config/routes'
import { postAccountApi } from '@/features/account/api/account-api-client'
import { ACCOUNT_DIGEST_FREQUENCIES } from '@/features/account/constants/account-options'
import type { AccountOverview } from '@/features/account/types/account-hub'
import { REPOSITORY_SEARCH_SORTS } from '@/features/repositories/constants/repository-options'

const SETUP_DIFFICULTIES = ['any', 'easy', 'medium', 'advanced'] as const

export function PreferencesTab({
  preferencesDraft,
  setPreferencesDraft,
  loadOverview,
  resetRecommendationsPagination,
}: {
  preferencesDraft: AccountOverview['preferences']
  setPreferencesDraft: Dispatch<SetStateAction<AccountOverview['preferences'] | null>>
  loadOverview: () => Promise<void>
  resetRecommendationsPagination: () => void
}) {
  const [isSaving, setIsSaving] = useState(false)

  return (
    <Panel icon="ri:equalizer-line" title="Preferences" scrollable={false} bodyClassName="p-4">
      <form
        className="grid gap-4 lg:grid-cols-2"
        onSubmit={async (event) => {
          event.preventDefault()
          if (isSaving) return
          setIsSaving(true)
          try {
            await postAccountApi(API_ROUTES.account.preferences, preferencesDraft)
            toast('Preferences saved')
            resetRecommendationsPagination()
            await loadOverview()
          } catch {
            // The shared API client already reports the server error.
          } finally {
            setIsSaving(false)
          }
        }}
      >
        <label className="space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">Default language</span>
          <Input
            value={preferencesDraft.defaultLanguage ?? ''}
            onChange={(event) =>
              setPreferencesDraft({
                ...preferencesDraft,
                defaultLanguage: event.target.value,
              })
            }
            placeholder="typescript"
          />
        </label>
        <label className="space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">Preferred languages</span>
          <Input
            value={preferencesDraft.preferredLanguages.join(', ')}
            onChange={(event) =>
              setPreferencesDraft({
                ...preferencesDraft,
                preferredLanguages: event.target.value.split(',').map((item) => item.trim()),
              })
            }
            placeholder="typescript, go, rust"
          />
        </label>
        <label className="space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">Preferred topics</span>
          <Input
            value={preferencesDraft.preferredTopics.join(', ')}
            onChange={(event) =>
              setPreferencesDraft({
                ...preferencesDraft,
                preferredTopics: event.target.value.split(',').map((item) => item.trim()),
              })
            }
          />
        </label>
        <label className="space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">Excluded languages</span>
          <Input
            value={preferencesDraft.excludedLanguages.join(', ')}
            onChange={(event) =>
              setPreferencesDraft({
                ...preferencesDraft,
                excludedLanguages: event.target.value.split(',').map((item) => item.trim()),
              })
            }
          />
        </label>
        <label className="space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">Excluded topics</span>
          <Input
            value={preferencesDraft.excludedTopics.join(', ')}
            onChange={(event) =>
              setPreferencesDraft({
                ...preferencesDraft,
                excludedTopics: event.target.value.split(',').map((item) => item.trim()),
              })
            }
          />
        </label>
        <label className="space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">Minimum stars</span>
          <Input
            value={preferencesDraft.minStars}
            onChange={(event) =>
              setPreferencesDraft({
                ...preferencesDraft,
                minStars: Number.parseInt(event.target.value, 10) || 0,
              })
            }
            inputMode="numeric"
          />
        </label>
        <div className="space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">Default sort</span>
          <Select
            value={preferencesDraft.defaultSort}
            onChange={(event) => {
              const defaultSort = REPOSITORY_SEARCH_SORTS.find(
                (sort) => sort === event.target.value,
              )
              if (defaultSort) setPreferencesDraft({ ...preferencesDraft, defaultSort })
            }}
            options={[
              { value: 'relevance', label: 'Relevance' },
              { value: 'contribution', label: 'Contribution fit' },
              { value: 'stars', label: 'Most stars' },
              { value: 'forks', label: 'Most forks' },
              { value: 'recent', label: 'Newest' },
              { value: 'updated', label: 'Recently updated' },
            ]}
            placeholder="Default sort"
            clearable={false}
            ariaLabel="Default sort"
          />
        </div>
        <div className="space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">Digest frequency</span>
          <Select
            value={preferencesDraft.digestFrequency}
            onChange={(event) => {
              const digestFrequency = ACCOUNT_DIGEST_FREQUENCIES.find(
                (frequency) => frequency === event.target.value,
              )
              if (digestFrequency) {
                setPreferencesDraft({ ...preferencesDraft, digestFrequency })
              }
            }}
            ariaLabel="Digest frequency"
            options={[
              { value: 'off', label: 'Off' },
              { value: 'daily', label: 'Daily' },
              { value: 'weekly', label: 'Weekly' },
              { value: 'monthly', label: 'Monthly' },
            ]}
            placeholder="Digest frequency"
            clearable={false}
          />
        </div>
        {preferencesDraft.digestFrequency === 'weekly' && (
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">Digest day</span>
            <Select
              value={String(preferencesDraft.digestDay)}
              onChange={(event) =>
                setPreferencesDraft({
                  ...preferencesDraft,
                  digestDay: Number.parseInt(event.target.value, 10) || 0,
                })
              }
              options={[
                { value: '1', label: 'Monday' },
                { value: '2', label: 'Tuesday' },
                { value: '3', label: 'Wednesday' },
                { value: '4', label: 'Thursday' },
                { value: '5', label: 'Friday' },
                { value: '6', label: 'Saturday' },
                { value: '0', label: 'Sunday' },
              ]}
              placeholder="Digest day"
              clearable={false}
              ariaLabel="Digest day"
            />
          </div>
        )}
        <div className="space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">Setup difficulty</span>
          <Select
            value={preferencesDraft.setupDifficulty}
            onChange={(event) => {
              const setupDifficulty = SETUP_DIFFICULTIES.find(
                (difficulty) => difficulty === event.target.value,
              )
              if (setupDifficulty) {
                setPreferencesDraft({ ...preferencesDraft, setupDifficulty })
              }
            }}
            ariaLabel="Setup difficulty"
            options={[
              { value: 'any', label: 'Any setup' },
              { value: 'easy', label: 'Easy setup' },
              { value: 'medium', label: 'Medium setup' },
              { value: 'advanced', label: 'Advanced setup' },
            ]}
            placeholder="Setup difficulty"
            clearable={false}
          />
        </div>
        <div className="space-y-2 lg:col-span-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Filters and alerts
          </h3>
          <div className="grid gap-2 sm:grid-cols-2">
            <CheckboxRow
              checked={preferencesDraft.goodFirstAlertsEnabled}
              onChange={(checked) =>
                setPreferencesDraft({ ...preferencesDraft, goodFirstAlertsEnabled: checked })
              }
            >
              Alert me for good first issue signals
            </CheckboxRow>
            <CheckboxRow
              checked={preferencesDraft.emailDigestEnabled}
              onChange={(checked) =>
                setPreferencesDraft({ ...preferencesDraft, emailDigestEnabled: checked })
              }
            >
              Enable email digest
            </CheckboxRow>
            <CheckboxRow
              checked={preferencesDraft.excludeArchived}
              onChange={(checked) =>
                setPreferencesDraft({ ...preferencesDraft, excludeArchived: checked })
              }
            >
              Hide archived repositories
            </CheckboxRow>
            <CheckboxRow
              checked={preferencesDraft.excludeResourceLists}
              onChange={(checked) =>
                setPreferencesDraft({ ...preferencesDraft, excludeResourceLists: checked })
              }
            >
              Hide resource lists and low-signal collections
            </CheckboxRow>
            <CheckboxRow
              checked={preferencesDraft.excludeLowActivity}
              onChange={(checked) =>
                setPreferencesDraft({ ...preferencesDraft, excludeLowActivity: checked })
              }
            >
              Prefer recently active repositories
            </CheckboxRow>
            <CheckboxRow
              checked={preferencesDraft.includeLowIssueCount}
              onChange={(checked) =>
                setPreferencesDraft({ ...preferencesDraft, includeLowIssueCount: checked })
              }
            >
              Include repositories with few open issues
            </CheckboxRow>
            <CheckboxRow
              checked={preferencesDraft.privateProfile}
              onChange={(checked) =>
                setPreferencesDraft({ ...preferencesDraft, privateProfile: checked })
              }
            >
              Keep my profile private
            </CheckboxRow>
          </div>
        </div>
        <div className="lg:col-span-2">
          <Button type="submit" variant="primary" disabled={isSaving}>
            <Icon
              icon={isSaving ? 'ri:loader-4-line' : 'ri:save-3-line'}
              className={isSaving ? 'h-4 w-4 animate-spin' : 'h-4 w-4'}
            />
            {isSaving ? 'Saving...' : 'Save preferences'}
          </Button>
        </div>
      </form>
    </Panel>
  )
}
