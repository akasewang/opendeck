'use client'

export function clearUrlParameter(parameter: string) {
  const url = new URL(window.location.href)
  if (!url.searchParams.has(parameter)) return

  url.searchParams.delete(parameter)
  window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`)
}
