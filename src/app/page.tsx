import Hero from '@/features/landing/components/hero'
import type { ScatterItem } from '@/features/landing/components/repo-scatter'
import { listOrganizations } from '@/lib/repositories'

export const dynamic = 'force-dynamic'

const MAX_ICONS = 105
const MAX_ICON_SOURCE_ORGS = MAX_ICONS * 4

async function getScatterIcons(): Promise<ScatterItem[]> {
  try {
    const orgs = await listOrganizations(MAX_ICON_SOURCE_ORGS)

    const validOrgs = orgs.filter((org): org is typeof org & { owner: string; avatarUrl: string } =>
      Boolean(org.owner && org.avatarUrl),
    )

    for (let i = validOrgs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[validOrgs[i], validOrgs[j]] = [validOrgs[j], validOrgs[i]]
    }

    return validOrgs
      .slice(0, MAX_ICONS)
      .map((org) => ({ id: org.owner, name: org.owner, imgUrl: org.avatarUrl }))
  } catch {
    return []
  }
}

export default async function LandingPage() {
  const icons = await getScatterIcons()
  return <Hero icons={icons} />
}
