'use client'

import { Icon } from '@iconify/react'
import { useReducedMotion } from 'framer-motion'
import {
  type KeyboardEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react'
import { ScrollShadow } from '@/components/ui/scroll-shadow'
import { Skeleton, skeletonStagger } from '@/components/ui/skeleton'
import { API_ROUTES } from '@/config/routes'
import {
  FLOATING_LINK_CLASS,
  PanelHeader,
} from '@/features/repositories/components/repo-detail-states'
import {
  REPOSITORY_DOCUMENT_FETCH_TIMEOUT_MS,
  REPOSITORY_DOCUMENT_META,
  REPOSITORY_PRIMARY_DOCUMENT_IDS,
  REPOSITORY_PRIMARY_MARKDOWN_DOCUMENT_IDS,
  REPOSITORY_SECONDARY_DOCUMENT_TITLE,
  type RepositoryDocumentId,
} from '@/features/repositories/constants/repository-documents'
import { fetchWithTimeout } from '@/lib/api/http-client'
import { isRecord } from '@/lib/api/input-normalization'
import { apiErrorMessage } from '@/lib/api/errors'
import { cn } from '@/utils/cn'

type ManifestDoc = {
  id: string
  label?: string
  kind?: 'readme' | 'license' | 'markdown'
  path: string
  htmlUrl: string
}

type Tab = {
  id: string
  label: string
  icon: string
  kind: 'readme' | 'license' | 'markdown'
  path?: string
  htmlUrl?: string
}

type DocState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'html'; html: string; htmlUrl?: string }
  | {
      status: 'license'
      text: string
      spdx?: string | null
      name?: string | null
      htmlUrl?: string
    }

const EMPTY_MANIFEST: ManifestDoc[] = []

function documentErrorMessage(error: unknown) {
  if (error instanceof Error && error.name === 'AbortError') {
    return 'The document request timed out. Please try again.'
  }
  return error instanceof Error ? error.message : 'Unable to load document.'
}

function isKnownDocId(id: string): id is RepositoryDocumentId {
  return id in REPOSITORY_DOCUMENT_META
}

function tabForManifestDoc(doc: ManifestDoc): Tab {
  const meta = isKnownDocId(doc.id) ? REPOSITORY_DOCUMENT_META[doc.id] : null
  return {
    id: doc.id,
    label: doc.label ?? meta?.label ?? doc.path,
    icon: meta?.icon ?? 'ri:markdown-line',
    kind: doc.kind ?? (doc.id === 'license' ? 'license' : 'markdown'),
    path: doc.path,
    htmlUrl: doc.htmlUrl,
  }
}

function requestDocId(tab: Tab) {
  if (tab.kind === 'readme') return 'readme'
  if (tab.kind === 'license') return 'license'
  return isKnownDocId(tab.id) && tab.id !== 'readme' && tab.id !== 'license' ? tab.id : 'markdown'
}

function primaryTabs(manifest: ManifestDoc[], repoHtmlUrl?: string, hasLicense?: boolean) {
  const byId = new Map(manifest.map((doc) => [doc.id, doc]))
  const readmeDoc = byId.get('readme')
  const licenseDoc = byId.get('license')
  const list: Tab[] = [
    {
      id: 'readme',
      ...REPOSITORY_DOCUMENT_META.readme,
      kind: 'readme',
      path: readmeDoc?.path,
      htmlUrl: readmeDoc?.htmlUrl ?? (repoHtmlUrl ? `${repoHtmlUrl}#readme` : undefined),
    },
  ]

  if (licenseDoc || hasLicense) {
    list.push({
      id: 'license',
      ...REPOSITORY_DOCUMENT_META.license,
      kind: 'license',
      path: licenseDoc?.path,
      htmlUrl: licenseDoc?.htmlUrl ?? repoHtmlUrl,
    })
  }

  for (const id of REPOSITORY_PRIMARY_MARKDOWN_DOCUMENT_IDS) {
    const doc = byId.get(id)
    if (doc) list.push(tabForManifestDoc(doc))
  }

  return list
}

function secondaryMarkdownTabs(manifest: ManifestDoc[]) {
  const primaryPaths = new Set(
    manifest
      .filter((doc) => isKnownDocId(doc.id) && REPOSITORY_PRIMARY_DOCUMENT_IDS.includes(doc.id))
      .map((doc) => doc.path),
  )

  return manifest
    .filter((doc) => doc.id.startsWith('markdown:') && !primaryPaths.has(doc.path))
    .map(tabForManifestDoc)
}

