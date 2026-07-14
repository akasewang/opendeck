'use client'

import { Card } from '@/components/ui/card'
import { DataPanel as Panel, DataPanelEmpty as PanelEmpty } from '@/components/ui/data-panel'
import { ACCOUNT_PIPELINE_STAGES } from '@/features/account/constants/account-options'
import type { AccountHubRepoWithState } from '@/features/account/types/account-hub'
import { repositoryName } from '@/features/account/utils/account-formatters'

export function PipelineTab({
  pipelineGroups,
}: {
  pipelineGroups: Map<string, AccountHubRepoWithState[]>
}) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
      {ACCOUNT_PIPELINE_STAGES.map((stage) => {
        const stageItems = pipelineGroups.get(stage.id) ?? []
        return (
          <Panel
            key={stage.id}
            icon={stage.icon}
            title={stage.label}
            count={stageItems.length}
            className="h-[28rem]"
            bodyClassName="space-y-2 p-3"
          >
            {stageItems.length === 0 ? (
              <PanelEmpty>
                <div className="rounded-md border border-dashed border-border/50 px-3 py-6 text-center text-xs text-muted-foreground">
                  Nothing in this stage yet.
                </div>
              </PanelEmpty>
            ) : (
              stageItems.map((item) => (
                <Card key={item.repo.opendeck_id ?? repositoryName(item.repo)} className="p-3">
                  <div className="truncate text-sm font-medium text-foreground">
                    {repositoryName(item.repo)}
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    {item.state.note || item.repo.description || 'No note.'}
                  </p>
                </Card>
              ))
            )}
          </Panel>
        )
      })}
    </div>
  )
}
