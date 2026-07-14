# Unresolved Audit Items

This document consolidates the items that could not be fully resolved during the project-architecture, implementation/data-flow, UI/accessibility, and production-readiness/security audits.

It contains only residual work, deployment prerequisites, verification gaps, and intentionally excluded areas. Findings that were corrected during either audit are not repeated here.

## Priority summary

| Priority | Item | Current impact |
| --- | --- | --- |
| P1 | Exercise database transactions against PostgreSQL | The transactional SQL compiles and its migrations validate, but it has not run against a local or disposable PostgreSQL database. |
| P1 | Complete rendered UI and accessibility verification | Source-level repairs are in place, but no browser backend was available for viewport, zoom, keyboard, reduced-motion, or automated accessibility checks. |
| P1 | Rotate and verify the production cron credential | Source now rejects configured values shorter than 32 characters, but the deployed application and scheduler must share a newly generated value and rotation was not independently verified. |
| P1 | Establish production observability and readiness policy | The repository has diagnostic logs but no production error reporter, metrics, traces, request identifiers, or host-specific health/readiness contract. |
| P2 | Establish trusted client-IP provenance | Distributed rate limiting still relies on forwarding headers supplied by the deployment proxy. |
| P2 | Apply generated database migrations | The configured database is verified through `0013`; migrations `0014` and `0015` remain pending. |
| P2 | Expand automated integration coverage | Focused unit regressions now run persistently, but database concurrency and rendered browser workflows still lack automated integration coverage. |
| P2 | Define retention and historical-token cleanup | New magic links do not store raw invite credentials, but expired legacy metadata, backups, provider logs, and deletion propagation need a documented lifecycle. |
| P2 | Confirm public-asset provenance | Font licenses are now documented, but repository-visible provenance for the public icon and social-preview image is still unclear. |

## Deployment prerequisites

### Verify and apply the database migrations

Status: **migrations `0011` through `0013` independently verified; generated migrations `0014` and `0015` pending application**.

The following generated migrations exist in the working tree:

- `drizzle/0012_curvy_iron_fist.sql`
  - Creates `automation_job_leases`.
  - Creates `repository_sync_states`.
  - Adds `email_deliveries.idempotency_key`.
  - Adds the unique email-idempotency index.
- `drizzle/0013_productive_tana_nile.sql`
  - Creates `rate_limit_buckets`.
  - Adds its expiration index.
- `drizzle/0014_mighty_captain_midlands.sql`
  - Adds validated finite-state and numeric-range `CHECK` constraints.
  - Contains no data updates, drops, renames, or table rewrites.
- `drizzle/0015_real_the_hand.sql`
  - Adds the issue-sync continuation page and full-cycle start timestamp.
  - Adds an index for selecting the oldest incomplete issue mirrors.
  - Contains only additive columns, an index, and a positive-page `CHECK` constraint.

The runtime impact before migration was:

- Database-backed job leases cannot be acquired.
- Magic-link rate limiting cannot update shared rate-limit buckets.
- Empty repository-issue synchronizations cannot persist their refresh state.
- Email delivery cannot persist stable idempotency keys.
- Issue mirrors larger than one bounded batch cannot continue beyond their first 500 GitHub records without migration `0015`.

Read-only verification against the configured database confirmed that `0011`, `0012`, and `0013` are recorded; the lease, synchronization, and rate-limit tables exist; the idempotency column and indexes exist; the legacy verification column is absent; and current finite-state values fit the application sets.

Required follow-up:

1. Review and apply migrations `0014` and `0015` in order in every target environment.
2. Verify their constraints, columns, and incomplete-sync index after deployment.
3. Exercise the authenticated and scheduled workflows listed below.

### Rotate and verify the production cron credential

Status: **source guard fixed; deployment rotation not verified**.

The production configuration now rejects a configured `CRON_SECRET` shorter than 32 characters. The local regression probe confirms that a one-character value fails. This does not generate or rotate the real deployment credential.

Required follow-up:

1. Generate a cryptographically random value of at least 32 characters in the production secret manager.
2. Update the application and scheduler atomically so scheduled jobs do not experience an authorization gap.
3. Verify unauthenticated and old-secret requests return `401`, while the new scheduler credential succeeds.
4. Confirm the secret is not present in workflow files, logs, URLs, analytics, or provider error payloads.
5. Record a repeatable rotation and rollback procedure.

### Verify the CI workflow on GitHub

Status: **validated locally; hosted execution pending**.

The added `.github/workflows/ci.yml` performs a clean install, production advisory check, type check, lint, and production build with read-only permissions, cancellation of stale runs, job timeout, non-persistent checkout credentials, and SHA-pinned actions.

