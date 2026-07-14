import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { cleanText, safeRelativePath } from '@/lib/api/input-normalization'

export const metadata: Metadata = {
  title: 'Sign in',
  robots: { index: false, follow: false, nocache: true },
}

type AuthCompatibilityPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

export default async function AuthCompatibilityPage({ searchParams }: AuthCompatibilityPageProps) {
  const source = await searchParams
  const destination = new URLSearchParams({
    redirect: safeRelativePath(firstValue(source.redirect)) ?? '/dashboard',
  })
  const invite = cleanText(firstValue(source.invite), 300)
  if (invite) destination.set('invite', invite)

  if (source.token !== undefined) {
    destination.set('error', 'verification_retired')
  } else if (source.error !== undefined) {
    destination.set('error', cleanText(firstValue(source.error), 64))
  }

  redirect(`/?${destination.toString()}`)
}
