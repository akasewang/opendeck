'use client'

import { useReducedMotion } from 'framer-motion'
import Image from 'next/image'
import { useEffect, useRef } from 'react'

export type ScatterItem = {
  id: string
  name: string
  imgUrl: string
}

const SIZE = 54
const RADIUS = SIZE / 2

const DT = 1000 / 60
const MAX_SUBSTEPS = 5
const MAX_STEP = RADIUS * 0.85

const GRAVITY = 0.5
const DAMPING = 0.99
const GROUND_FRICTION = 0.7
const COLLISION_ITERS = 3
const RELAX = 0.8

const REPEL_RADIUS = 165
const REPEL_FORCE = 4.5
const SWIPE_FACTOR = 0.2
const POINTER_CLAMP = 45
const EDGE_BIAS = 0.5

const SPIN_KICK = 0.12
const SPIN_TRANSFER = 0.03
const SPIN_DAMP = 0.9
const SPIN_STOP = 0.4
const REST_SPEED = 0.6

const SETTLE_EPS = 0.3

export default function RepoScatter({ items }: { items: ScatterItem[] }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const nodeRefs = useRef<(HTMLDivElement | null)[]>([])
  const prefersReducedMotion = useReducedMotion()

  useEffect(() => {
    const container = containerRef.current
    if (!container || !items.length) return

    const count = items.length
    const setNodeSize = () => {
      for (let i = 0; i < count; i++) {
        const node = nodeRefs.current[i]
        if (node) {
          node.style.width = `${SIZE}px`
          node.style.height = `${SIZE}px`
        }
      }
    }

    setNodeSize()

    if (prefersReducedMotion) {
      const renderStatic = () => {
        const w = container.clientWidth
        const h = container.clientHeight
        const cols = Math.max(1, Math.floor(w / (SIZE * 1.75)))
        const rows = Math.max(1, Math.ceil(count / cols))
        const xGap = Math.max(SIZE, w / cols)
        const yGap = Math.max(SIZE, h / rows)

        for (let i = 0; i < count; i++) {
          const node = nodeRefs.current[i]
          if (!node) continue

          const col = i % cols
          const row = Math.floor(i / cols)
          const x = Math.min(w - SIZE, Math.max(0, col * xGap + (xGap - SIZE) / 2))
          const y = Math.min(h - SIZE, Math.max(0, row * yGap + (yGap - SIZE) / 2))
          node.style.transform = `translate3d(${x}px, ${y}px, 0)`
        }

        container.style.opacity = '1'
      }

      renderStatic()
      const observer = new ResizeObserver(renderStatic)
      observer.observe(container)
      return () => observer.disconnect()
    }

    const px = new Float64Array(count)
    const py = new Float64Array(count)
    const opx = new Float64Array(count)
    const opy = new Float64Array(count)
    const ang = new Float64Array(count)
    const spin = new Float64Array(count)
    const pointer = { x: -9999, y: -9999, vx: 0, vy: 0, active: false, seen: false }

    let w = container.clientWidth
    let h = container.clientHeight

    const edgeBiasedX = () => {
      const t = Math.random() * 2 - 1
      const biased = Math.sign(t) * Math.abs(t) ** EDGE_BIAS
      return RADIUS + ((biased + 1) / 2) * Math.max(1, w - SIZE)
    }

    for (let i = 0; i < count; i++) {
      px[i] = edgeBiasedX()
      py[i] = -(RADIUS + Math.random() * h * 1.5)
      opx[i] = px[i]
      opy[i] = py[i]
      ang[i] = Math.random() * 360
      spin[i] = (Math.random() - 0.5) * 4
    }

    const resize = () => {
      const c = containerRef.current
      if (!c) return
      w = c.clientWidth
      h = c.clientHeight
    }
    resize()

    let activity = count * MAX_STEP

    const simulate = () => {
      pointer.vx *= 0.8
      pointer.vy *= 0.8

      for (let i = 0; i < count; i++) {
        let ax = 0
        let ay = GRAVITY

        if (pointer.active) {
          const dx = px[i] - pointer.x
          const dy = py[i] - pointer.y
          const dist = Math.hypot(dx, dy) || 0.0001
          if (dist < REPEL_RADIUS) {
            const f = 1 - dist / REPEL_RADIUS
            const imp = f * f * REPEL_FORCE
            ax += (dx / dist) * imp + pointer.vx * SWIPE_FACTOR * f
            ay += (dy / dist) * imp + pointer.vy * SWIPE_FACTOR * f
            spin[i] += (dx / dist) * imp * SPIN_KICK
          }
        }

        let sx = (px[i] - opx[i]) * DAMPING + ax
        let sy = (py[i] - opy[i]) * DAMPING + ay

        const sp = Math.hypot(sx, sy)
        if (sp > MAX_STEP) {
          const k = MAX_STEP / sp
          sx *= k
          sy *= k
        }

        opx[i] = px[i]
        opy[i] = py[i]
        px[i] += sx
        py[i] += sy
      }

      for (let iter = 0; iter < COLLISION_ITERS; iter++) {
        for (let i = 0; i < count; i++) {
          for (let j = i + 1; j < count; j++) {
            const dx = px[j] - px[i]
            const dy = py[j] - py[i]
            const d2 = dx * dx + dy * dy
            if (d2 < SIZE * SIZE && d2 > 0.0001) {
              const d = Math.sqrt(d2)
              const nx = dx / d
              const ny = dy / d
              const push = (SIZE - d) * 0.5 * RELAX
              px[i] -= nx * push
              py[i] -= ny * push
              px[j] += nx * push
              py[j] += ny * push

              const rvx = px[j] - opx[j] - (px[i] - opx[i])
              const rvy = py[j] - opy[j] - (py[i] - opy[i])
              const tan = rvx * -ny + rvy * nx
              spin[i] -= tan * SPIN_TRANSFER
              spin[j] += tan * SPIN_TRANSFER
            }
          }
        }
      }

      activity = 0
      for (let i = 0; i < count; i++) {
        if (px[i] < RADIUS) {
          px[i] = RADIUS
          opx[i] = px[i]
        } else if (px[i] > w - RADIUS) {
          px[i] = w - RADIUS
          opx[i] = px[i]
        }
        if (py[i] > h - RADIUS) {
          py[i] = h - RADIUS
          opy[i] = py[i]
          opx[i] = px[i] - (px[i] - opx[i]) * GROUND_FRICTION
        }

        const linSpeed = Math.abs(px[i] - opx[i]) + Math.abs(py[i] - opy[i])
        spin[i] *= SPIN_DAMP
        if (linSpeed < REST_SPEED || Math.abs(spin[i]) < SPIN_STOP) spin[i] = 0
        ang[i] += spin[i]

        activity += linSpeed + Math.abs(spin[i])
      }
    }

    const render = () => {
      for (let i = 0; i < count; i++) {
        const node = nodeRefs.current[i]
        if (node) {
          node.style.transform = `translate3d(${px[i] - RADIUS}px, ${py[i] - RADIUS}px, 0) rotate(${ang[i]}deg)`
        }
      }
    }

    render()
    container.style.opacity = '1'

    let raf = 0
    let running = true
    let last = 0
    let acc = 0

    const frame = (now: number) => {
      if (!last) last = now - DT
      acc += now - last
      last = now
      if (acc > DT * MAX_SUBSTEPS) acc = DT * MAX_SUBSTEPS

      let stepped = false
      while (acc >= DT) {
        simulate()
        acc -= DT
        stepped = true
      }
      if (stepped) render()

      if (!pointer.active && activity / Math.max(1, count) < SETTLE_EPS) {
        running = false
        return
      }
      raf = requestAnimationFrame(frame)
    }

    const wake = () => {
      if (running) return
      running = true
      last = 0
      acc = 0
      raf = requestAnimationFrame(frame)
    }

    const onPageShake = () => {
      for (let i = 0; i < count; i++) {
        const vx = (Math.random() - 0.5) * 28
        const vy = -12 - Math.random() * 18
        opx[i] = px[i] - vx
        opy[i] = py[i] - vy
        spin[i] += (Math.random() - 0.5) * 10
      }
      activity = count * MAX_STEP
      wake()
    }

    raf = requestAnimationFrame(frame)

    const onMove = (e: PointerEvent) => {
      const c = containerRef.current
      if (!c) return
      const rect = c.getBoundingClientRect()
      const nx = e.clientX - rect.left
      const ny = e.clientY - rect.top

      if (pointer.seen) {
        pointer.vx = Math.max(-POINTER_CLAMP, Math.min(POINTER_CLAMP, nx - pointer.x))
        pointer.vy = Math.max(-POINTER_CLAMP, Math.min(POINTER_CLAMP, ny - pointer.y))
      }
      pointer.seen = true
      pointer.x = nx
      pointer.y = ny
      pointer.active =
        nx > -REPEL_RADIUS &&
        nx < rect.width + REPEL_RADIUS &&
        ny > -REPEL_RADIUS &&
        ny < rect.height + REPEL_RADIUS
      wake()
    }
    const onLeave = () => {
      pointer.active = false
      pointer.seen = false
    }

    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('opendeck:page-shake', onPageShake)
    window.addEventListener('blur', onLeave)
    document.addEventListener('pointerleave', onLeave)

    const observer = new ResizeObserver(() => {
      resize()
      wake()
    })
    observer.observe(container)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('opendeck:page-shake', onPageShake)
      window.removeEventListener('blur', onLeave)
      document.removeEventListener('pointerleave', onLeave)
      observer.disconnect()
    }
  }, [items, prefersReducedMotion])

  if (!items.length) return null

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden opacity-0 transition-opacity duration-500"
    >
      {items.map((item, i) => (
        <div
          key={item.id}
          ref={(el) => {
            nodeRefs.current[i] = el
          }}
          title={item.name}
          className="absolute left-0 top-0 rounded-lg bg-background shadow-[0_0_0_1px_oklch(0%_0_0_/_0.55),0_10px_20px_-6px_oklch(0%_0_0_/_0.7),0_3px_6px_-3px_oklch(0%_0_0_/_0.6)] will-change-transform"
        >
          <Image
            src={item.imgUrl}
            alt=""
            fill
            sizes={`${SIZE}px`}
            draggable={false}
            className="absolute inset-0 h-full w-full rounded-xl object-cover"
          />
          <div className="pointer-events-none absolute inset-0 rounded-lg bg-gradient-to-b from-white/20 via-transparent to-black/25 shadow-[inset_0_1.5px_0_0_oklch(100%_0_0_/_0.45),inset_0_-3px_6px_-1px_oklch(0%_0_0_/_0.55),inset_0_0_0_1px_oklch(100%_0_0_/_0.12)]" />
        </div>
      ))}
    </div>
  )
}
