import type { Transition } from 'framer-motion'

export const MOTION_STAGGER_STEP_SECONDS = 0.025

export const MOTION_DELAY_SECONDS = {
  labelReveal: 0.06,
} as const

export const MOTION_DURATION_SECONDS = {
  instant: 0.1,
  fast: 0.14,
  short: 0.15,
  standard: 0.18,
  quick: 0.2,
  moderate: 0.25,
  navigation: 0.28,
  slow: 0.3,
  deliberate: 0.6,
} as const

export const MOTION_DURATION_MS = {
  fast: 120,
  standard: 180,
  moderate: 250,
  slow: 300,
  tooltipEnter: 400,
  tooltipDelay: 150,
} as const

export const MOTION_EASING = {
  enter: [0.22, 1, 0.36, 1] as [number, number, number, number],
  standard: 'easeOut',
  exit: 'easeIn',
  symmetric: 'easeInOut',
} as const

export const MOTION_SPRING = {
  standard: { type: 'spring', stiffness: 300, damping: 30 },
  soft: { type: 'spring', stiffness: 300, damping: 28 },
  firm: { type: 'spring', stiffness: 420, damping: 30 },
  firmSoft: { type: 'spring', stiffness: 420, damping: 28 },
  chip: { type: 'spring', stiffness: 400, damping: 26 },
  alert: { type: 'spring', stiffness: 420, damping: 32, mass: 0.7 },
  search: { type: 'spring', stiffness: 420, damping: 34 },
  rail: { type: 'spring', stiffness: 420, damping: 38, mass: 0.9 },
  auth: { type: 'spring', stiffness: 360, damping: 32 },
  toast: { type: 'spring', stiffness: 380, damping: 30 },
  count: { type: 'spring', stiffness: 500, damping: 30 },
  dismiss: { type: 'spring', stiffness: 500, damping: 26 },
  arrow: { type: 'spring', stiffness: 500, damping: 22 },
  responsive: { type: 'spring', stiffness: 480, damping: 30 },
  compact: { type: 'spring', stiffness: 460, damping: 26, mass: 0.6 },
  layout: { type: 'spring', stiffness: 500, damping: 40, mass: 0.8 },
} as const satisfies Record<string, Transition>
