import { renderOpenDeckBrandImage } from '@/lib/seo/brand-image'
import { OG_CONTENT_TYPE, OG_SIZE } from '@/lib/seo/og'

export const alt = 'OpenDeck - Dashboard'
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE
export const revalidate = 86400

export default function OpenGraphImage() {
  return renderOpenDeckBrandImage({
    pageName: 'dashboard',
    description:
      'Browse curated, trending, discovery and organization\nviews from the OpenDeck repository mirror.',
  })
}
