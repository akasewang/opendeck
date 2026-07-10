'use client'

import { useEffect, useState } from 'react'
import { formatHomeClock } from '@/features/landing/utils/format-home-clock'

export function useHomeClock(intervalMs = 1000) {
  const [clock, setClock] = useState('')

  useEffect(() => {
    const tick = () => setClock(formatHomeClock(new Date()))

    tick()
    const timer = window.setInterval(tick, intervalMs)
    return () => window.clearInterval(timer)
  }, [intervalMs])

  return clock
}
