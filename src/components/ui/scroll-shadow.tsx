'use client'

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react'
import { BackToTopButton, BACK_TO_TOP_REVEAL_OFFSET } from '@/components/ui/back-to-top-button'
import { MOTION_DURATION_SECONDS, MOTION_EASING } from '@/config/motion'
import { cn } from '@/utils/cn'

const SHADOW_TRANSITION = {
  duration: MOTION_DURATION_SECONDS.standard,
  ease: MOTION_EASING.standard,
} as const
const SHADOW_THRESHOLD = 1

export function ScrollShadow({
  className,
  wrapperClassName,
  viewportRef,
  backToTop = false,
  backToTopClassName,
  children,
}: {
  className?: string
  wrapperClassName?: string
  viewportRef?: (node: HTMLDivElement | null) => void
  backToTop?: boolean
  backToTopClassName?: string
  children: ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  const prefersReducedMotion = useReducedMotion()
  const [showTop, setShowTop] = useState(false)
  const [showBottom, setShowBottom] = useState(false)
  const [showBackToTop, setShowBackToTop] = useState(false)

  const setViewportRef = useCallback(
    (node: HTMLDivElement | null) => {
      ref.current = node
      viewportRef?.(node)
    },
    [viewportRef],
  )

  useEffect(() => {
    const node = ref.current
    if (!node) return

    let frame = 0
    const observed = new WeakSet<Element>()

    const update = () => {
      const overflow = node.scrollHeight - node.clientHeight
      setShowTop(node.scrollTop > SHADOW_THRESHOLD)
      setShowBottom(overflow > SHADOW_THRESHOLD && node.scrollTop < overflow - SHADOW_THRESHOLD)
      setShowBackToTop(node.scrollTop > BACK_TO_TOP_REVEAL_OFFSET)
    }

    const scheduleUpdate = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(update)
    }

    const resizeObserver = new ResizeObserver(scheduleUpdate)
    const observeElement = (element: Element) => {
      if (observed.has(element)) return
      observed.add(element)
      resizeObserver.observe(element)
    }
    const observeScrollableContent = () => {
      observeElement(node)
      for (const child of Array.from(node.children)) observeElement(child)
    }

    update()
    node.addEventListener('scroll', update, { passive: true })

    observeScrollableContent()
    const mutationObserver = new MutationObserver(() => {
      observeScrollableContent()
      scheduleUpdate()
    })
    mutationObserver.observe(node, { childList: true, subtree: true })

    return () => {
      cancelAnimationFrame(frame)
      node.removeEventListener('scroll', update)
      resizeObserver.disconnect()
      mutationObserver.disconnect()
    }
  }, [])

  const scrollToTop = useCallback(() => {
    ref.current?.scrollTo({
      top: 0,
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
    })
  }, [prefersReducedMotion])

  return (
    <div
      data-scrolled={showTop ? '' : undefined}
      className={cn('group/scroll relative', wrapperClassName)}
    >
      <div ref={setViewportRef} className={cn('h-full overflow-auto', className)}>
        {children}
      </div>

      <motion.div
        aria-hidden="true"
        initial={false}
        animate={{ opacity: showTop ? 1 : 0 }}
        transition={SHADOW_TRANSITION}
        className="pointer-events-none absolute inset-x-0 top-0 h-6 bg-gradient-to-b from-black/45 via-black/10 to-transparent"
      />
      <motion.div
        aria-hidden="true"
        initial={false}
        animate={{ opacity: showBottom ? 1 : 0 }}
        transition={SHADOW_TRANSITION}
        className="pointer-events-none absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-black/45 via-black/10 to-transparent"
      />

      <AnimatePresence>
        {backToTop && showBackToTop && (
          <BackToTopButton
            onClick={scrollToTop}
            size="compact"
            className={cn('absolute bottom-3 right-3 z-20', backToTopClassName)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
