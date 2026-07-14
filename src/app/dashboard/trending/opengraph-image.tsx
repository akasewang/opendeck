import { renderOpenDeckBrandImage } from '@/lib/seo/brand-open-graph-image'
import { OG_CONTENT_TYPE, OG_SIZE } from '@/lib/seo/open-graph'

export const alt = 'OpenDeck - Trending open source'
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE
export const revalidate = 86400

export default function OpenGraphImage() {
  return renderOpenDeckBrandImage({
    pageName: 'trending',
    description:
      'Browse recently active open source repositories\nranked for contribution readiness.',
  })
}
