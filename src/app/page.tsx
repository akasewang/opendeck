import type { Metadata } from 'next'
import { unstable_cache } from 'next/cache'
import { APP_CONFIG } from '@/config/application'
import Hero from '@/features/landing/components/hero'
import type { ScatterItem } from '@/features/landing/components/repo-scatter'
import { listOrganizations } from '@/features/organizations/services/organization-query-service'
import { createPageMetadata } from '@/lib/seo/metadata'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = createPageMetadata({
  title: `${APP_CONFIG.name} - Open Source Discovery`,
  description: APP_CONFIG.description,
  path: '/',
  image: {
    url: '/landing-preview.jpg',
    width: 1200,
    height: 630,
    alt: 'OPENDECK - open source discovery',
  },
})

const MAX_ICONS = 105
const MAX_ICON_SOURCE_ORGS = MAX_ICONS * 4

const getCachedScatterIcons = unstable_cache(
  async () => {
    try {
      const orgs = await listOrganizations(MAX_ICON_SOURCE_ORGS)

      const selectedOrgs = orgs
        .filter((org): org is typeof org & { owner: string; avatarUrl: string } =>
          Boolean(org.owner && org.avatarUrl),
        )
        .slice(0, MAX_ICONS)

      return selectedOrgs.map((org) => ({
        id: org.owner,
        name: org.owner,
        imgUrl: org.avatarUrl,
      }))
    } catch {
      return []
    }
  },
  ['landing-scatter-icons'],
  { revalidate: 3600 }
)

async function getScatterIcons(): Promise<ScatterItem[]> {
  const icons = await getCachedScatterIcons()
  
  const shuffled = [...icons]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }

  return shuffled
}

export default async function LandingPage() {
  const icons = await getScatterIcons()
  return <Hero icons={icons} />
}
