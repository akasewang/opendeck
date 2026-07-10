import type { Metadata } from 'next'
import PublicCollectionPage from '@/features/collections/public-collection-page'
import { getPublicCollection } from '@/lib/account-features'
import { createPageMetadata } from '@/lib/seo/metadata'

type PageProps = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params

  let payload: Awaited<ReturnType<typeof getPublicCollection>> = null
  try {
    payload = await getPublicCollection(slug)
  } catch {
    payload = null
  }

  const name = payload?.collection.name ?? 'Shared collection'
  const count = payload?.items.length ?? 0
  const description =
    payload?.collection.description ||
    `A shared OpenDeck collection of ${count} open source ${count === 1 ? 'repository' : 'repositories'}.`

  return createPageMetadata({
    title: name,
    description,
    path: `/shared/collections/${slug}`,
  })
}

export default async function SharedCollectionPage({ params }: PageProps) {
  const { slug } = await params
  return <PublicCollectionPage slug={slug} />
}
