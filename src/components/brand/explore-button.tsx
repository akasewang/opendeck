'use client'

import { useReducedMotion } from 'framer-motion'
import Link from 'next/link'
import { useEffect, useRef } from 'react'
import { SquareArrowOutUpRight } from '@/components/ui/icons'
import { SpinningCircularText } from './spinning-circular-text'

export default function ExploreButton() {
  const linkRef = useRef<HTMLAnchorElement>(null)
  const ringRef = useRef<HTMLDivElement>(null)
  const textRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)
  const arrowRef = useRef<HTMLSpanElement>(null)
  const prefersReducedMotion = useReducedMotion()

  useEffect(() => {
    const link = linkRef.current
    const ring = ringRef.current
    const text = textRef.current
    const inner = innerRef.current
    const arrow = arrowRef.current
    if (!link || !ring || !text || !inner || !arrow) return

    const OUTER_STRENGTH = 0.2
    const INNER_STRENGTH = 0.2
    const OUTER_MAX = 16
    const INNER_MAX = 18
    const MAG_STIFFNESS = 180
    const MAG_DAMPING = 16

    const BASE_OFFSET = 45
    const ROT_STIFFNESS = 160
    const ROT_DAMPING = 10

    const finePointer = window.matchMedia('(pointer: fine)').matches

    let cx = 0
    let cy = 0
    let radius = 0

    type Axis = { current: number; velocity: number; target: number }
    const ox: Axis = { current: 0, velocity: 0, target: 0 }
    const oy: Axis = { current: 0, velocity: 0, target: 0 }
    const ix: Axis = { current: 0, velocity: 0, target: 0 }
    const iy: Axis = { current: 0, velocity: 0, target: 0 }
    const rot: Axis = { current: 0, velocity: 0, target: 0 }

    let raf = 0
    let running = false
    let last = 0

    const measure = () => {
      const rect = link.getBoundingClientRect()
      cx = rect.left + rect.width / 2
      cy = rect.top + rect.height / 2
      radius = rect.width * 0.9
    }

    const clamp = (v: number, max: number) => Math.max(-max, Math.min(max, v))

    const step = (a: Axis, stiffness: number, damping: number, dt: number) => {
      const accel = stiffness * (a.target - a.current) - damping * a.velocity
      a.velocity += accel * dt
      a.current += a.velocity * dt
    }

    const settled = (a: Axis) =>
      Math.abs(a.target - a.current) < 0.05 && Math.abs(a.velocity) < 0.05

    const paint = () => {
      const outerT = `translate(${ox.current}px, ${oy.current}px)`
      ring.style.transform = outerT
      text.style.transform = outerT
      inner.style.transform = `translate(${ix.current}px, ${iy.current}px)`
      arrow.style.transform = `rotate(${rot.current}deg)`
    }

    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now

      step(ox, MAG_STIFFNESS, MAG_DAMPING, dt)
      step(oy, MAG_STIFFNESS, MAG_DAMPING, dt)
      step(ix, MAG_STIFFNESS, MAG_DAMPING, dt)
      step(iy, MAG_STIFFNESS, MAG_DAMPING, dt)
      step(rot, ROT_STIFFNESS, ROT_DAMPING, dt)
      paint()

      if ([ox, oy, ix, iy, rot].every(settled)) {
        for (const a of [ox, oy, ix, iy, rot]) {
          a.current = a.target
          a.velocity = 0
        }
        paint()
        running = false
        return
      }
      raf = requestAnimationFrame(tick)
    }

    const start = () => {
      if (running) return
      running = true
      last = performance.now()
      raf = requestAnimationFrame(tick)
    }

    const handleMove = (event: MouseEvent) => {
      const dx = event.clientX - cx
      const dy = event.clientY - cy

      if (Math.hypot(dx, dy) < radius) {
        ox.target = clamp(dx * OUTER_STRENGTH, OUTER_MAX)
        oy.target = clamp(dy * OUTER_STRENGTH, OUTER_MAX)
        ix.target = clamp(dx * INNER_STRENGTH, INNER_MAX)
        iy.target = clamp(dy * INNER_STRENGTH, INNER_MAX)
      } else {
        ox.target = 0
        oy.target = 0
        ix.target = 0
        iy.target = 0
      }

      const angle = (Math.atan2(dy, dx) * 180) / Math.PI + BASE_OFFSET
      rot.target += ((((angle - rot.target) % 360) + 540) % 360) - 180

      start()
    }

    measure()
    if (prefersReducedMotion || !finePointer) return

    window.addEventListener('mousemove', handleMove)
    window.addEventListener('resize', measure)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('resize', measure)
      ring.style.transform = ''
      text.style.transform = ''
      inner.style.transform = ''
      arrow.style.transform = ''
    }
  }, [prefersReducedMotion])

  return (
    <Link
      ref={linkRef}
      href="/dashboard"
      aria-label="Explore OpenDeck"
      className="group fixed bottom-6 right-4 z-40 flex h-32 w-32 cursor-pointer items-center justify-center outline-none sm:bottom-8 sm:right-8 sm:h-40 sm:w-40"
    >
      <div
        ref={ringRef}
        className="absolute inset-0 flex items-center justify-center will-change-transform"
      >
        <div className="absolute h-[112px] w-[112px] rounded-full bg-background/80 ring-1 ring-inset ring-foreground/20 backdrop-blur-sm sm:h-[140px] sm:w-[140px]" />

        <div ref={innerRef} className="relative z-10 will-change-transform">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground ring-1 ring-inset ring-primary transition duration-300 group-hover:scale-110 group-hover:bg-accent group-hover:ring-accent sm:h-16 sm:w-16">
            <span ref={arrowRef} className="inline-flex">
              <SquareArrowOutUpRight size={28} />
            </span>
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 [--explore-ring-font-size:9.2px] [--explore-ring-radius:-40.8px] sm:[--explore-ring-font-size:11.5px] sm:[--explore-ring-radius:-51px]">
        <div ref={textRef} className="will-change-transform">
          <SpinningCircularText
            text="EXPLORE OPENDECK • DISCOVER NOW • "
            charSpacing={1.35}
            fontSize="var(--explore-ring-font-size)"
            spinClassName="[animation-duration:10s] group-hover:[animation-duration:3.5s]"
            className="font-sans font-bold tracking-[0.25em] text-primary"
            style={{ '--sc-radius': 'var(--explore-ring-radius)' } as React.CSSProperties}
          />
        </div>
      </div>
    </Link>
  )
}