Required follow-up:

- Run the workflow on a GitHub-hosted Ubuntu runner.
- Confirm npm caching and the Node 22 build behave as expected in the repository's GitHub environment.
- Make the job a required branch-protection check if the repository uses protected branches.
- Periodically review and deliberately update pinned action SHAs from their official releases.

## Architecture and repository-state residuals

### Existing dirty working tree

Status: **preserved intentionally**.

The architecture audit began with a large dirty working tree and subsequently made extensive structural changes. The audits did not reset, discard, commit, push, or rewrite any existing work.

Why it remains unresolved:

- Separating, staging, committing, or discarding changes requires repository-owner judgment.
- Commits and history changes were explicitly prohibited by the audit instructions.

Required follow-up:

- Review the complete working-tree diff before staging.
- Separate unrelated pre-audit changes from the architecture and implementation audit changes where practical.
- Commit only after the migration and runtime verification steps are complete.

### Full-tree whitespace check is not completely clean

Status: **line-ending policy is unknown and was intentionally not normalized**.

`git diff --check` still reports:

- An extra blank line at the end of `LICENSE`.
- CRLF-to-LF normalization warnings for `.env.example`, both ingestion workflows, and `src/app/globals.css`.

The audit-created Markdown files contain no trailing whitespace or tab indentation. The only substantive `git diff --check` error is the existing blank line in `LICENSE`; the other messages describe future line-ending normalization.

Required follow-up:

- Confirm the intended line-ending policy before normalizing `.env.example`, the workflows, or `src/app/globals.css`.
- Remove the trailing blank line from `LICENSE` only if that change belongs with the pending working-tree work.

### Generated and externally managed areas

Status: **excluded from manual refactoring, not identified as defects**.

The audits did not manually refactor:

- `node_modules`.
- `.next` and other build output or caches.
- Drizzle snapshot JSON beyond generator-produced updates.
- Generated language-color JSON.
- Lockfile internals when dependencies did not change.
- Binary images and other opaque assets. Font binaries were separately hash-compared with their upstream sources and their licenses were documented.
- `.env` values and secrets.

Required follow-up:

- Regenerate these areas only through their owning tools.
- Review binary assets separately if content-level verification is required.

## Implementation and data-flow residuals

### PostgreSQL transaction integration has not been executed locally

Status: **statically verified but not database-integration tested**.

The audit implemented an atomic magic-link completion statement covering token locking, invite locking, user upsert, account defaults, session creation, invite acceptance, and token consumption. Repository ingestion and snapshot writes share a Neon batch. Administrative user changes, deletions, invitations, and allowlist mutations now also commit their audit record in the same statement or transactional batch.

Why it remains unresolved:

- Docker, `psql`, `pg_isready`, and a local PostgreSQL server were unavailable.
- Running these paths against the configured database would have changed remote state.

Required follow-up:

- Run the migrations against a disposable PostgreSQL or Neon branch.
- Test two concurrent requests using the same magic-link token; exactly one must create a session.
- Force a statement failure and confirm that the token, invite, user defaults, and session all roll back.
- Force a metric-snapshot failure and confirm that its repository write rolls back in the same batch.
- Force every supported admin audit insert to fail and confirm that its associated admin mutation rolls back.
- Run two copies of each leased job and confirm that only one performs the work.

### Forwarded client IPs require a trusted proxy

Status: **deployment-dependent**.

Rate-limit counters are now shared in PostgreSQL and their keys are HMAC-hashed, but the source IP still comes from `x-forwarded-for` or `x-real-ip`.

Impact:

- If clients can send these headers directly and the edge proxy does not replace them, an attacker may rotate spoofed values to evade per-IP limits.

Required follow-up:

- Configure the edge proxy to strip client-supplied forwarding headers and set its own trusted value.
- Prefer a platform-specific verified client-IP header when the deployment platform is finalized.
- Add an integration test at the deployed edge, not only inside Next.js.

### Database `CHECK` constraints await deployment

Status: **deployed values validated; source and generated migration fixed; migration `0014` pending**.

A read-only query confirmed that current persisted finite-state values fit the application sets. The schema now defines constraints for user and invite roles, account status, allowlist kind, preference options and ranges, collection visibility, pipeline stage, follow and recent-view target type, issue state, and email-delivery state. Drizzle generated `0014_mighty_captain_midlands.sql` from that schema.

Journal status remains intentionally unconstrained because the current feature accepts user-defined status text rather than a finite application enum.

Required follow-up:

1. Apply migration `0014` through the existing migration command.
2. Verify every new constraint is present and validated in the target database.
3. Repeat the finite-state query before applying the same migration to any other environment.

