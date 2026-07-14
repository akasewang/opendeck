'use client'

import { Icon } from '@iconify/react'
import { AnimatePresence, motion } from 'framer-motion'
import { buttonVariants } from '@/components/ui/button'
import { DataPanel as Panel, DataPanelEmpty as PanelEmpty } from '@/components/ui/data-panel'
import { EmptyState } from '@/components/ui/empty-state'
import { APP_ROUTES } from '@/config/routes'
import {
  ACCOUNT_HUB_SECTION_STAGGER,
  RepoRow,
} from '@/features/account/components/account-hub/account-hub-elements'
import type { AccountOverview } from '@/features/account/types/account-hub'
import { recommendationKey } from '@/features/account/utils/account-formatters'
import type { RepositoryApiItem } from '@/features/repositories/types/repository'

export function LibraryTab({
  savedRepos,
  updateRepo,
}: {
  savedRepos: AccountOverview['savedRepos']
  updateRepo: (repo: RepositoryApiItem, patch: Record<string, unknown>) => Promise<void>
}) {
  return (
    <Panel
      icon="ri:bookmark-line"
      title="Saved repositories"
      count={savedRepos.length}
      className="h-[28rem]"
      bodyClassName="p-3"
    >
      {savedRepos.length === 0 ? (
        <PanelEmpty>
          <EmptyState
            icon="ri:bookmark-line"
            title="No saved repositories"
            description="Save repositories from recommendations or any dashboard row to build your library."
          >
            <a href={APP_ROUTES.dashboard} className={buttonVariants()}>
              Browse repositories
              <Icon icon="ri:arrow-right-line" className="h-3.5 w-3.5" />
            </a>
          </EmptyState>
        </PanelEmpty>
      ) : (
        <motion.div
          variants={ACCOUNT_HUB_SECTION_STAGGER}
          initial="hidden"
          animate="show"
          className="relative grid gap-3 xl:grid-cols-2"
        >
          <AnimatePresence mode="popLayout">
            {savedRepos.map((item) => (
              <RepoRow key={recommendationKey(item.repo)} item={item} onUpdate={updateRepo} />
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </Panel>
  )
}
