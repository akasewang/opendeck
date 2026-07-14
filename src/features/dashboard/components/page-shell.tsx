'use client'

import { type HTMLMotionProps, motion } from 'framer-motion'
import { MOTION_DURATION_SECONDS, MOTION_EASING } from '@/config/motion'
import { cn } from '@/utils/cn'

type PageShellProps = HTMLMotionProps<'section'> & {
  className?: string
}

export default function PageShell({ children, className, ...props }: PageShellProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: MOTION_DURATION_SECONDS.slow, ease: MOTION_EASING.enter }}
      className={cn('relative z-10 min-h-full w-full p-4 sm:px-6 sm:py-5 md:pl-2', className)}
      {...props}
    >
      {children}
    </motion.section>
  )
}
