import { BrandOg, renderOgImage } from '@/lib/seo/open-graph'

const DEFAULT_DESCRIPTION =
  "Free, fast open source discovery with curated repositories from OpenDeck's own repository mirror."

type BrandImageOptions = {
  pageName?: string
  description?: string
}

export function renderOpenDeckBrandImage(options: string | BrandImageOptions = {}) {
  const pageName = typeof options === 'string' ? options : (options.pageName ?? 'home')
  const description =
    typeof options === 'string' ? DEFAULT_DESCRIPTION : (options.description ?? DEFAULT_DESCRIPTION)

  return renderOgImage(<BrandOg pageName={pageName} description={description} />)
}
