'use client'

import { Icon } from '@iconify/react'
import Image from 'next/image'
import { ColorfulTag, SimpleTag } from '@/components/ui/tag'
import type { ColumnKey, Repo } from '@/features/repositories/types'
import { formatNumber, getLanguageTagStyle } from '@/features/repositories/utils'
import { cn } from '@/utils/cn'

const REPOSITORY_TEXT_WIDTH =
  'max-w-[13.75rem] sm:max-w-[21.75rem] md:max-w-[27.75rem] lg:max-w-[35.75rem] xl:max-w-[43.75rem] 2xl:max-w-[51.75rem]'

export const renderCell = (record: Repo, key: ColumnKey) => {
  const value = record[key]

  switch (key) {
    case 'name': {
      const avatarSrc = record.imgUrl
        ? `${record.imgUrl}${record.imgUrl.includes('?') ? '&' : '?'}s=24`
        : undefined
      const fullName = record.name
      const slash = fullName.indexOf('/')
      const owner = slash > -1 ? fullName.slice(0, slash) : null
      const repo = slash > -1 ? fullName.slice(slash + 1) : fullName
      return (
        <div className="flex min-w-0 items-center gap-2.5 transition group">
          {avatarSrc && (
            <Image
              src={avatarSrc}
              alt=""
              width={24}
              height={24}
              className="shrink-0 rounded-md ring-1 ring-border/50 transition group-hover:opacity-80"
            />
          )}
          <span
            className={cn(
              'min-w-0 break-words leading-tight [overflow-wrap:anywhere]',
              REPOSITORY_TEXT_WIDTH,
            )}
            title={fullName}
          >
            {owner && <span className="text-muted-foreground">{owner}/</span>}
            <span className="font-medium text-foreground">{repo}</span>
          </span>
        </div>
      )
    }

    case 'language': {
      if (!value) return <span className="text-sm text-muted-foreground">-</span>
      const language = String(value)
      return <ColorfulTag style={getLanguageTagStyle(language)}>{language}</ColorfulTag>
    }

    case 'topics':
      if (Array.isArray(value) && value.length > 0) {
        const sorted = [...value].sort((a, b) => a.length - b.length || a.localeCompare(b))
        const shown = sorted.slice(0, 2)
        const extra = value.length - shown.length
        return (
          <div className="flex flex-wrap gap-1">
            {shown.map((tag, i) => (
              <SimpleTag key={`${tag}-${i}`}>{tag}</SimpleTag>
            ))}
            {extra > 0 && (
              <SimpleTag className="border-dashed text-muted-foreground/70">+{extra}</SimpleTag>
            )}
          </div>
        )
      }
      return <SimpleTag className="w-fit">{record.language || '-'}</SimpleTag>

    case 'stargazers_count':
    case 'open_issues_count':
      return (
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap font-mono font-medium text-sm tracking-wider tabular-nums text-foreground">
          <Icon
            icon={key === 'stargazers_count' ? 'ri:star-line' : 'ri:record-circle-line'}
            className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70"
          />
          {typeof value === 'number' ? formatNumber(value) : '0'}
        </span>
      )

    case 'contribution_score': {
      const score = typeof value === 'number' ? value : 0
      const label = record.has_good_first_issues
        ? 'Good first'
        : record.is_contribution_ready
          ? 'Ready'
          : 'Review'
      const tone =
        score >= 80
          ? 'border-success/20 bg-success/10 text-success'
          : score >= 60
            ? 'border-info/20 bg-info/10 text-info'
            : 'border-highlight/20 bg-highlight/10 text-highlight'

      return (
        <span
          className={`inline-flex min-w-[8.5rem] items-center justify-between gap-2 whitespace-nowrap rounded-md border px-2.5 py-1 text-xs font-semibold ${tone}`}
        >
          <span>{label}</span>
          <span className="font-mono tabular-nums">{score}</span>
        </span>
      )
    }

    default:
      return <span className="text-sm text-muted-foreground">{value ?? '-'}</span>
  }
}
