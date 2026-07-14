import { renderOpenDeckBrandImage } from '@/lib/seo/brand-open-graph-image'
import { OG_CONTENT_TYPE, OG_SIZE } from '@/lib/seo/open-graph'

export const alt = 'Repository on OpenDeck'
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE
export const revalidate = 86400

export default function OpenGraphImage() {
  return renderOpenDeckBrandImage({
    pageName: 'repository',
    description:
      'Review contribution readiness, project health\nand starter issues for an open source repository.',
  })
}