### Email guarantees depend on stable event keys and provider behavior

Status: **resolved for current magic-link and digest workflows; convention required for future email types**.

Current magic-link and digest sends provide stable event-level idempotency keys. Delivery records enforce uniqueness locally, and Resend receives the same key during safe retries.

Remaining limitations:

- A future email call site that omits `idempotencyKey` receives only a per-delivery-attempt key and will not be deduplicated across separate application invocations.
- Resend retains provider-side idempotency keys for 24 hours; longer-term deduplication depends on the local delivery record remaining available.
- If the delivery audit insert itself is unavailable, the provider key still protects current keyed workflows, but the local audit trail may be missing.

Required follow-up:

- Require a stable domain-event idempotency key for every new retryable email workflow.
- Add a code-review or lint convention around `sendEmail` call sites.
- Exercise timeout-after-provider-acceptance behavior against a Resend test account.

### Stored theme and private-profile preferences have no complete product behavior

Status: **intentionally outside both audit scopes**.

The database and account APIs store `theme` and `privateProfile`, but the audits did not implement a global theme system or public-profile visibility feature.

Why it remains unresolved:

- Completing either feature requires product behavior and UI decisions that would exceed architecture and correctness-only audit scope.

Required follow-up:

- Define the intended theme application and persistence lifecycle.
- Define which profile data is public, the affected routes, and server-side privacy enforcement before using `privateProfile` as a security boundary.

### Historical magic-link metadata needs a retention decision

Status: **new writes fixed; historical cleanup pending**.

New magic-link rows store an invite identifier rather than a raw invite token. A still-valid legacy link can be consumed during the compatibility window, and consumption removes its old `inviteToken` metadata field.

Remaining limitations:

- Expired historical token rows may retain old metadata until the row itself is deleted or a cleanup task removes the field.
- Backups and provider logs have separate retention lifecycles that application code cannot verify.
- Bulk deletion was not performed because production row volume, retention requirements, backup policy, and rollback expectations were unavailable.

Required follow-up:

- Define the retention period for expired authentication-token rows.
- Run a deployment-reviewed cleanup that removes the legacy metadata field or expired rows without exposing token values in logs.
- Confirm backup expiry and restore procedures do not retain authentication credentials longer than intended.

### Public icon and social-preview ownership is undocumented

Status: **font provenance fixed; remaining assets require owner confirmation**.

The bundled Badeen Display and Geist fonts now have upstream hashes, provenance, and license text. Equivalent repository-visible provenance was not found for:

- `public/icon.svg`
- `public/landing-preview.jpg`

Required follow-up:

- Record whether each asset is original, commissioned, generated, or obtained from a third party.
- Keep source and license/permission evidence where applicable.
- Confirm the repository's CC-BY-NC-SA-4.0 license is compatible with the intended distribution of each asset.

## Testing and operational verification gaps

### Automated regression coverage is partial

Status: **focused unit runner added; integration coverage remains open**.

The repository now runs persistent TypeScript tests through Node's test runner and the existing `tsx` dependency. CI executes them through `npm test`. Initial coverage protects authentication error mapping, trust-boundary input normalization, issue-sync cursor progression, unsafe Markdown protocol removal, and README URL resolution.

Remaining impact:

- Concurrency and rollback regressions are not protected without a disposable PostgreSQL test target.
- Client mutation, focus, responsive, hydration and stale-response behavior still require a browser backend.

Required follow-up:

- Add PostgreSQL-backed integration tests for authentication, admin invariants, job leases, rate limits, issue synchronization, email idempotency, and atomic ingestion.
- Add browser tests for account forms, duplicate-submission prevention, stale response handling, optimistic rollback, unauthorized states, and retry paths once a browser runner is selected.

### Rendered UI and accessibility matrix was not executable

Status: **source-audited and server-rendered routes checked; rendered interaction checks remain open**.

The UI audit repaired global focus visibility, global scrollbar suppression, dialog focus management, reduced-motion handling, form labels, live announcements, tab semantics, table semantics, skip navigation, and mobile viewport-height handling. The in-app browser runtime exposed no available browser backend, and the repository has no existing browser or accessibility test runner.

The following could not be independently verified in a rendered browser:

- Mobile, tablet, desktop, wide-screen, portrait, and landscape layouts.
- Browser zoom through 200%, text expansion, and horizontal-overflow behavior.
- End-to-end keyboard order, visible focus placement, dialog trapping/restoration, and mobile-menu Escape behavior.
- Computed contrast, forced-colors behavior, screen-reader output, and automated accessibility rules.
- Runtime reduced-motion behavior for CSS, Framer Motion, scroll effects, and landing-page physics.
- Authenticated, admin, empty, partial, error, long-content, and permission-restricted visual states.