function DocsTabHeader({
  tabs,
  active,
  idPrefix,
  onActiveChange,
}: {
  tabs: Tab[]
  active: string
  idPrefix: string
  onActiveChange: (id: string) => void
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)
  const prefersReducedMotion = useReducedMotion()

  const updateScrollState = useCallback(() => {
    const node = scrollRef.current
    if (!node) return
    const maxScrollLeft = Math.max(0, node.scrollWidth - node.clientWidth)
    const hasOverflow = maxScrollLeft > 1
    setCanScrollLeft(hasOverflow && node.scrollLeft > 1)
    setCanScrollRight(hasOverflow && node.scrollLeft < maxScrollLeft - 1)
  }, [])

  const scrollTabs = useCallback(
    (direction: -1 | 1) => {
      const node = scrollRef.current
      if (!node) return
      node.scrollBy({
        left: direction * Math.max(node.clientWidth * 0.75, 160),
        behavior: prefersReducedMotion ? 'auto' : 'smooth',
      })
    },
    [prefersReducedMotion],
  )

  const moveFocus = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let nextIndex: number | null = null
    if (event.key === 'ArrowRight') nextIndex = (index + 1) % tabs.length
    if (event.key === 'ArrowLeft') nextIndex = (index - 1 + tabs.length) % tabs.length
    if (event.key === 'Home') nextIndex = 0
    if (event.key === 'End') nextIndex = tabs.length - 1
    if (nextIndex === null) return

    event.preventDefault()
    onActiveChange(tabs[nextIndex].id)
    document.getElementById(`${idPrefix}-tab-${nextIndex}`)?.focus()
  }

  useEffect(() => {
    updateScrollState()
    const node = scrollRef.current
    if (!node) return

    node.addEventListener('scroll', updateScrollState, { passive: true })
    const observer = new ResizeObserver(updateScrollState)
    observer.observe(node)
    return () => {
      node.removeEventListener('scroll', updateScrollState)
      observer.disconnect()
    }
  }, [updateScrollState])

  if (tabs.length === 0) return null

  return (
    <div className="flex h-10 shrink-0 items-center gap-1 border-b border-border/40 px-2">
      {canScrollLeft && (
        <button
          type="button"
          onClick={() => scrollTabs(-1)}
          aria-label="Scroll document tabs left"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted-hover hover:text-foreground"
        >
          <Icon icon="ri:arrow-left-s-line" className="h-4 w-4" />
        </button>
      )}

      <div
        ref={scrollRef}
        role="tablist"
        aria-label="Repository documents"
        className="hide-scrollbar flex min-w-0 flex-1 items-center gap-1 overflow-x-auto"
      >
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            id={`${idPrefix}-tab-${index}`}
            type="button"
            role="tab"
            aria-selected={active === tab.id}
            aria-controls={`${idPrefix}-panel`}
            tabIndex={active === tab.id ? 0 : -1}
            onClick={() => onActiveChange(tab.id)}
            onKeyDown={(event) => moveFocus(event, index)}
            title={tab.path ?? tab.label}
            className={cn(
              'inline-flex h-8 max-w-52 shrink-0 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors',
              active === tab.id
                ? 'bg-muted-hover text-foreground'
                : 'text-muted-foreground hover:bg-muted-hover hover:text-foreground',
            )}
          >
            <Icon icon={tab.icon} className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{tab.label}</span>
          </button>
        ))}
      </div>

      {canScrollRight && (
        <button
          type="button"
          onClick={() => scrollTabs(1)}
          aria-label="Scroll document tabs right"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted-hover hover:text-foreground"
        >
          <Icon icon="ri:arrow-right-s-line" className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}

function DocumentTabsPanel({
  fullName,
  tabs,
  title,
  icon,
  readmeHtml,
  readmeFallback,
  emptyMessage,
}: {
  fullName: string
  tabs: Tab[]
  title: string
  icon: string
  readmeHtml?: string | null
  readmeFallback?: string | null
  emptyMessage: string
}) {
  const [active, setActive] = useState('')
  const [content, setContent] = useState<Record<string, DocState>>({})
  const contentStateRef = useRef(content)
  const contentNodeRef = useRef<HTMLDivElement | null>(null)
  const isMountedRef = useRef(false)
  const requestScopeRef = useRef('')
  const tabSetId = useId()
  const tabsKey = useMemo(() => tabs.map((tab) => `${tab.id}:${tab.path ?? ''}`).join('|'), [tabs])

  const setContentNode = useCallback((node: HTMLDivElement | null) => {
    contentNodeRef.current = node
  }, [])

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  useEffect(() => {
    contentStateRef.current = content
  }, [content])

  useEffect(() => {
    requestScopeRef.current = `${fullName}|${tabsKey}`
    setContent({})
    contentStateRef.current = {}
    const nextActive = tabs.find((tab) => tab.kind === 'readme')?.id ?? tabs[0]?.id ?? ''
    setActive(nextActive)
  }, [fullName, tabsKey, tabs])

  useEffect(() => {
    const tab = tabs.find((t) => t.id === active)
    if (!tab || contentStateRef.current[active] || (tab.kind === 'readme' && readmeHtml)) return

    const tabId = active
    const requestScope = requestScopeRef.current
    const loadingState: DocState = { status: 'loading' }
    contentStateRef.current = { ...contentStateRef.current, [tabId]: loadingState }
    setContent((prev) => ({ ...prev, [tabId]: loadingState }))

    const params = new URLSearchParams({ fullName, doc: requestDocId(tab) })
    if (tab.path) params.set('path', tab.path)

    fetchWithTimeout(
      `${API_ROUTES.repositories.document}?${params.toString()}`,
      {
        credentials: 'include',
        cache: 'no-store',
      },
      REPOSITORY_DOCUMENT_FETCH_TIMEOUT_MS,
    )
      .then(async (res) => {
        const payload: unknown = await res.json().catch(() => null)
        if (!res.ok) throw new Error(apiErrorMessage(payload, 'Unable to load document.'))
        return payload
      })
      .then((payload) => {
        if (!isMountedRef.current || requestScopeRef.current !== requestScope) return
        if (!isRecord(payload)) throw new Error('Document API returned an invalid response.')
        let next: DocState
        if (tab.kind === 'license') {
          if (
            typeof payload.text !== 'string' ||
            (payload.spdx !== undefined &&
              payload.spdx !== null &&
              typeof payload.spdx !== 'string') ||
            (payload.name !== undefined &&
              payload.name !== null &&
              typeof payload.name !== 'string') ||
            (payload.htmlUrl !== undefined && typeof payload.htmlUrl !== 'string')
          ) {
            throw new Error('Document API returned an invalid license response.')
          }
          next = {
            status: 'license',
            text: payload.text,
            spdx: payload.spdx,
            name: payload.name,
            htmlUrl: payload.htmlUrl,
          }
        } else {
          if (
            typeof payload.html !== 'string' ||
            (payload.htmlUrl !== undefined && typeof payload.htmlUrl !== 'string')
          ) {
            throw new Error('Document API returned an invalid markdown response.')
          }
          next = { status: 'html', html: payload.html, htmlUrl: payload.htmlUrl }
        }
        contentStateRef.current = { ...contentStateRef.current, [tabId]: next }
        setContent((prev) => ({ ...prev, [tabId]: next }))
      })
      .catch((error: unknown) => {
        if (!isMountedRef.current || requestScopeRef.current !== requestScope) return
        const next: DocState = {
          status: 'error',
          message: documentErrorMessage(error),
        }
        contentStateRef.current = { ...contentStateRef.current, [tabId]: next }
        setContent((prev) => ({
          ...prev,
          [tabId]: next,
        }))
      })
  }, [active, tabs, fullName, readmeHtml])

  useEffect(() => {
    const container = contentNodeRef.current
    if (!container) return
    for (const anchor of container.querySelectorAll<HTMLAnchorElement>('a[href]')) {
      if (anchor.getAttribute('href')?.startsWith('#')) continue
      anchor.target = '_blank'
      anchor.rel = 'noopener noreferrer'
    }
  })

  const activeTab = tabs.find((t) => t.id === active)
  const activeIndex = tabs.findIndex((tab) => tab.id === active)
  const activeState = content[active]
  const openUrl = activeTab?.htmlUrl

  return (
    <>
      <PanelHeader icon={icon} title={title} count={tabs.length} />
      <DocsTabHeader
        key={tabsKey}
        tabs={tabs}
        active={active}
        idPrefix={tabSetId}
        onActiveChange={setActive}
      />

      <ScrollShadow
        wrapperClassName="min-h-0 flex-1"
        className="px-4 pb-14 pt-4"
        viewportRef={setContentNode}
        backToTop
        backToTopClassName="bottom-14"
      >
        {activeIndex >= 0 ? (
          <div
            id={`${tabSetId}-panel`}
            role="tabpanel"
            aria-labelledby={`${tabSetId}-tab-${activeIndex}`}
            aria-busy={activeState?.status === 'loading' || undefined}
            className="min-h-full"
          >
            {activeState?.status === 'loading' && (
              <span role="status" className="sr-only">
                Loading {activeTab?.label ?? 'document'}
              </span>
            )}
            <DocBody
              active={active}
              state={activeState}
              readmeHtml={readmeHtml}
              readmeFallback={readmeFallback}
            />
          </div>
        ) : (
          <div className="min-h-full">
            <DocEmpty>{emptyMessage}</DocEmpty>
          </div>
        )}
      </ScrollShadow>

      {openUrl && (
        <a href={openUrl} target="_blank" rel="noopener noreferrer" className={FLOATING_LINK_CLASS}>
          <Icon icon="ri:external-link-line" className="h-3.5 w-3.5" />
          Open on GitHub
        </a>
      )}
    </>
  )
}

export default function RepoDocsPanel({
  fullName,
  repoHtmlUrl,
  readmeHtml,
  readmeFallback,
  hasLicense,
  documents,
}: {
  fullName: string
  repoHtmlUrl?: string
  readmeHtml?: string | null
  readmeFallback?: string | null
  hasLicense?: boolean
  documents?: ManifestDoc[]
}) {
  const manifest = documents ?? EMPTY_MANIFEST
  const tabs = useMemo(
    () => primaryTabs(manifest, repoHtmlUrl, hasLicense),
    [manifest, hasLicense, repoHtmlUrl],
  )

  return (
    <DocumentTabsPanel
      fullName={fullName}
      tabs={tabs}
      title="Repository documents"
      icon="ri:file-list-3-line"
      readmeHtml={readmeHtml}
      readmeFallback={readmeFallback}
      emptyMessage="No repository documents have been captured yet."
    />
  )
}

export function RepoAdditionalMarkdownPanel({
  fullName,
  documents,
}: {
  fullName: string
  documents?: ManifestDoc[]
}) {
  const manifest = documents ?? EMPTY_MANIFEST
  const tabs = useMemo(() => secondaryMarkdownTabs(manifest), [manifest])

  return (
    <DocumentTabsPanel
      fullName={fullName}
      tabs={tabs}
      title={REPOSITORY_SECONDARY_DOCUMENT_TITLE}
      icon="ri:markdown-line"
      emptyMessage="No additional markdown files were found for this repository."
    />
  )
}

function DocEmpty({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full items-center justify-center p-6 text-center text-pretty text-sm text-muted-foreground">
      {children}
    </div>
  )
}

function DocLoadingLines() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 16 }, (_, i) => (
        <Skeleton
          key={i}
          style={skeletonStagger(i)}
          className={cn('h-3.5', i % 4 === 3 ? 'w-2/3' : i % 4 === 1 ? 'w-11/12' : 'w-full')}
        />
      ))}
    </div>
  )
}

