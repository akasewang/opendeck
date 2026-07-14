'use client'

import { Icon } from '@iconify/react'
import { AnimatePresence, motion } from 'framer-motion'
import { MOTION_SPRING } from '@/config/motion'
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

const TONE_STYLES: Record<ToastTone, string> = {
  success: 'border-success/30 bg-success-surface text-success',
  error: 'border-destructive/30 bg-destructive-surface text-destructive',
}

const TONE_ICONS: Record<ToastTone, string> = {
  success: 'ri:checkbox-circle-fill',
  error: 'ri:error-warning-fill',
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
    <div
      role="region"
      aria-label="Notifications"
      className="pointer-events-none fixed left-4 right-4 top-20 z-(--z-toast) flex flex-col items-end gap-2 sm:left-auto sm:top-4"
    >
      <AnimatePresence initial={false}>
        {active.map((item) => (
          <motion.div
            key={item.id}
            role={item.tone === 'error' ? 'alert' : 'status'}
            aria-atomic="true"
            layout
            initial={{ opacity: 0, y: -10, x: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 24, scale: 0.96 }}
            transition={MOTION_SPRING.toast}
            className={cn(
              'pointer-events-auto flex w-full items-center gap-2.5 rounded-lg border px-3.5 py-2.5 text-sm font-medium shadow-lg sm:w-auto sm:max-w-md',
              TONE_STYLES[item.tone],
            )}
          >
            <Icon icon={TONE_ICONS[item.tone]} className="h-4 w-4 shrink-0" />
            <span className="min-w-0 flex-1">{item.message}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
