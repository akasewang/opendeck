'use client'

import { Icon } from '@iconify/react'
import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { cn } from '@/utils/cn'

type ToastTone = 'success' | 'error'
type ToastItem = { id: number; message: string; tone: ToastTone }

let counter = 0
let items: ToastItem[] = []
const listeners = new Set<(items: ToastItem[]) => void>()

const emit = () => {
  for (const listener of listeners) listener(items)
}

export function toast(message: string, options?: { tone?: ToastTone }) {
  const id = ++counter
  const tone = options?.tone ?? 'success'
  items = [...items, { id, message, tone }]
  emit()
  setTimeout(
    () => {
      items = items.filter((item) => item.id !== id)
      emit()
    },
    tone === 'error' ? 3200 : 2200,
  )
}

export function Toaster() {
  const [active, setActive] = useState<ToastItem[]>([])

  useEffect(() => {
    listeners.add(setActive)
    setActive(items)
    return () => {
      listeners.delete(setActive)
    }
  }, [])

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4">
      <AnimatePresence initial={false}>
        {active.map((item) => (
          <motion.div
            key={item.id}
            layout
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="pointer-events-auto inline-flex items-center gap-2 rounded-lg border border-border/60 bg-background/95 px-3.5 py-2 text-sm font-medium text-foreground shadow-lg backdrop-blur-sm"
          >
            <Icon
              icon={item.tone === 'error' ? 'ri:error-warning-line' : 'ri:checkbox-circle-line'}
              className={cn(
                'h-4 w-4 shrink-0',
                item.tone === 'error' ? 'text-destructive' : 'text-success',
              )}
            />
            {item.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
