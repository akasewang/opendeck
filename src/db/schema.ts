import { sql } from 'drizzle-orm'
import {
  bigint,
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

export const curatedSource = pgEnum('curated_source', ['github', 'manual', 'import'])
export const ingestKind = pgEnum('ingest_kind', ['trending', 'metadata', 'discovery'])
export const ingestStatus = pgEnum('ingest_status', ['running', 'success', 'failed', 'partial'])

export const authUsers = pgTable(
  'auth_users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').notNull(),
    email: text('email').notNull(),
    role: text('role').default('user').notNull(),
    status: text('status').default('active').notNull(),
    lastLoginAt: timestamp('last_login_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('auth_users_email_idx').on(table.email),
    index('auth_users_role_idx').on(table.role),
    index('auth_users_status_idx').on(table.status),
    check('auth_users_role_check', sql`${table.role} in ('user', 'admin')`),
    check('auth_users_status_check', sql`${table.status} in ('active', 'suspended')`),
  ],
)

export const authSessions = pgTable(
  'auth_sessions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => authUsers.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    userAgent: text('user_agent'),
    ipAddress: text('ip_address'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    lastSeenAt: timestamp('last_seen_at').defaultNow().notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    revokedAt: timestamp('revoked_at'),
  },
  (table) => [
    uniqueIndex('auth_sessions_token_hash_idx').on(table.tokenHash),
    index('auth_sessions_user_idx').on(table.userId),
    index('auth_sessions_expires_idx').on(table.expiresAt),
    index('auth_sessions_revoked_idx').on(table.revokedAt),
  ],
)

export const authTokens = pgTable(
  'auth_tokens',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').references(() => authUsers.id, { onDelete: 'cascade' }),
    email: text('email').notNull(),
    tokenHash: text('token_hash').notNull(),
    type: text('type').notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    usedAt: timestamp('used_at'),
    metadata: jsonb('metadata')
      .$type<Record<string, unknown>>()
      .default(sql`'{}'::jsonb`)
      .notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('auth_tokens_token_hash_idx').on(table.tokenHash),
    index('auth_tokens_email_type_idx').on(table.email, table.type),
    index('auth_tokens_expires_idx').on(table.expiresAt),
  ],
)

export const authInvites = pgTable(
  'auth_invites',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    email: text('email'),
    tokenHash: text('token_hash').notNull(),
    role: text('role').default('user').notNull(),
    invitedBy: uuid('invited_by').references(() => authUsers.id, { onDelete: 'set null' }),
    expiresAt: timestamp('expires_at').notNull(),
    acceptedAt: timestamp('accepted_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('auth_invites_token_hash_idx').on(table.tokenHash),
    index('auth_invites_email_idx').on(table.email),
    index('auth_invites_expires_idx').on(table.expiresAt),
    check('auth_invites_role_check', sql`${table.role} in ('user', 'admin')`),
  ],
)

export const authEmailAllowlist = pgTable(
  'auth_email_allowlist',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    pattern: text('pattern').notNull(),
    kind: text('kind').default('email').notNull(),
    note: text('note'),
    createdBy: uuid('created_by').references(() => authUsers.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('auth_email_allowlist_pattern_idx').on(table.pattern),
    check('auth_email_allowlist_kind_check', sql`${table.kind} in ('email', 'domain')`),
  ],
)

