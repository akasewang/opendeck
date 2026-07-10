import { renderOpenDeckBrandImage } from '@/lib/seo/brand-image'
import { OG_CONTENT_TYPE, OG_SIZE } from '@/lib/seo/og'

export const alt = 'OpenDeck — About'
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE
export const revalidate = 86400

export default function OpenGraphImage() {
  return renderOpenDeckBrandImage({
    pageName: 'info',
    description:
      'Learn how OpenDeck ranks repositories and serves\nfast discovery from a local GitHub mirror.',
  })
}
