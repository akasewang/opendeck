'use client'

import { Icon } from '@iconify/react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { StatusPill } from '@/components/ui/status-pill'
import { appRoute } from '@/config/routes'
import { Metric } from '@/features/repositories/components/repo-detail-metric'
import { PersonalRepoPanel } from '@/features/repositories/components/repo-personal-panel'
import {
  expandedSectionStagger,
  groupStagger,
  sectionItem,
} from '@/features/repositories/motion/repo-detail-motion'
import type { RepositoryListItem } from '@/features/repositories/types/repository'
import {
  formatRelativeTime,
  getLanguageTagStyle,
} from '@/features/repositories/utils/repository-display'
import { cn } from '@/utils/cn'
import { formatNumber } from '@/utils/format-number'

function DetailLink({
  href,
  icon,
  label,
  external = false,
}: {
  href: string
  icon: string
  label: string
  external?: boolean
}) {
  return (
    <Link
      href={href}
      onClick={(event) => event.stopPropagation()}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      className="group inline-flex items-center gap-1.5 text-sm font-medium text-foreground transition-colors hover:text-primary"
    >
      <Icon
        icon={icon}
        className="h-4 w-4 text-muted-foreground/70 transition-colors group-hover:text-primary/70"
      />
      {label}
      <Icon
        icon={external ? 'ri:external-link-line' : 'ri:arrow-right-line'}
        className={cn(
          'h-4 w-4 transition-[color,translate] duration-200 ease-out',
          !external && 'group-hover:translate-x-1',
        )}
      />
    </Link>
  )
}

export function ExpandedDetails({ record }: { record: RepositoryListItem }) {
  const fullName = record.full_name || (record.name?.includes('/') ? record.name : undefined)
  const lastActive = formatRelativeTime(record.pushed_at || record.updated_at)
  const homepage = record.homepage && /^https?:\/\//.test(record.homepage) ? record.homepage : null
  const languageColor = record.language ? getLanguageTagStyle(record.language).color : undefined
  const readinessLabel = record.is_contribution_ready ? 'Ready' : 'Review'
  const blockerCount = record.contribution_blockers?.length ?? 0

  return (
    <motion.div
      className="space-y-5 p-4 md:p-5"
      initial="hidden"
      animate="show"
      variants={expandedSectionStagger}
    >
      <motion.div variants={sectionItem}>
        {record.is_archived && (
          <StatusPill tone="destructive" size="sm" className="mb-2">
            Archived
          </StatusPill>
        )}
        <p className="text-pretty text-sm leading-relaxed text-foreground/90">
          {record.description || 'No description available for this repository.'}
        </p>
      </motion.div>

      <motion.div variants={groupStagger} className="flex flex-wrap items-center gap-x-5 gap-y-2">
        {record.language && (
          <Metric
            leading={
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: languageColor }}
              />
            }
            value={record.language}
          />
        )}
        <Metric
          icon="ri:star-line"
          value={formatNumber(record.stargazers_count || 0)}
          label="stars"
        />
        <Metric
          icon="ri:git-fork-line"
          value={formatNumber(record.forks_count || 0)}
          label="forks"
        />
        <Metric
          icon="ri:record-circle-line"
          value={formatNumber(record.open_issues_count || 0)}
          label="open issues"
        />
        <Metric
          icon="ri:pulse-line"
          value={formatNumber(record.contribution_score ?? 0)}
          label={readinessLabel.toLowerCase()}
        />
        {(record.contributors ?? 0) > 0 && (
          <Metric
            icon="ri:team-line"
            value={formatNumber(record.contributors ?? 0)}
            label="contributors"
          />
        )}
        {record.license && <Metric icon="ri:scales-3-line" value={record.license} />}
        {lastActive && <Metric icon="ri:history-line" value={lastActive} />}
        {blockerCount > 0 && (
          <Metric
            icon="ri:error-warning-line"
            value={formatNumber(blockerCount)}
            label="blockers"
          />
        )}
      </motion.div>

      <PersonalRepoPanel record={record} fullName={fullName} />

      {fullName && (
        <motion.div variants={sectionItem} className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <DetailLink
            href={appRoute.repository(fullName)}
            icon="ri:dashboard-line"
            label="Open repository detail"
          />
          <DetailLink
            href={appRoute.compareRepositories([fullName])}
            icon="ri:scales-3-line"
            label="Compare with others"
          />
          {record.html_url && (
            <DetailLink href={record.html_url} icon="ri:github-fill" label="GitHub" external />
          )}
          {homepage && (
            <DetailLink href={homepage} icon="ri:global-line" label="Website" external />
          )}
        </motion.div>
      )}
    </motion.div>
  )
}