export const repos = pgTable(
  'repos',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    ghId: bigint('gh_id', { mode: 'number' }).notNull(),
    fullName: text('full_name').notNull(),
    owner: text('owner').notNull(),
    name: text('name').notNull(),
    description: text('description'),
    language: text('language'),
    stars: integer('stars').default(0).notNull(),
    forks: integer('forks').default(0).notNull(),
    openIssues: integer('open_issues').default(0).notNull(),
    license: text('license'),
    topics: jsonb('topics').$type<string[]>().default(sql`'[]'::jsonb`).notNull(),
    htmlUrl: text('html_url').notNull(),
    avatarUrl: text('avatar_url'),
    homepageUrl: text('homepage_url'),
    defaultBranch: text('default_branch'),
    isArchived: boolean('is_archived').default(false).notNull(),
    hasGoodFirstIssues: boolean('has_good_first_issues').default(false).notNull(),
    contributors: integer('contributors').default(0).notNull(),
    pushedAt: timestamp('pushed_at'),
    createdAt: timestamp('created_at'),
    updatedAt: timestamp('updated_at'),
    readmeExcerpt: text('readme_excerpt'),
    etag: text('etag'),
    lastFetchedAt: timestamp('last_fetched_at'),
  },
  (table) => [
    uniqueIndex('repos_gh_id_idx').on(table.ghId),
    uniqueIndex('repos_full_name_idx').on(table.fullName),
    index('repos_owner_idx').on(table.owner),
    index('repos_language_idx').on(table.language),
    index('repos_stars_idx').on(table.stars),
    index('repos_forks_idx').on(table.forks),
    index('repos_pushed_at_idx').on(table.pushedAt),
    index('repos_updated_at_idx').on(table.updatedAt),
  ],
)

export const curatedProjects = pgTable(
  'curated_projects',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    repoId: uuid('repo_id')
      .notNull()
      .references(() => repos.id, { onDelete: 'cascade' }),
    source: curatedSource('source').default('github').notNull(),
    batch: text('batch'),
    company: text('company'),
    logoUrl: text('logo_url'),
    tags: jsonb('tags').$type<string[]>().default(sql`'[]'::jsonb`).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('curated_projects_source_repo_idx').on(table.source, table.repoId),
    index('curated_projects_source_idx').on(table.source),
  ],
)

export const ingestRuns = pgTable('ingest_runs', {
  id: uuid('id').defaultRandom().primaryKey(),
  kind: ingestKind('kind').notNull(),
  startedAt: timestamp('started_at').defaultNow().notNull(),
  finishedAt: timestamp('finished_at'),
  tokensUsed: integer('tokens_used').default(0).notNull(),
  rateLimitRemaining: integer('rate_limit_remaining'),
  status: ingestStatus('status').default('running').notNull(),
  error: text('error'),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().default(sql`'{}'::jsonb`).notNull(),
})

