export const ACCOUNT_PIPELINE_STAGES = [
  { id: 'interested', label: 'Interested', icon: 'ri:lightbulb-line' },
  { id: 'opened_issue', label: 'Opened issue', icon: 'ri:record-circle-line' },
  { id: 'submitted_pr', label: 'Submitted PR', icon: 'ri:git-pull-request-line' },
  { id: 'done', label: 'Done', icon: 'ri:checkbox-circle-line' },
] as const

export type AccountPipelineStage = (typeof ACCOUNT_PIPELINE_STAGES)[number]['id']

export const ACCOUNT_PIPELINE_STAGE_IDS = ACCOUNT_PIPELINE_STAGES.map((stage) => stage.id)

export const ACCOUNT_DIGEST_FREQUENCIES = ['off', 'daily', 'weekly', 'monthly'] as const

export type AccountDigestFrequency = (typeof ACCOUNT_DIGEST_FREQUENCIES)[number]

export const ACCOUNT_COLLECTION_TEMPLATES = [
  {
    key: 'weekend',
    name: 'Weekend contributions',
    description: 'Small, approachable repositories for focused weekend work.',
    filters: { starterFriendlyOnly: true, activeOnly: true, minStars: 25 },
  },
  {
    key: 'first-pr',
    name: 'First PR targets',
    description: 'Beginner-friendly repositories with good-first-issue signals.',
    filters: { hasGoodFirstIssues: true, contributionReadyOnly: true },
  },
  {
    key: 'high-impact',
    name: 'High-impact OSS',
    description: 'Larger active projects with strong contribution readiness.',
    filters: { contributionReadyOnly: true, minStars: 1000, sort: 'contribution' },
  },
  {
    key: 'learning',
    name: 'Learning track',
    description: 'Repos that match your preferred languages and topics.',
    filters: { starterFriendlyOnly: true, sort: 'contribution' },
  },
] as const
