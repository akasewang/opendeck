'use client'

import { motion, type Variants } from 'framer-motion'
import { ArrowUp } from '@/components/ui/icons'
import { MOTION_DURATION_SECONDS, MOTION_EASING, MOTION_SPRING } from '@/config/motion'
import { cn } from '@/utils/cn'

export const BACK_TO_TOP_REVEAL_OFFSET = 160

const BUTTON_VARIANTS: Variants = {
  rest: { scale: 1 },
  hover: { scale: 1.05 },
  tap: { scale: 0.93 },
}

const ARROW_VARIANTS: Variants = {
  rest: { y: 0 },
  hover: { y: -2 },
  tap: { y: 0 },
}

const SIZE_STYLES = {
  compact: {
    button:
      'h-9 w-9 rounded-md shadow-[0_10px_30px_oklch(0%_0_0_/_0.32)] hover:shadow-[0_14px_40px_oklch(0%_0_0_/_0.4)]',
    icon: 18,
  },
  default: {
    button: 'h-12 w-12 rounded-lg shadow-floating hover:shadow-floating-hover',
    icon: 22,
  },
} as const

export function BackToTopButton({
  onClick,
  size = 'default',
  className,
}: {
  onClick: () => void
  size?: keyof typeof SIZE_STYLES
  className?: string
}) {
  const styles = SIZE_STYLES[size]

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{
        opacity: 0,
        y: 6,
        scale: 0.94,
        transition: { duration: MOTION_DURATION_SECONDS.fast, ease: MOTION_EASING.exit },
      }}
      transition={{
        ...MOTION_SPRING.responsive,
        mass: 0.7,
        opacity: { duration: MOTION_DURATION_SECONDS.standard, ease: MOTION_EASING.standard },
      }}
      className={className}
    >
      <motion.button
        type="button"
        onClick={onClick}
        aria-label="Back to top"
        initial="rest"
        animate="rest"
        whileHover="hover"
        whileTap="tap"
        variants={BUTTON_VARIANTS}
        transition={MOTION_SPRING.compact}
        className={cn(
          'flex items-center justify-center border border-border/60 bg-sidebar/95 text-muted-foreground backdrop-blur transition-[color,box-shadow] hover:text-primary',
          styles.button,
        )}
      >
        <motion.span variants={ARROW_VARIANTS} transition={MOTION_SPRING.arrow} className="flex">
          <ArrowUp size={styles.icon} />
        </motion.span>
      </motion.button>
    </motion.div>
  )
}
