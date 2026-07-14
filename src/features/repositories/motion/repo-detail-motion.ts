import type { Variants } from 'framer-motion'
import { MOTION_SPRING } from '@/config/motion'

export const detailSectionStagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05, delayChildren: 0.03 } },
}

export const expandedSectionStagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.04 } },
}

export const sectionItem: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: MOTION_SPRING.standard },
}

export const groupStagger: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: { ...MOTION_SPRING.standard, staggerChildren: 0.04 },
  },
}

export const chipItem: Variants = {
  hidden: { opacity: 0, scale: 0.85 },
  show: { opacity: 1, scale: 1, transition: MOTION_SPRING.chip },
}
