import { renderOpenDeckBrandImage } from '@/lib/seo/brand-image'
import { OG_CONTENT_TYPE, OG_SIZE } from '@/lib/seo/og'

export const alt = 'OpenDeck auth'
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE
export const revalidate = 86400

export default function OpenGraphImage() {
  return renderOpenDeckBrandImage({
    pageName: 'auth',
    description:
      'Sign in to save repositories, follow organizations\nand manage your private OpenDeck workspace.',
  })
}
