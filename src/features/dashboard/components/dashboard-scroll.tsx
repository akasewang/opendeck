'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'

export default function DashboardScroll({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const pathname = usePathname()

  useEffect(() => {
    if (!pathname) return
    ref.current?.scrollTo({ top: 0, left: 0 })
  }, [pathname])

  return (
    <div ref={ref} data-dashboard-scroll className="hide-scrollbar flex-1 overflow-y-auto">
      {children}
    </div>
  )
}
