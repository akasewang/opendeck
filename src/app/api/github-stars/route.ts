import { NextResponse } from 'next/server'
import { APP_CONFIG } from '@/config/application'
import { isRecord } from '@/lib/api/input-normalization'
import { githubFetch } from '@/lib/github/client'

export const revalidate = 3600

function githubApiUrl() {
  const url = new URL(APP_CONFIG.links.github)
  const [owner, repo] = url.pathname.split('/').filter(Boolean)
  if (!owner || !repo) throw new Error('Invalid GitHub repository URL')
  return `https://api.github.com/repos/${owner}/${repo}`
}

export async function GET() {
  try {
    const response = await githubFetch(githubApiUrl(), { next: { revalidate: 3600 } })

    if (!response.ok) {
      return NextResponse.json({ count: null })
    }

    const data: unknown = await response.json().catch(() => null)
    if (
      !isRecord(data) ||
      typeof data.stargazers_count !== 'number' ||
      !Number.isSafeInteger(data.stargazers_count) ||
      data.stargazers_count < 0
    ) {
      return NextResponse.json({ count: null })
    }

    return NextResponse.json({ count: data.stargazers_count })
  } catch {
    return NextResponse.json({ count: null })
  }
}
