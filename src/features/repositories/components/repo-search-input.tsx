'use client'

import { Icon } from '@iconify/react'
import { AnimatePresence, motion } from 'framer-motion'
import Image from 'next/image'
import { type KeyboardEvent, useEffect, useId, useMemo, useRef, useState } from 'react'
import { fieldVariants } from '@/components/ui/field'
import { Kbd } from '@/components/ui/kbd'
import { ScrollShadow } from '@/components/ui/scroll-shadow'
import { Skeleton, skeletonStagger } from '@/components/ui/skeleton'
import { API_ROUTES, withQuery } from '@/config/routes'
import { MOTION_SPRING } from '@/config/motion'
import type { RepositoryApiItem } from '@/features/repositories/types/repository'
import { parseRepositoryListPayload } from '@/features/repositories/utils/repository-response-validation'
import { cn } from '@/utils/cn'
import { formatNumber } from '@/utils/format-number'

type RepoSearchInputProps = {
  onPick: (fullName: string, repo?: RepositoryApiItem) => void | Promise<void>
  exclude?: string[]
  placeholder?: string
  ariaLabel?: string
  disabled?: boolean
  className?: string
}

function repoFullName(repo: RepositoryApiItem) {
  return repo.full_name || repo.name
}

function HighlightedName({ text, query }: { text: string; query: string }) {
  const trimmed = query.trim()
  const matchStart = trimmed ? text.toLowerCase().indexOf(trimmed.toLowerCase()) : -1
  if (matchStart < 0) return <span className="font-medium text-foreground">{text}</span>
  const matchEnd = matchStart + trimmed.length
  return (
    <span className="font-medium text-muted-foreground">
      {text.slice(0, matchStart)}
      <span className="font-semibold text-primary">{text.slice(matchStart, matchEnd)}</span>
      {text.slice(matchEnd)}
    </span>
  )
}