export const automationJobLeases = pgTable('automation_job_leases', {
  key: text('key').primaryKey(),
  holderToken: text('holder_token').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const rateLimitBuckets = pgTable(
  'rate_limit_buckets',
  {
    key: text('key').primaryKey(),
    count: integer('count').default(0).notNull(),
    resetAt: timestamp('reset_at').notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [index('rate_limit_buckets_reset_idx').on(table.resetAt)],
)

export const repoMetricSnapshots = pgTable(
  'repo_metric_snapshots',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    repoId: uuid('repo_id')
      .notNull()
      .references(() => repos.id, { onDelete: 'cascade' }),
    stars: integer('stars').default(0).notNull(),
    forks: integer('forks').default(0).notNull(),
    openIssues: integer('open_issues').default(0).notNull(),
    capturedAt: timestamp('captured_at').defaultNow().notNull(),
  },
  (table) => [index('repo_metric_snapshots_repo_time_idx').on(table.repoId, table.capturedAt)],
)

export const userPreferences = pgTable(
  'user_preferences',
  {
    userId: uuid('user_id')
      .primaryKey()
      .references(() => authUsers.id, { onDelete: 'cascade' }),
    defaultLanguage: text('default_language'),
    defaultSort: text('default_sort').default('contribution').notNull(),
    theme: text('theme').default('system').notNull(),
    preferredLanguages: jsonb('preferred_languages')
      .$type<string[]>()
      .default(sql`'[]'::jsonb`)
      .notNull(),
    preferredTopics: jsonb('preferred_topics')
      .$type<string[]>()
      .default(sql`'[]'::jsonb`)
      .notNull(),
    minStars: integer('min_stars').default(0).notNull(),
    includeLowIssueCount: boolean('include_low_issue_count').default(true).notNull(),
    emailDigestEnabled: boolean('email_digest_enabled').default(false).notNull(),
    digestFrequency: text('digest_frequency').default('weekly').notNull(),
    digestDay: integer('digest_day').default(1).notNull(),
    goodFirstAlertsEnabled: boolean('good_first_alerts_enabled').default(true).notNull(),
    privateProfile: boolean('private_profile').default(true).notNull(),
    excludedLanguages: jsonb('excluded_languages')
      .$type<string[]>()
      .default(sql`'[]'::jsonb`)
      .notNull(),
    excludedTopics: jsonb('excluded_topics').$type<string[]>().default(sql`'[]'::jsonb`).notNull(),
    excludeArchived: boolean('exclude_archived').default(true).notNull(),
    excludeResourceLists: boolean('exclude_resource_lists').default(true).notNull(),
    excludeLowActivity: boolean('exclude_low_activity').default(false).notNull(),
    setupDifficulty: text('setup_difficulty').default('any').notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    check(
      'user_preferences_default_sort_check',
      sql`${table.defaultSort} in ('relevance', 'stars', 'forks', 'recent', 'updated', 'contribution')`,
    ),
    check('user_preferences_theme_check', sql`${table.theme} in ('light', 'dark', 'system')`),
    check(
      'user_preferences_digest_frequency_check',
      sql`${table.digestFrequency} in ('off', 'daily', 'weekly', 'monthly')`,
    ),
    check('user_preferences_digest_day_check', sql`${table.digestDay} between 0 and 6`),
    check('user_preferences_min_stars_check', sql`${table.minStars} between 0 and 10000000`),
    check(
      'user_preferences_setup_difficulty_check',
      sql`${table.setupDifficulty} in ('any', 'easy', 'medium', 'advanced')`,
    ),
  ],
)

export const userCollections = pgTable(
  'user_collections',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => authUsers.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    visibility: text('visibility').default('private').notNull(),
    shareSlug: text('share_slug'),
    templateKey: text('template_key'),
    publishedAt: timestamp('published_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('user_collections_user_name_idx').on(table.userId, table.name),
    uniqueIndex('user_collections_share_slug_idx').on(table.shareSlug),
    index('user_collections_user_idx').on(table.userId),
    index('user_collections_visibility_idx').on(table.visibility),
    check('user_collections_visibility_check', sql`${table.visibility} in ('private', 'shared')`),
  ],
)

export const userOnboardingProfiles = pgTable('user_onboarding_profiles', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => authUsers.id, { onDelete: 'cascade' }),
  skillLevel: text('skill_level').default('intermediate').notNull(),
  weeklyHours: integer('weekly_hours').default(4).notNull(),
  goals: jsonb('goals').$type<string[]>().default(sql`'[]'::jsonb`).notNull(),
  languages: jsonb('languages').$type<string[]>().default(sql`'[]'::jsonb`).notNull(),
  topics: jsonb('topics').$type<string[]>().default(sql`'[]'::jsonb`).notNull(),
  completedAt: timestamp('completed_at'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const userSavedSearches = pgTable(
  'user_saved_searches',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => authUsers.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    query: text('query'),
    filters: jsonb('filters').$type<Record<string, unknown>>().default(sql`'{}'::jsonb`).notNull(),
    alertEnabled: boolean('alert_enabled').default(true).notNull(),
    lastMatchedRepoId: uuid('last_matched_repo_id').references(() => repos.id, {
      onDelete: 'set null',
    }),
    lastCheckedAt: timestamp('last_checked_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('user_saved_searches_user_name_idx').on(table.userId, table.name),
    index('user_saved_searches_user_idx').on(table.userId),
    index('user_saved_searches_alert_idx').on(table.alertEnabled, table.lastCheckedAt),
  ],
)

export const userCollectionItems = pgTable(
  'user_collection_items',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    collectionId: uuid('collection_id')
      .notNull()
      .references(() => userCollections.id, { onDelete: 'cascade' }),
    repoId: uuid('repo_id')
      .notNull()
      .references(() => repos.id, { onDelete: 'cascade' }),
    addedAt: timestamp('added_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('user_collection_items_collection_repo_idx').on(table.collectionId, table.repoId),
    index('user_collection_items_repo_idx').on(table.repoId),
  ],
)

export const userRepoStates = pgTable(
  'user_repo_states',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => authUsers.id, { onDelete: 'cascade' }),
    repoId: uuid('repo_id')
      .notNull()
      .references(() => repos.id, { onDelete: 'cascade' }),
    savedAt: timestamp('saved_at'),
    hiddenAt: timestamp('hidden_at'),
    dismissedAt: timestamp('dismissed_at'),
    reviewedAt: timestamp('reviewed_at'),
    pipelineStage: text('pipeline_stage').default('interested').notNull(),
    note: text('note'),
    alertEnabled: boolean('alert_enabled').default(true).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('user_repo_states_user_repo_idx').on(table.userId, table.repoId),
    index('user_repo_states_user_saved_idx').on(table.userId, table.savedAt),
    index('user_repo_states_pipeline_idx').on(table.userId, table.pipelineStage),
    check(
      'user_repo_states_pipeline_stage_check',
      sql`${table.pipelineStage} in ('interested', 'opened_issue', 'submitted_pr', 'done')`,
    ),
  ],
)

export const userFollows = pgTable(
  'user_follows',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => authUsers.id, { onDelete: 'cascade' }),
    targetType: text('target_type').notNull(),
    targetKey: text('target_key').notNull(),
    repoId: uuid('repo_id').references(() => repos.id, { onDelete: 'cascade' }),
    alertEnabled: boolean('alert_enabled').default(true).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('user_follows_user_target_idx').on(table.userId, table.targetType, table.targetKey),
    index('user_follows_user_idx').on(table.userId),
    check('user_follows_target_type_check', sql`${table.targetType} in ('repo', 'organization')`),
  ],
)

