import type { CSSProperties } from 'react'
import LANGUAGE_COLORS from '@/features/repositories/data/language-colors.json'
import { hexToOklch, maxSrgbChroma } from '@/utils/oklch'

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

const PILL_LIGHTNESS = 0.8
const PILL_CHROMA_BOOST = 1.35
const PILL_CHROMA_CAP = 0.16
const PILL_CHROMA_FLOOR = 0.1
const PILL_NEUTRAL_CHROMA = 0.02
const PILL_GAMUT_SAFETY = 0.95
const HEX_COLOR = /^#[0-9a-f]{6}$/i

const tintFromOklch = (chroma: number, hue: number): CSSProperties => {
  const ceiling = Math.min(maxSrgbChroma(PILL_LIGHTNESS, hue) * PILL_GAMUT_SAFETY, PILL_CHROMA_CAP)
  const floor = Math.min(PILL_CHROMA_FLOOR, ceiling)
  const tuned = chroma < PILL_NEUTRAL_CHROMA ? 0 : clamp(chroma * PILL_CHROMA_BOOST, floor, ceiling)

  const base = `${PILL_LIGHTNESS} ${tuned.toFixed(3)} ${hue.toFixed(1)}`
  return {
    color: `oklch(${base})`,
    backgroundColor: `oklch(${base} / 0.15)`,
    borderColor: `oklch(${base} / 0.35)`,
  }
}

const fallbackHue = (language: string): number => {
  let hash = 0
  for (let i = 0; i < language.length; i++) {
    hash = (Math.imul(31, hash) + language.charCodeAt(i)) | 0
  }
  return Math.abs(hash) % 360
}

const colorMap = LANGUAGE_COLORS as Record<string, string>
const languageStyleCache = new Map<string, CSSProperties>()
const dateFormatter = new Intl.DateTimeFormat('en', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
})

export const getLanguageTagStyle = (language: string): CSSProperties => {
  const normalizedLanguage = language.toLowerCase()
  const hex = colorMap[normalizedLanguage]
  const usable = hex && HEX_COLOR.test(hex)
  const cacheKey = usable ? normalizedLanguage : language
  const cached = languageStyleCache.get(cacheKey)
  if (cached) return cached

  let style: CSSProperties
  if (usable) {
    const { c, h } = hexToOklch(hex)
    style = tintFromOklch(c, h)
  } else {
    style = tintFromOklch(PILL_CHROMA_CAP, fallbackHue(language))
  }

  languageStyleCache.set(cacheKey, style)
  return style
}

export const cleanReadme = (text?: string | null): string | null => {
  if (!text) return null
  const cleaned = text
    .replace(/\[!\[[^\]]*\]\([^)]*\)\]\([^)]*\)/g, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/`{1,3}/g, '')
    .replace(/(\*\*|__|~~)/g, '')
    .replace(/(^|\s)#{1,6}\s+/g, '$1')
    .replace(/(^|\s)[*\-+]\s+/g, '$1')
    .replace(/(^|\s)>\s+/g, '$1')
    .replace(/[ \t]*\|[ \t]*/g, ' ')
    .replace(/\[\]\([^)]*\)/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  return cleaned || null
}

export const formatRelativeTime = (value?: string | null): string | null => {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null

  const days = Math.floor((Date.now() - date.getTime()) / (24 * 60 * 60 * 1000))
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 30) return `${days}d ago`
  if (days < 365) return `${Math.floor(days / 30)}mo ago`
  return `${Math.floor(days / 365)}y ago`
}

export const formatDate = (value?: string | null): string | null => {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null

  return dateFormatter.format(date)
}
