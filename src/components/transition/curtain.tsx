'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'

const EXPO_IN_OUT = 'cubic-bezier(0.87, 0, 0.13, 1)'
const POWER1_IN = 'cubic-bezier(0.55, 0.085, 0.68, 0.53)'
const POWER2_IN = 'cubic-bezier(0.55, 0.055, 0.675, 0.19)'
const POWER2_OUT = 'cubic-bezier(0.215, 0.61, 0.355, 1)'

const PANEL_MS = 850
const PAGE_MS = 520
const PAGE_LIFT = 72
const PAGE_DROP = 56
const REVEAL_DELAY = 40
const REVEAL_PAGE_AT = 180

const ROUTE_LABELS: Record<string, string> = {
  '/': 'home',
  '/info': 'info',
  '/dashboard': 'dashboard',
  '/dashboard/trending': 'trending',
  '/dashboard/discover': 'discover',
  '/dashboard/organizations': 'organizations',
}

function labelFor(pathname: string) {
  const direct = ROUTE_LABELS[pathname]
  if (direct) return direct
  const seg = pathname.split('/').filter(Boolean).pop()
  return seg ?? 'opendeck'
}

function inDashboard(path: string) {
  return path === '/dashboard' || path.startsWith('/dashboard/')
}

function shouldSkipCurtain(from: string, to: string) {
  return inDashboard(from) && inDashboard(to)
}

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

type Layout = { fontSize: number | null; rows: number; perRow: number; marginEm: number }
const HERO_PROBE = 'OPENDECK'
const PROBE_PX = 100
const HERO_SCALE = 0.42
const ROW_GAP_RATIO = 0.03
const PAD = 24

function useLabelLayout(label: string): Layout {
  const [layout, setLayout] = useState<Layout>({ fontSize: null, rows: 4, perRow: 3, marginEm: 0 })

  useEffect(() => {
    let cancelled = false

    const sync = async () => {
      await document.fonts?.ready
      if (cancelled || !label) return

      const fontFamily =
        getComputedStyle(document.documentElement).getPropertyValue('--font-display') ||
        'sans-serif'
      const ctx = document.createElement('canvas').getContext('2d')
      if (!ctx) return
      ctx.font = `${PROBE_PX}px ${fontFamily}`

      const heroWidth = ctx.measureText(HERO_PROBE).width
      const m = ctx.measureText(label.toUpperCase())
      const inkRatio = (m.actualBoundingBoxAscent + m.actualBoundingBoxDescent) / PROBE_PX
      if (!heroWidth || !m.width || !inkRatio) return

      const availW = window.innerWidth - PAD * 2
      const availH = window.innerHeight - PAD * 2
      const desired = (PROBE_PX * availW * HERO_SCALE) / heroWidth
      const wordW = (m.width / PROBE_PX) * desired
      const perRow = Math.max(1, Math.floor(availW / wordW))
      const fontSize = (desired * availW) / (perRow * wordW)
      const rowAdvance = inkRatio + ROW_GAP_RATIO

      if (cancelled) return
      setLayout({
        fontSize,
        perRow,
        rows: Math.max(1, Math.floor(availH / (fontSize * rowAdvance))),
        marginEm: -(1 - rowAdvance),
      })
    }

    void sync()
    const onResize = () => void sync()
    window.addEventListener('resize', onResize, { passive: true })
    return () => {
      cancelled = true
      window.removeEventListener('resize', onResize)
    }
  }, [label])

  return layout
}