export const userRecentViews = pgTable(
  'user_recent_views',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => authUsers.id, { onDelete: 'cascade' }),
    targetType: text('target_type').notNull(),
    targetKey: text('target_key').notNull(),
    repoId: uuid('repo_id').references(() => repos.id, { onDelete: 'cascade' }),
    metadata: jsonb('metadata')
      .$type<Record<string, unknown>>()
      .default(sql`'{}'::jsonb`)
      .notNull(),
    viewedAt: timestamp('viewed_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('user_recent_views_user_target_idx').on(
      table.userId,
      table.targetType,
      table.targetKey,
    ),
    index('user_recent_views_user_time_idx').on(table.userId, table.viewedAt),
    check(
      'user_recent_views_target_type_check',
      sql`${table.targetType} in ('repo', 'organization')`,
    ),
  ],
)

export const userAlerts = pgTable(
  'user_alerts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => authUsers.id, { onDelete: 'cascade' }),
    repoId: uuid('repo_id').references(() => repos.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    message: text('message').notNull(),
    metadata: jsonb('metadata')
      .$type<Record<string, unknown>>()
      .default(sql`'{}'::jsonb`)
      .notNull(),
    readAt: timestamp('read_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('user_alerts_user_read_idx').on(table.userId, table.readAt),
    index('user_alerts_repo_idx').on(table.repoId),
  ],
)

export const repoIssues = pgTable(
  'repo_issues',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    repoId: uuid('repo_id')
      .notNull()
      .references(() => repos.id, { onDelete: 'cascade' }),
    githubIssueId: bigint('github_issue_id', { mode: 'number' }).notNull(),
    number: integer('number').notNull(),
    title: text('title').notNull(),
    state: text('state').default('open').notNull(),
    htmlUrl: text('html_url').notNull(),
    labels: jsonb('labels').$type<string[]>().default(sql`'[]'::jsonb`).notNull(),
    comments: integer('comments').default(0).notNull(),
    author: text('author'),
    createdAt: timestamp('created_at'),
    updatedAt: timestamp('updated_at'),
    closedAt: timestamp('closed_at'),
    lastFetchedAt: timestamp('last_fetched_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('repo_issues_repo_number_idx').on(table.repoId, table.number),
    uniqueIndex('repo_issues_github_id_idx').on(table.githubIssueId),
    index('repo_issues_repo_state_idx').on(table.repoId, table.state),
    index('repo_issues_updated_idx').on(table.updatedAt),
    check('repo_issues_state_check', sql`${table.state} in ('open', 'closed')`),
  ],
)

export const repositorySyncStates = pgTable(
  'repository_sync_states',
  {
    repoId: uuid('repo_id')
      .primaryKey()
      .references(() => repos.id, { onDelete: 'cascade' }),
    issuesFetchedAt: timestamp('issues_fetched_at').notNull(),
    issuesComplete: boolean('issues_complete').default(false).notNull(),
    issuesNextPage: integer('issues_next_page').default(1).notNull(),
    issuesSyncStartedAt: timestamp('issues_sync_started_at'),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('repository_sync_states_incomplete_idx').on(table.issuesComplete, table.updatedAt),
    check('repository_sync_states_next_page_check', sql`${table.issuesNextPage} >= 1`),
  ],
)

export const userRepoJournalEntries = pgTable(
  'user_repo_journal_entries',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => authUsers.id, { onDelete: 'cascade' }),
    repoId: uuid('repo_id')
      .notNull()
      .references(() => repos.id, { onDelete: 'cascade' }),
    issueNumber: integer('issue_number'),
    status: text('status').default('note').notNull(),
    body: text('body').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('user_repo_journal_user_repo_idx').on(table.userId, table.repoId),
    index('user_repo_journal_status_idx').on(table.userId, table.status),
  ],
)

