import type { Repo } from '@/features/repositories/types'

export const repoKey = (record: Repo, index: number) =>
  record.id ?? record.full_name ?? record.html_url ?? `${record.name}-${index}`

export const clearUrlParam = (param: string) => {
  const url = new URL(window.location.href)
  if (!url.searchParams.has(param)) return

  url.searchParams.delete(param)
  window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`)
}