Only the existing dark theme is implemented. Light-theme and right-to-left behavior are not supported features and were not added by the audit.

Required follow-up:

- Run the representative state matrix in a real browser with normal and reduced motion, keyboard-only input, forced colors, and 200% zoom.
- Run an established accessibility scanner once a browser test system is selected.
- Repeat the matrix with disposable authenticated user and admin accounts.

### Live external workflows were not exercised

Status: **requires isolated credentials and disposable external state**.

The audits did not perform state-changing tests against:

- The deployed Neon database.
- Resend delivery.
- GitHub ingestion under real rate limits.
- Authenticated browser sessions.
- Overlapping production cron invocations.

Required follow-up:

- Use a disposable Neon branch and test credentials.
- Use non-production email recipients and a provider test domain.
- Capture GitHub rate-limit and partial-response behavior.
- Verify scheduled-job lease renewal and recovery after forced termination.

### Production observability and health/readiness are not established

Status: **requires deployment and privacy decisions**.

The source has useful bounded error logs and the production-readiness audit removed raw high-risk provider/database objects from updated logging paths. The repository does not configure:

- A production error-reporting destination.
- Structured log transport and retention.
- Metrics or distributed traces.
- Cross-service request, job, and ingestion-run correlation.
- A hosting-specific liveness or readiness probe.
- Alert thresholds or an incident recovery runbook.

Why this was not implemented automatically:

- A vendor choice changes data processing, retention, cost, and deployment configuration.
- A readiness probe must reflect the host's contract and whether database or third-party degradation should remove an instance from service.
- Logging complete request bodies, headers, cookies, email addresses, or tokens would create privacy and security risk.

Required follow-up:

- Select privacy-reviewed logging, error-reporting, metric, and tracing destinations.
- Add privacy-safe request and job identifiers and propagate them through background work.
- Define liveness separately from readiness and expose only the minimum non-sensitive status required by the host.
- Alert on cron authorization failures, limiter denials, GitHub quota, job lease expiry, email failures, database saturation, and elevated route errors.
- Document retry, rollback, and incident-recovery ownership.

### Production infrastructure and indexing controls remain unverified

Status: **repository checks passed; external configuration unavailable**.

The local production server confirmed the intended security headers, public metadata, canonical URLs, sitemap, noindex metadata, 404 behavior, and unauthorized cron responses. The audit could not inspect the deployed edge, DNS, TLS certificate and redirect policy, CDN/WAF configuration, preview indexing, secret manager, database roles, storage permissions, backup retention, or production cache behavior.

Required follow-up:

- Verify HTTPS redirects and the final headers at the public domain, not only from `next start`.
- Confirm staging and preview deployments emit `noindex` or are access-restricted.
- Confirm the edge strips caller-supplied forwarding headers before application rate limiting.
- Validate DNS, HSTS rollout, CDN cache keys, WAF/abuse controls, secret rotation, database least privilege, backups, and restore drills.
- Evaluate a report-only Content Security Policy against the deployed script, font, image, and connection inventory before enforcement.

### Performance evidence is limited to local build and bundle output

Status: **configuration corrected; real-user effect unmeasured**.

The global image-optimization bypass was removed and the final production build passed. Shared first-load JavaScript remained 102 kB and the largest route remained 235 kB. The initial and final local build elapsed times were not comparable because cache state, host load, and worktree contents differed.

Required follow-up:

- Capture production Core Web Vitals and route-level server timing.
- Measure optimized image transfer size and image-service CPU/cache behavior on the selected host.
- Profile slow database queries and GitHub-backed request waterfalls under representative data and traffic.
- Add budgets only after the measurements identify stable thresholds.

## Completion criteria

This document can be removed when all of the following are true:

- Migrations `0012` and `0013` are applied and verified in every target environment.
- The production cron credential is generated, atomically deployed to the scheduler and application, and its rotation path is tested.
- Transactional authentication, ingestion, leases, and rate limits have PostgreSQL integration coverage.
- Trusted proxy IP handling is verified in deployment.
- Migrations `0014` and `0015` are applied and their constraints, columns, and indexes are verified.
- Stable idempotency keys are required for all retryable email types.
- Historical authentication-token retention and cleanup are documented and exercised.
- Production observability, liveness/readiness, alerting, and incident ownership are established.
- Hosting, trusted proxy, TLS, preview indexing, CSP evaluation, secret management, backup, and restore controls are verified.
- Public icon and social-preview provenance is documented.
- The working tree is reviewed and the pre-existing whitespace/line-ending issues are resolved or intentionally accepted.