export const emailDeliveries = pgTable(
  'email_deliveries',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').references(() => authUsers.id, { onDelete: 'set null' }),
    email: text('email').notNull(),
    type: text('type').notNull(),
    idempotencyKey: text('idempotency_key'),
    subject: text('subject').notNull(),
    provider: text('provider'),
    status: text('status').default('queued').notNull(),
    error: text('error'),
    metadata: jsonb('metadata')
      .$type<Record<string, unknown>>()
      .default(sql`'{}'::jsonb`)
      .notNull(),
    sentAt: timestamp('sent_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('email_deliveries_idempotency_key_idx').on(table.idempotencyKey),
    index('email_deliveries_user_idx').on(table.userId),
    index('email_deliveries_status_idx').on(table.status),
    index('email_deliveries_type_idx').on(table.type),
    check(
      'email_deliveries_status_check',
      sql`${table.status} in ('queued', 'sent', 'skipped', 'failed')`,
    ),
  ],
)

export const adminAuditLogs = pgTable(
  'admin_audit_logs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    adminId: uuid('admin_id').references(() => authUsers.id, { onDelete: 'set null' }),
    action: text('action').notNull(),
    targetType: text('target_type').notNull(),
    targetId: text('target_id'),
    metadata: jsonb('metadata')
      .$type<Record<string, unknown>>()
      .default(sql`'{}'::jsonb`)
      .notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('admin_audit_logs_admin_idx').on(table.adminId),
    index('admin_audit_logs_action_idx').on(table.action),
    index('admin_audit_logs_time_idx').on(table.createdAt),
  ],
)

export const schema = {
  authUsers,
  authSessions,
  authTokens,
  authInvites,
  authEmailAllowlist,
  repos,
  curatedProjects,
  ingestRuns,
  automationJobLeases,
  rateLimitBuckets,
  repoMetricSnapshots,
  userPreferences,
  userOnboardingProfiles,
  userSavedSearches,
  userCollections,
  userCollectionItems,
  userRepoStates,
  userFollows,
  userRecentViews,
  userAlerts,
  repoIssues,
  repositorySyncStates,
  userRepoJournalEntries,
  emailDeliveries,
  adminAuditLogs,
}
