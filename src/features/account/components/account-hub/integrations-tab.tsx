'use client'

import { Card } from '@/components/ui/card'
import { DataPanel as Panel, DataPanelEmpty as PanelEmpty } from '@/components/ui/data-panel'
import { StatusPill } from '@/components/ui/status-pill'
import type { AccountOverview } from '@/features/account/types/account-hub'
import { formatDateTime } from '@/features/account/utils/account-formatters'

function deliveryLabel(type: string) {
  const words = type.replaceAll('_', ' ')
  return words.charAt(0).toUpperCase() + words.slice(1)
}

export function IntegrationsTab({
  emailDeliveries,
}: {
  emailDeliveries: AccountOverview['emailDeliveries']
}) {
  return (
    <Panel
      icon="ri:mail-send-line"
      title="Email delivery"
      count={emailDeliveries.length}
      className="h-[28rem]"
      bodyClassName="space-y-2 p-3"
    >
      {emailDeliveries.length === 0 ? (
        <PanelEmpty>
          <div className="rounded-md border border-dashed border-border/50 px-3 py-5 text-center text-sm text-muted-foreground">
            No email deliveries yet. Enable digests in Preferences to start receiving them.
          </div>
        </PanelEmpty>
      ) : (
        emailDeliveries.map((delivery) => (
          <Card key={delivery.id} className="p-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="truncate text-foreground">{delivery.subject}</span>
              <StatusPill
                tone={
                  delivery.status === 'sent'
                    ? 'success'
                    : delivery.status === 'failed'
                      ? 'destructive'
                      : 'neutral'
                }
                size="sm"
                className="shrink-0"
              >
                {delivery.status}
              </StatusPill>
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {deliveryLabel(delivery.type)} · {formatDateTime(delivery.createdAt)}
            </div>
          </Card>
        ))
      )}
    </Panel>
  )
}