export default function CurtainProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()

  const pageRef = useRef<HTMLDivElement>(null)
  const blurRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const phaseRef = useRef<'idle' | 'covering' | 'covered' | 'revealing'>('idle')
  const anims = useRef<Animation[]>([])
  const timeoutIds = useRef<number[]>([])
  const frameIds = useRef<number[]>([])
  const pendingPathRef = useRef<string | null>(null)
  const [label, setLabel] = useState('opendeck')
  const layout = useLabelLayout(label)

  const clearAnims = useCallback(() => {
    anims.current.forEach((a) => {
      a.cancel()
    })
    anims.current = []
  }, [])
  const track = useCallback((a: Animation) => {
    anims.current.push(a)
    return a
  }, [])
  const clearScheduled = useCallback(() => {
    timeoutIds.current.forEach((id) => {
      window.clearTimeout(id)
    })
    frameIds.current.forEach((id) => {
      window.cancelAnimationFrame(id)
    })
    timeoutIds.current = []
    frameIds.current = []
  }, [])
  const scheduleTimeout = useCallback((callback: () => void, delay: number) => {
    const id = window.setTimeout(() => {
      timeoutIds.current = timeoutIds.current.filter((timeoutId) => timeoutId !== id)
      callback()
    }, delay)
    timeoutIds.current.push(id)
    return id
  }, [])
  const scheduleFrame = useCallback((callback: () => void) => {
    const id = window.requestAnimationFrame(() => {
      frameIds.current = frameIds.current.filter((frameId) => frameId !== id)
      callback()
    })
    frameIds.current.push(id)
    return id
  }, [])

  const lockScroll = useCallback(() => {
    document.documentElement.style.overflow = 'hidden'
  }, [])
  const unlockScroll = useCallback(() => {
    document.documentElement.style.overflow = ''
  }, [])

  const playCover = useCallback(async () => {
    const panel = panelRef.current
    const blur = blurRef.current
    const page = pageRef.current
    if (!panel || !blur) return

    clearScheduled()
    clearAnims()
    blur.style.pointerEvents = 'auto'
    panel.style.opacity = '1'
    const panelAnim = track(
      panel.animate([{ transform: 'translateY(100%)' }, { transform: 'translateY(0%)' }], {
        duration: PANEL_MS,
        easing: EXPO_IN_OUT,
        fill: 'forwards',
      }),
    )
    track(
      blur.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: 180,
        easing: POWER1_IN,
        fill: 'forwards',
      }),
    )
    if (page) {
      page.classList.remove('page-shake')
      track(
        page.animate(
          [{ transform: 'translateY(0px)' }, { transform: `translateY(-${PAGE_LIFT}px)` }],
          { duration: PAGE_MS, easing: POWER2_IN, fill: 'forwards' },
        ),
      )
    }
    await panelAnim.finished.catch(() => {})
  }, [clearAnims, clearScheduled, track])

  const finishReveal = useCallback(() => {
    const panel = panelRef.current
    const blur = blurRef.current
    const page = pageRef.current
    if (panel) {
      panel.style.transform = 'translateY(100%)'
      panel.style.opacity = '0'
    }
    if (blur) {
      blur.style.opacity = '0'
      blur.style.pointerEvents = 'none'
    }
    if (page) page.style.transform = ''
    clearScheduled()
    clearAnims()
    unlockScroll()
    phaseRef.current = 'idle'
  }, [clearAnims, clearScheduled, unlockScroll])

  const playReveal = useCallback(async () => {
    const panel = panelRef.current
    const blur = blurRef.current
    const page = pageRef.current
    if (!panel || !blur) {
      finishReveal()
      return
    }

    clearScheduled()
    clearAnims()
    await wait(REVEAL_DELAY)

    panel.style.opacity = '1'
    if (page) page.style.transform = `translateY(${PAGE_DROP}px)`

    const panelAnim = track(
      panel.animate([{ transform: 'translateY(0%)' }, { transform: 'translateY(-100%)' }], {
        duration: PANEL_MS,
        easing: EXPO_IN_OUT,
        fill: 'forwards',
      }),
    )
    scheduleTimeout(() => {
      if (blurRef.current) {
        track(
          blurRef.current.animate([{ opacity: 1 }, { opacity: 0 }], {
            duration: 250,
            easing: POWER2_OUT,
            fill: 'forwards',
          }),
        )
      }
    }, PANEL_MS - 300)
    scheduleTimeout(() => {
      if (pageRef.current) {
        track(
          pageRef.current.animate(
            [{ transform: `translateY(${PAGE_DROP}px)` }, { transform: 'translateY(0px)' }],
            { duration: PAGE_MS, easing: POWER2_OUT, fill: 'forwards' },
          ),
        )
      }
    }, REVEAL_PAGE_AT)

    await panelAnim.finished.catch(() => {})
    finishReveal()
  }, [clearAnims, clearScheduled, finishReveal, scheduleTimeout, track])

  const revealCommittedRoute = useCallback(() => {
    if (phaseRef.current !== 'covered') return

    phaseRef.current = 'revealing'
    pendingPathRef.current = null

    scheduleFrame(() => {
      scheduleFrame(() => {
        void playReveal()
      })
    })
  }, [playReveal, scheduleFrame])

  useEffect(() => {
    return () => {
      clearScheduled()
      clearAnims()
      unlockScroll()
    }
  }, [clearAnims, clearScheduled, unlockScroll])

  const navigate = useCallback(
    async (href: string) => {
      if (phaseRef.current !== 'idle') return
      const url = new URL(href, window.location.href)
      const target = url.pathname + url.search + url.hash
      if (target === `${window.location.pathname}${window.location.search}${window.location.hash}`)
        return
      if (url.pathname === window.location.pathname) {
        router.push(target)
        return
      }

      const targetPath = url.pathname

      if (
        shouldSkipCurtain(window.location.pathname, url.pathname) ||
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ) {
        router.push(target)
        return
      }

      phaseRef.current = 'covering'
      pendingPathRef.current = targetPath
      setLabel(labelFor(url.pathname))
      router.prefetch(target)
      lockScroll()
      await playCover()
      phaseRef.current = 'covered'
      router.push(target)
    },
    [lockScroll, playCover, router],
  )

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (
        e.defaultPrevented ||
        e.button !== 0 ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey
      ) {
        return
      }
      const anchor = (e.target as HTMLElement | null)?.closest('a')
      if (!anchor) return
      const href = anchor.getAttribute('href')
      if (!href || anchor.target === '_blank' || anchor.hasAttribute('download')) return

      const url = new URL(anchor.href, window.location.href)
      if (url.origin !== window.location.origin) return
      if (url.pathname === window.location.pathname) return

      if (shouldSkipCurtain(window.location.pathname, url.pathname)) return

      e.preventDefault()
      e.stopPropagation()
      void navigate(href)
    }

    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [navigate])

  useEffect(() => {
    if (!pathname) return
    if (phaseRef.current === 'covered' && pendingPathRef.current === pathname) {
      revealCommittedRoute()
    }
  }, [pathname, revealCommittedRoute])

  const labelText = label.toUpperCase()
  const rowStyle = layout.fontSize
    ? { fontSize: `${layout.fontSize}px`, marginTop: `${layout.marginEm}em` }
    : undefined

  return (
    <>
      <div className="curtain-page-shell">
        <div ref={pageRef} className="curtain-page page-shake-target">
          {children}
        </div>
      </div>

      <div
        ref={blurRef}
        className="curtain-blur pointer-events-none fixed inset-0 z-[90] opacity-0"
      />

      <div
        ref={panelRef}
        aria-hidden="true"
        className="curtain-panel pointer-events-none fixed inset-0 z-[100] overflow-hidden bg-primary opacity-0"
        style={{ transform: 'translateY(100%)' }}
      >
        <div
          className="pointer-events-none absolute inset-0 flex select-none flex-col justify-between"
          style={{ padding: PAD }}
        >
          {Array.from({ length: layout.rows }).map((_, row) => (
            <div
              key={row}
              style={rowStyle}
              className="font-display flex w-full justify-between whitespace-nowrap text-[7vw] uppercase leading-none"
            >
              {Array.from({ length: layout.perRow }).map((_, word) => (
                <span
                  key={word}
                  className={
                    row === layout.rows - 1 && word === layout.perRow - 1
                      ? 'text-primary-foreground'
                      : 'curtain-word-outline'
                  }
                >
                  {labelText}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
