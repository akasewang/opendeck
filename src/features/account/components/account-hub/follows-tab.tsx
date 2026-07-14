'use client'

import { Icon } from '@iconify/react'
import { AnimatePresence, motion } from 'framer-motion'
import { Button, buttonVariants } from '@/components/ui/button'
import { DataPanel as Panel, DataPanelEmpty as PanelEmpty } from '@/components/ui/data-panel'
import { EmptyState } from '@/components/ui/empty-state'
import { APP_ROUTES, appRoute } from '@/config/routes'
import {
  ACCOUNT_HUB_LIST_CARD_CLASS,
  ACCOUNT_HUB_LIST_ITEM_EXIT,
  ACCOUNT_HUB_LIST_ITEM_LAYOUT,
  ACCOUNT_HUB_SECTION_ITEM,
  ACCOUNT_HUB_SECTION_STAGGER,
} from '@/features/account/components/account-hub/account-hub-elements'
import type { AccountOverview } from '@/features/account/types/account-hub'
import { formatDate } from '@/features/account/utils/account-formatters'
import { cn } from '@/utils/cn'

export function FollowsTab({
  follows,
  removeFollow,
}: {
  follows: AccountOverview['follows']
  removeFollow: (follow: AccountOverview['follows'][number]) => Promise<void>
}) {
  return (
    <Panel
      icon="ri:notification-3-line"
      title="Followed repos and organizations"
      count={follows.length}
      className="h-[28rem]"
      bodyClassName="p-3"
    >
      {follows.length === 0 ? (
        <PanelEmpty>
          <EmptyState
            icon="ri:notification-3-line"
            title="Not following anything yet"
            description="Follow repositories or organizations from row details to track them here."
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
          className="relative space-y-2"
        >
          <AnimatePresence mode="popLayout">
            {follows.map((follow) => (
              <motion.div
                key={follow.id}
                layout
                variants={ACCOUNT_HUB_SECTION_ITEM}
                exit={ACCOUNT_HUB_LIST_ITEM_EXIT}
                transition={{ layout: ACCOUNT_HUB_LIST_ITEM_LAYOUT }}
                className={cn(
                  ACCOUNT_HUB_LIST_CARD_CLASS,
                  'flex items-center justify-between gap-3 px-4 py-3',
                )}
              >
                <div className="flex min-w-0 flex-1 items-center gap-2.5">
                  <Icon
                    icon={
                      follow.targetType === 'organization'
                        ? 'ri:building-line'
                        : 'ri:git-repository-line'
                    }
                    className="h-4 w-4 shrink-0 text-muted-foreground/70"
                  />
                  <a
                    href={
                      follow.targetType === 'organization'
                        ? appRoute.organization(follow.targetKey)
                        : appRoute.repository(follow.targetKey)
                    }
                    className="truncate text-sm font-semibold text-foreground transition-colors hover:text-primary"
                  >
                    {follow.targetKey}
                  </a>
                  <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">
                    {follow.targetType === 'organization' ? 'Organization' : 'Repository'} ·
                    followed {formatDate(follow.createdAt)}
                  </span>
                </div>
                <Button onClick={() => removeFollow(follow)}>
                  <Icon icon="ri:notification-off-line" className="h-3.5 w-3.5" />
                  Unfollow
                </Button>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </Panel>
  )
}
