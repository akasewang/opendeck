import type { CSSProperties } from 'react'
import LANGUAGE_COLORS from '@/features/repositories/data/language-colors.json'
import type { GithubRepoApiItem, Repo } from '@/features/repositories/types'
import { formatNumber } from '@/utils/format-number'

export { formatNumber }

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

const hexToHsl = (hex: string): { h: number; s: number; l: number } => {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const delta = max - min
  const l = (max + min) / 2

  let h = 0
  if (delta !== 0) {
    if (max === r) h = ((g - b) / delta) % 6
    else if (max === g) h = (b - r) / delta + 2
    else h = (r - g) / delta + 4
    h = (h * 60 + 360) % 360
  }
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1))
  return { h, s: s * 100, l: l * 100 }
}

const tintFromHsl = (h: number, s: number, l: number): CSSProperties => {
  const sat = clamp(s, 0, 85)
  const lightness = clamp(l, 62, 80)
  const base = `${h.toFixed(0)} ${sat.toFixed(0)}% ${lightness.toFixed(0)}%`
  return {
    color: `hsl(${base})`,
    backgroundColor: `hsl(${base} / 0.14)`,
    borderColor: `hsl(${base} / 0.32)`,
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
  const cacheKey = hex ? normalizedLanguage : language
  const cached = languageStyleCache.get(cacheKey)
  if (cached) return cached

  let style: CSSProperties
  if (hex) {
    const { h, s, l } = hexToHsl(hex)
    style = tintFromHsl(h, s, l)
  } else {
    style = tintFromHsl(fallbackHue(language), 50, 55)
  }

  languageStyleCache.set(cacheKey, style)
  return style
}

const repoIdentity = (repo: Repo) => repo.id ?? repo.full_name ?? repo.html_url ?? repo.name

export const mergeUniqueRepos = (current: Repo[], next: Repo[]) => {
  const seen = new Set(current.map(repoIdentity))
  const unique = next.filter((repo) => {
    const id = repoIdentity(repo)
    if (seen.has(id)) return false
    seen.add(id)
    return true
  })

  return [...current, ...unique]
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

export const mapApiRepo = (repo: GithubRepoApiItem, descriptionFallback?: string): Repo => {
  const stars = repo.stargazers_count || 0

  return {
    id: repo.opendeck_id,
    github_id: repo.id,
    full_name: repo.full_name,
    owner: repo.owner?.login,
    name: repo.full_name || repo.name,
    language: repo.language || null,
    topics: repo.topics || [],
    stargazers_count: stars,
    forks_count: repo.forks_count || 0,
    open_issues_count: repo.open_issues_count || 0,
    imgUrl: repo.owner?.avatar_url || undefined,
    html_url: repo.html_url,
    homepage: repo.homepage,
    default_branch: repo.default_branch,
    readme_excerpt: repo.readme_excerpt,
    description: repo.description || descriptionFallback,
    license: repo.license?.key || null,
    pushed_at: repo.pushed_at,
    created_at: repo.created_at,
    updated_at: repo.updated_at,
    has_good_first_issues: repo.has_good_first_issues,
    contributors: repo.contributors,
    contribution_score: repo.contribution_score,
    is_contribution_ready: repo.is_contribution_ready,
    contribution_blockers: repo.contribution_blockers,
    is_archived: repo.is_archived,
    curated: repo.curated,
  }
}
