'use client'

import {
  type ElementType,
  type Ref,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import { cn } from '@/utils/cn'

let audioCtx: AudioContext | null = null
let unlockInstalled = false
const AUDIO_UNLOCK_EVENTS = ['pointerdown', 'click', 'keydown', 'touchstart'] as const

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!audioCtx) {
    const AC =
      window.AudioContext ??
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return null
    audioCtx = new AC()
  }
  return audioCtx
}

function installAudioUnlock() {
  if (unlockInstalled || typeof window === 'undefined') return
  unlockInstalled = true
  const unlock = () => {
    void getCtx()
      ?.resume()
      .catch(() => {})
    AUDIO_UNLOCK_EVENTS.forEach((ev) => {
      window.removeEventListener(ev, unlock)
    })
  }
  AUDIO_UNLOCK_EVENTS.forEach((ev) => {
    window.addEventListener(ev, unlock, { passive: true })
  })
}

const BASE_FREQUENCY = 523.25
const SEMITONE_RANGE = 14

function emitNote(ctx: AudioContext, index: number, total: number, volume: number) {
  const progress = total <= 1 ? 0.5 : index / (total - 1)
  const semitones = Math.round((progress - 0.5) * SEMITONE_RANGE)
  const freq = BASE_FREQUENCY * 2 ** (semitones / 12)

  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'sine'
  osc.frequency.value = freq

  const now = ctx.currentTime
  gain.gain.setValueAtTime(0, now)
  gain.gain.linearRampToValueAtTime(volume, now + 0.004)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18)

  osc.connect(gain).connect(ctx.destination)
  osc.start(now)
  osc.stop(now + 0.2)
}

function playNote(index: number, total: number, volume: number) {
  const ctx = getCtx()
  if (!ctx) return

  if (ctx.state === 'running') {
    emitNote(ctx, index, total, volume)
    return
  }

  ctx
    .resume()
    .then(() => {
      if (ctx.state === 'running') emitNote(ctx, index, total, volume)
    })
    .catch(() => {})
}

type PianoTitleProps = {
  text?: string
  fitText?: string
  className?: string
  letterClassName?: string
  sound?: boolean
  volume?: number
  as?: ElementType
  interactive?: boolean
}

export default function PianoTitle({
  text = 'OPENDECK',
  fitText,
  className,
  letterClassName,
  sound = true,
  volume = 0.24,
  as: Tag = 'div',
  interactive = true,
}: PianoTitleProps) {
  const containerRef = useRef<HTMLElement | null>(null)
  const lettersRef = useRef<HTMLSpanElement | null>(null)
  const measureRef = useRef<HTMLSpanElement | null>(null)
  const letters = Array.from(text)
  const fitLetters = Array.from(fitText ?? text)
  const [pulsing, setPulsing] = useState<boolean[]>(() => letters.map(() => false))

  const fitToWidth = useCallback(() => {
    const el = lettersRef.current
    const container = containerRef.current
    if (!el || !container) return

    const BASE_FONT_SIZE_PX = 100
    el.style.fontSize = `${BASE_FONT_SIZE_PX}px`
    if (measureRef.current) {
      measureRef.current.style.fontSize = `${BASE_FONT_SIZE_PX}px`
    }

    const naturalWidth = (measureRef.current ?? el).getBoundingClientRect().width
    if (!naturalWidth) return

    el.style.fontSize = `${(BASE_FONT_SIZE_PX * container.clientWidth) / naturalWidth}px`
  }, [])

  useLayoutEffect(() => {
    fitToWidth()

    const container = containerRef.current
    const observer = new ResizeObserver(() => fitToWidth())
    if (container) observer.observe(container)

    let cancelled = false
    document.fonts?.ready?.then(() => {
      if (!cancelled) fitToWidth()
    })

    return () => {
      cancelled = true
      observer.disconnect()
    }
  }, [fitToWidth])

  useEffect(() => {
    setPulsing(Array.from(text).map(() => false))
  }, [text])

  useEffect(() => {
    if (sound) installAudioUnlock()
  }, [sound])

  const handleEnter = (i: number) => {
    setPulsing((prev) => {
      if (prev[i]) return prev
      const next = [...prev]
      next[i] = true
      return next
    })
    if (sound) playNote(i, letters.length, volume)
  }

  const handleAnimationEnd = (i: number) => {
    setPulsing((prev) => {
      if (!prev[i]) return prev
      const next = [...prev]
      next[i] = false
      return next
    })
  }

  return (
    <Tag
      ref={containerRef as Ref<HTMLElement>}
      className={cn('relative block w-full leading-none text-primary', className)}
    >
      <span className="sr-only">{text}</span>
      <span
        ref={lettersRef}
        aria-hidden="true"
        className="inline-block whitespace-nowrap uppercase leading-none [text-box-edge:cap_alphabetic] [text-box-trim:trim-both]"
      >
        {letters.map((char, i) => (
          <span
            key={i}
            onPointerEnter={interactive ? () => handleEnter(i) : undefined}
            onAnimationEnd={() => handleAnimationEnd(i)}
            className={cn(
              'piano-letter inline-block cursor-default leading-none [text-box-edge:cap_alphabetic] [text-box-trim:trim-both] will-change-transform',
              letterClassName,
            )}
            style={pulsing[i] ? { animation: 'piano-key 0.45s ease-out' } : undefined}
          >
            {char === ' ' ? ' ' : char}
          </span>
        ))}
      </span>
      {fitText && fitText !== text && (
        <span
          ref={measureRef}
          aria-hidden="true"
          className="pointer-events-none invisible absolute left-0 top-0 inline-block whitespace-nowrap uppercase leading-none [text-box-edge:cap_alphabetic] [text-box-trim:trim-both]"
        >
          {fitLetters.map((char, i) => (
            <span
              key={i}
              className={cn(
                'piano-letter inline-block leading-none [text-box-edge:cap_alphabetic] [text-box-trim:trim-both]',
                letterClassName,
              )}
            >
              {char === ' ' ? ' ' : char}
            </span>
          ))}
        </span>
      )}
    </Tag>
  )
}
