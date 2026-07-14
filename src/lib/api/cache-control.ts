export const CACHE_CONTROL = {
  noStore: 'no-store',
  privateRevalidate: 'private, max-age=0, must-revalidate',
  publicBrief: 'public, s-maxage=30, stale-while-revalidate=120',
  publicShort: 'public, s-maxage=60, stale-while-revalidate=300',
  publicStandard: 'public, s-maxage=300, stale-while-revalidate=3600',
} as const