export function RepoSearchInput({
  onPick,
  exclude = [],
  placeholder = 'Search repositories...',
  ariaLabel = 'Search repositories',
  disabled = false,
  className,
}: RepoSearchInputProps) {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<RepositoryApiItem[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isPicking, setIsPicking] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listboxId = useId()

  useEffect(() => {
    const handleSlash = (event: globalThis.KeyboardEvent) => {
      if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey) return
      const target = event.target as HTMLElement | null
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable
      ) {
        return
      }
      event.preventDefault()
      inputRef.current?.focus()
    }
    document.addEventListener('keydown', handleSlash)
    return () => document.removeEventListener('keydown', handleSlash)
  }, [])

  useEffect(() => {
    const trimmed = query.trim()
    if (trimmed.length < 2) {
      setSuggestions([])
      setIsLoading(false)
      return
    }

    const controller = new AbortController()
    const timer = setTimeout(async () => {
      setIsLoading(true)
      try {
        const response = await fetch(
          withQuery(API_ROUTES.search, { q: trimmed, per_page: 6, sort: 'relevance' }),
          { signal: controller.signal },
        )
        const payload: unknown = await response.json().catch(() => null)
        if (!response.ok) throw new Error('Unable to search repositories.')
        const parsed = parseRepositoryListPayload(payload)
        if (!parsed) throw new Error('Repository API returned an invalid response')
        if (!controller.signal.aborted) {
          setSuggestions(parsed.items)
          setActiveIndex(-1)
        }
      } catch {
        if (!controller.signal.aborted) setSuggestions([])
      } finally {
        if (!controller.signal.aborted) setIsLoading(false)
      }
    }, 250)

    return () => {
      controller.abort()
      clearTimeout(timer)
    }
  }, [query])

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setIsOpen(false)
    }
    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [])

  const excludedFullNames = useMemo(() => new Set(exclude), [exclude])
  const visibleSuggestions = useMemo(
    () => suggestions.filter((repo) => !excludedFullNames.has(repoFullName(repo))),
    [excludedFullNames, suggestions],
  )

  const pick = async (fullName: string, repo?: RepositoryApiItem) => {
    if (isPicking) return
    setIsPicking(true)
    try {
      await onPick(fullName, repo)
      setQuery('')
      setSuggestions([])
      setActiveIndex(-1)
    } catch {
      // Async consumers are responsible for presenting their feature-specific error.
    } finally {
      setIsPicking(false)
    }
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setIsOpen(true)
      setActiveIndex((index) => (index + 1) % Math.max(visibleSuggestions.length, 1))
      return
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((index) =>
        visibleSuggestions.length === 0
          ? -1
          : (index - 1 + visibleSuggestions.length) % visibleSuggestions.length,
      )
      return
    }
    if (event.key === 'Escape') {
      setIsOpen(false)
      return
    }
    if (event.key === 'Enter') {
      event.preventDefault()
      const active = activeIndex >= 0 ? visibleSuggestions[activeIndex] : visibleSuggestions[0]
      if (active) {
        void pick(repoFullName(active), active)
        return
      }
      const raw = query.trim()
      if (raw.includes('/')) void pick(raw)
    }
  }

  const showDropdown = isOpen && query.trim().length >= 2
  const showSkeletons = isLoading && visibleSuggestions.length === 0

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <input
        ref={inputRef}
        value={query}
        onChange={(event) => {
          setQuery(event.target.value)
          setIsOpen(true)
        }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled || isPicking}
        role="combobox"
        aria-label={ariaLabel}
        aria-expanded={showDropdown}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-activedescendant={
          activeIndex >= 0 && activeIndex < visibleSuggestions.length
            ? `${listboxId}-option-${activeIndex}`
            : undefined
        }
        aria-busy={isLoading || isPicking || undefined}
        className={fieldVariants(
          'peer h-10 rounded-lg py-0 pl-10 pr-10 leading-none shadow-sm focus:shadow-md',
        )}
      />
      <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-muted-foreground transition-colors peer-focus:text-primary">
        <Icon icon="ri:search-line" className="h-4 w-4" />
      </span>
      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
        {isLoading || isPicking ? (
          <Icon icon="ri:loader-4-line" className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : (
          query.length === 0 && <Kbd className="hidden -translate-y-[0.75px] sm:inline-flex">/</Kbd>
        )}
      </span>
      <span role="status" aria-live="polite" className="sr-only">
        {isPicking
          ? 'Adding repository'
          : isLoading
            ? 'Searching repositories'
            : showDropdown
              ? `${visibleSuggestions.length} repository ${visibleSuggestions.length === 1 ? 'result' : 'results'} available`
              : ''}
      </span>
      <AnimatePresence>
        {showDropdown && (
          <motion.div
            id={listboxId}
            role="listbox"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={MOTION_SPRING.search}
            className="absolute inset-x-0 top-[calc(100%+0.5rem)] z-40 overflow-hidden rounded-lg border border-border/40 bg-sidebar/95 shadow-xl backdrop-blur-md"
          >
            {showSkeletons ? (
              <div className="space-y-1 p-1.5">
                {Array.from({ length: 3 }, (_, index) => (
                  <div
                    key={index}
                    style={skeletonStagger(index)}
                    className="flex items-center gap-3 rounded-md px-2.5 py-2"
                  >
                    <Skeleton className="h-6 w-6 shrink-0 rounded-md" />
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <Skeleton className="h-3.5 w-2/5" />
                      <Skeleton className="h-3 w-4/5" />
                    </div>
                  </div>
                ))}
              </div>
            ) : visibleSuggestions.length === 0 ? (
              <div className="flex items-center gap-2.5 px-3.5 py-4 text-sm text-muted-foreground">
                <Icon icon="ri:ghost-line" className="h-4 w-4 shrink-0" />
                {query.trim().includes('/')
                  ? `No mirrored match. Press Enter to add "${query.trim()}" anyway.`
                  : 'No matching repositories in the index.'}
              </div>
            ) : (
              <ScrollShadow className="max-h-80 p-1.5">
                <ul role="presentation">
                  {visibleSuggestions.map((repo, index) => {
                    const fullName = repoFullName(repo)
                    const avatar = repo.owner?.avatar_url
                    return (
                      <li key={repo.opendeck_id ?? fullName} role="presentation">
                        <button
                          id={`${listboxId}-option-${index}`}
                          type="button"
                          role="option"
                          aria-selected={index === activeIndex}
                          tabIndex={-1}
                          onMouseDown={(event) => event.preventDefault()}
                          onMouseEnter={() => setActiveIndex(index)}
                          disabled={isPicking}
                          onClick={() => void pick(fullName, repo)}
                          className={cn(
                            'flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left transition-colors',
                            index === activeIndex ? 'bg-primary/10' : 'hover:bg-muted-hover',
                          )}
                        >
                          {avatar ? (
                            <Image
                              src={`${avatar}${avatar.includes('?') ? '&' : '?'}s=24`}
                              alt=""
                              width={24}
                              height={24}
                              className="shrink-0 rounded-md ring-1 ring-border/50"
                            />
                          ) : (
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-muted/60">
                              <Icon
                                icon="ri:git-repository-line"
                                className="h-3.5 w-3.5 text-muted-foreground/70"
                              />
                            </span>
                          )}
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm leading-snug">
                              <HighlightedName text={fullName} query={query} />
                            </span>
                            {repo.description && (
                              <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                                {repo.description}
                              </span>
                            )}
                          </span>
                          <span className="flex shrink-0 flex-col items-end gap-0.5">
                            <span className="inline-flex items-center gap-1 font-mono text-xs tabular-nums text-muted-foreground">
                              <Icon icon="ri:star-line" className="h-3 w-3" />
                              {formatNumber(repo.stargazers_count ?? 0)}
                            </span>
                            {repo.language && (
                              <span className="hidden text-2xs text-muted-foreground/70 sm:inline">
                                {repo.language}
                              </span>
                            )}
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </ScrollShadow>
            )}
            {!showSkeletons && visibleSuggestions.length > 0 && (
              <div className="hidden items-center gap-3 border-t border-border/40 bg-background/40 px-3 py-1.5 text-2xs text-muted-foreground sm:flex">
                <span className="inline-flex items-center gap-1">
                  <Kbd>↑</Kbd>
                  <Kbd>↓</Kbd>
                  navigate
                </span>
                <span className="inline-flex items-center gap-1">
                  <Kbd>↵</Kbd>
                  add
                </span>
                <span className="inline-flex items-center gap-1">
                  <Kbd>esc</Kbd>
                  dismiss
                </span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
