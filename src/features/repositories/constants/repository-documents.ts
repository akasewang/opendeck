export const REPOSITORY_DOCUMENT_META = {
  readme: { label: 'README', icon: 'ri:file-text-line' },
  license: { label: 'License', icon: 'ri:scales-3-line' },
  security: { label: 'Security', icon: 'ri:shield-check-line' },
  contributing: { label: 'Contributing', icon: 'ri:git-pull-request-line' },
  code_of_conduct: { label: 'Code of conduct', icon: 'ri:hand-heart-line' },
} as const

export type RepositoryDocumentId = keyof typeof REPOSITORY_DOCUMENT_META

export const REPOSITORY_PRIMARY_DOCUMENT_IDS = Object.keys(
  REPOSITORY_DOCUMENT_META,
) as RepositoryDocumentId[]

export const REPOSITORY_PRIMARY_MARKDOWN_DOCUMENT_IDS = [
  'security',
  'contributing',
  'code_of_conduct',
] as const satisfies readonly RepositoryDocumentId[]

export const REPOSITORY_DOCUMENT_FETCH_TIMEOUT_MS = 15_000

export const REPOSITORY_SECONDARY_DOCUMENT_TITLE = 'Additional markdown'
