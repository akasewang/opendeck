'use client'

import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { DataPanel as Panel, DataPanelEmpty as PanelEmpty } from '@/components/ui/data-panel'
import { EmptyState } from '@/components/ui/empty-state'
import { RefreshButton } from '@/components/ui/refresh-button'
import { Skeleton, skeletonStagger } from '@/components/ui/skeleton'
import { SimpleTag } from '@/components/ui/tag'
import {
  ACCOUNT_HUB_LIST_CARD_CLASS,
  ACCOUNT_HUB_SECTION_ITEM,
  ACCOUNT_HUB_SECTION_STAGGER,
} from '@/features/account/components/account-hub/account-hub-elements'
import type { AccountHubTabId } from '@/features/account/constants/account-hub'
import type { AccountOverview } from '@/features/account/types/account-hub'
import { cn } from '@/utils/cn'

export function IssuesTab({
  issues,
  issuesLoading,
  loadIssues,
  selectTab,
}: {
  issues: NonNullable<AccountOverview['issues']>
  issuesLoading: boolean
  loadIssues: () => void | Promise<void>
  selectTab: (tab: AccountHubTabId) => void
}) {
  return (
    <Panel
      icon="ri:bug-line"
      title="Issue recommendations"
      count={issues.length}
      className="h-[28rem]"
      bodyClassName="p-3"
      right={
        <RefreshButton
          onClick={loadIssues}
          isRefreshing={issuesLoading}
          ariaLabel={
            issuesLoading ? 'Refreshing issue recommendations' : 'Refresh issue recommendations'
          }
          title={
            issuesLoading ? 'Refreshing issue recommendations' : 'Refresh issue recommendations'
          }
        />
      }
    >
      {issuesLoading && issues.length === 0 ? (
        <div className="grid gap-3 xl:grid-cols-2">
          {Array.from({ length: 8 }, (_, index) => (
            <Skeleton key={index} style={skeletonStagger(index)} className="h-24" />
          ))}
        </div>
      ) : issues.length === 0 ? (
        <PanelEmpty>
          <EmptyState
            icon="ri:bug-line"
            title="No issue recommendations yet"
            description="Save a few repositories or configure GITHUB_TOKEN, then refresh to surface approachable issues."
          >
            <Button onClick={() => selectTab('library')}>Open library</Button>
          </EmptyState>
        </PanelEmpty>
      ) : (
        <motion.div
          variants={ACCOUNT_HUB_SECTION_STAGGER}
          initial="hidden"
          animate="show"
          className="grid gap-3 xl:grid-cols-2"
        >
          {issues.map((issue) => (
            <motion.a
              key={issue.id}
              variants={ACCOUNT_HUB_SECTION_ITEM}
              href={issue.htmlUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(ACCOUNT_HUB_LIST_CARD_CLASS, 'block p-4')}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-foreground">
                    {issue.fullName} #{issue.number}
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{issue.title}</p>
                </div>
                <span className="shrink-0 rounded-sm border border-success/30 bg-success/10 px-2 py-1 font-mono text-xs tabular-nums text-success">
                  {issue.score}
                </span>
              </div>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {issue.labels.slice(0, 5).map((label) => (
                  <SimpleTag key={label}>{label}</SimpleTag>
                ))}
              </div>
            </motion.a>
          ))}
        </motion.div>
      )}
    </Panel>
  )
}
