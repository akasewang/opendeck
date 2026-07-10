'use client'

import { usePathname } from 'next/navigation'
import { useEffect } from 'react'

export default function ScrollEndShake() {
  const pathname = usePathname()

  useEffect(() => {
    if (pathname?.startsWith('/dashboard')) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let shaking = false
    let activeElement: HTMLElement | null = null
    let animationEndHandler: (() => void) | null = null
    let timeoutId: number | null = null

    const clearShake = () => {
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId)
        timeoutId = null
      }
      if (activeElement && animationEndHandler) {
        activeElement.removeEventListener('animationend', animationEndHandler)
      }
      activeElement?.classList.remove('page-shake')
      activeElement = null
      animationEndHandler = null
      shaking = false
    }

    const target = () =>
      document.querySelector<HTMLElement>('.page-shake-target') ??
      document.querySelector<HTMLElement>('.curtain-page') ??
      document.body

    const trigger = () => {
      if (shaking) return
      const el = target()
      shaking = true
      window.dispatchEvent(new CustomEvent('opendeck:page-shake'))
      el.classList.add('page-shake')
      if ('vibrate' in navigator) navigator.vibrate?.(12)

      const done = () => clearShake()
      activeElement = el
      animationEndHandler = done
      el.addEventListener('animationend', done)
      timeoutId = window.setTimeout(done, 600)
    }

    const scrollerFrom = (node: EventTarget | null): HTMLElement | Document => {
      let el = node as HTMLElement | null
      while (el && el !== document.body) {
        const oy = getComputedStyle(el).overflowY
        if ((oy === 'auto' || oy === 'scroll') && el.scrollHeight > el.clientHeight) {
          return el
        }
        el = el.parentElement
      }
      return document
    }

    const atBottom = (scroller: HTMLElement | Document) => {
      const el =
        scroller === document
          ? (document.scrollingElement ?? document.documentElement)
          : (scroller as HTMLElement)
      return el.scrollTop + el.clientHeight >= el.scrollHeight - 1
    }

    const onWheel = (e: WheelEvent) => {
      if (e.deltaY <= 0) return
      if (atBottom(scrollerFrom(e.target))) trigger()
    }

    let touchY = 0
    const onTouchStart = (e: TouchEvent) => {
      touchY = e.touches[0]?.clientY ?? 0
    }
    const onTouchMove = (e: TouchEvent) => {
      const y = e.touches[0]?.clientY ?? 0
      const pushingDown = y < touchY
      touchY = y
      if (pushingDown && atBottom(scrollerFrom(e.target))) trigger()
    }

    window.addEventListener('wheel', onWheel, { passive: true })
    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: true })
    return () => {
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onTouchMove)
      clearShake()
    }
  }, [pathname])

  return null
}