function DocBody({
  active,
  state,
  readmeHtml,
  readmeFallback,
}: {
  active: string
  state?: DocState
  readmeHtml?: string | null
  readmeFallback?: string | null
}) {
  if (active === 'readme') {
    if (readmeHtml) {
      return <div className="readme-html" dangerouslySetInnerHTML={{ __html: readmeHtml }} />
    }
    if (state?.status === 'loading') {
      return <DocLoadingLines />
    }
    if (state?.status === 'error') {
      return <DocEmpty>{state.message}</DocEmpty>
    }
    if (state?.status === 'html') {
      return <div className="readme-html" dangerouslySetInnerHTML={{ __html: state.html }} />
    }
    if (readmeFallback) {
      return (
        <p className="text-pretty text-sm leading-relaxed text-muted-foreground">
          {readmeFallback}
        </p>
      )
    }
    return <DocEmpty>No README has been captured yet.</DocEmpty>
  }

  if (!state || state.status === 'loading') {
    return <DocLoadingLines />
  }

  if (state.status === 'error') {
    return <DocEmpty>{state.message}</DocEmpty>
  }

  if (state.status === 'license') {
    return (
      <div>
        {(state.name || state.spdx) && (
          <div className="mb-3 flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">
              {state.name ?? state.spdx}
            </span>
            {state.spdx && state.spdx !== 'NOASSERTION' && (
              <span className="rounded-sm border border-border/40 px-1.5 py-0.5 font-mono text-2xs text-muted-foreground">
                {state.spdx}
              </span>
            )}
          </div>
        )}
        <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-muted-foreground">
          {state.text}
        </pre>
      </div>
    )
  }

  return <div className="readme-html" dangerouslySetInnerHTML={{ __html: state.html }} />
}
