import type { Variants } from 'framer-motion'

export const PANEL_CLASS = 'rounded-lg border border-border/50 bg-background/40 p-4'

export const ICON_BUTTON_CLASS =
  'flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border/40 bg-background text-muted-foreground transition hover:border-border/70 hover:bg-muted-hover hover:text-foreground active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60'

export const LIST_CARD_CLASS =
  'rounded-lg border border-border/50 bg-background/40 transition-colors hover:border-border/70'

export const CHECKBOX_ROW_CLASS =
  'flex cursor-pointer items-center gap-2.5 rounded-md border border-border/40 bg-background/40 px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:border-border/60 hover:text-foreground'

export const sectionStagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05, delayChildren: 0.03 } },
}

export const sectionItem: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 30 } },
}

export const tabs = [
  { id: 'home', label: 'Home', icon: 'ri:dashboard-line' },
  { id: 'library', label: 'Library', icon: 'ri:bookmark-line' },
  { id: 'pipeline', label: 'Pipeline', icon: 'ri:git-pull-request-line' },
  { id: 'issues', label: 'Issues', icon: 'ri:bug-line' },
  { id: 'collections', label: 'Collections', icon: 'ri:folder-line' },
  { id: 'searches', label: 'Searches', icon: 'ri:search-eye-line' },
  { id: 'follows', label: 'Follows', icon: 'ri:notification-3-line' },
  { id: 'integrations', label: 'Email', icon: 'ri:mail-send-line' },
  { id: 'preferences', label: 'Preferences', icon: 'ri:equalizer-line' },
  { id: 'security', label: 'Security', icon: 'ri:shield-user-line' },
] as const

export type TabId = (typeof tabs)[number]['id']
