'use client'

import { Icon } from '@iconify/react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { Metric } from '@/features/repositories/components/repo-detail-metric'
import {
  groupStagger,
  sectionItem,
  sectionStagger,
} from '@/features/repositories/components/repo-detail-motion'
import { PersonalRepoPanel } from '@/features/repositories/components/repo-personal-panel'
import type { Repo } from '@/features/repositories/types'
import {
  formatNumber,
  formatRelativeTime,
  getLanguageTagStyle,
} from '@/features/repositories/utils'

export function ExpandedDetails({ record }: { record: Repo }) {
  const fullName = record.full_name || (record.name?.includes('/') ? record.name : undefined)
  const lastActive = formatRelativeTime(record.pushed_at || record.updated_at)
  const homepage = record.homepage && /^https?:\/\//.test(record.homepage) ? record.homepage : null
  const languageColor = record.language ? getLanguageTagStyle(record.language).color : undefined
  const readinessLabel = record.is_contribution_ready ? 'Ready' : 'Review'
  const blockerCount = record.contribution_blockers?.length ?? 0

  return (
    <motion.div
      className="space-y-4 p-4 md:p-5"
      initial="hidden"
      animate="show"
      variants={sectionStagger}
    >
      <motion.div variants={sectionItem}>
        {record.is_archived && (
          <span className="mb-2 inline-block rounded-sm border border-destructive/20 bg-destructive/10 px-2 py-0.5 text-[10px] font-bold text-destructive">
            Archived
          </span>
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
          <Link
            href={`/dashboard/repos/${fullName}`}
            onClick={(e) => e.stopPropagation()}
            className="group inline-flex items-center gap-1.5 text-sm font-medium text-foreground transition-colors hover:text-primary"
          >
            <Icon icon="ri:dashboard-line" className="h-4 w-4 text-muted-foreground/70" />
            Open repository detail
            <Icon
              icon="ri:arrow-right-line"
              className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
            />
          </Link>
          <Link
            href={`/dashboard/compare?repos=${encodeURIComponent(fullName)}`}
            onClick={(e) => e.stopPropagation()}
            className="group inline-flex items-center gap-1.5 text-sm font-medium text-foreground transition-colors hover:text-primary"
          >
            <Icon icon="ri:scales-3-line" className="h-4 w-4 text-muted-foreground/70" />
            Compare with others
            <Icon
              icon="ri:arrow-right-line"
              className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
            />
          </Link>
          {record.html_url && (
            <Link
              href={record.html_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="group inline-flex items-center gap-1.5 text-sm font-medium text-foreground transition-colors hover:text-primary"
            >
              <Icon icon="ri:github-fill" className="h-4 w-4 text-muted-foreground/70" />
              GitHub
              <Icon
                icon="ri:external-link-line"
                className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
              />
            </Link>
          )}
          {homepage && (
            <Link
              href={homepage}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="group inline-flex items-center gap-1.5 text-sm font-medium text-foreground transition-colors hover:text-primary"
            >
              <Icon icon="ri:global-line" className="h-4 w-4 text-muted-foreground/70" />
              Website
              <Icon
                icon="ri:external-link-line"
                className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
              />
            </Link>
          )}
        </motion.div>
      )}
    </motion.div>
  )
}
