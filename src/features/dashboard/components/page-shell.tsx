'use client'

import { type HTMLMotionProps, motion } from 'framer-motion'
import { cn } from '@/utils/cn'

type PageShellProps = HTMLMotionProps<'section'> & {
  className?: string
}

export default function PageShell({ children, className, ...props }: PageShellProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className={cn('relative z-10 min-h-full w-full p-4 sm:px-6 sm:py-5 md:pl-0', className)}
      {...props}
    >
      {children}
    </motion.section>
  )
}
