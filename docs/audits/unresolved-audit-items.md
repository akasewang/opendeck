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
| P1 | Decide whether admin audits must be atomic | A successful admin mutation can still be committed when its audit-log insert fails. |
| P1 | Define handling for repositories with more than 500 open issues | Their issue mirror remains intentionally partial, although unseen issues are no longer incorrectly closed. |
| P2 | Establish trusted client-IP provenance | Distributed rate limiting still relies on forwarding headers supplied by the deployment proxy. |
| P2 | Add database `CHECK` constraints after deployed-data validation | Several state columns are validated by the application but remain unconstrained text in PostgreSQL. |
| P2 | Establish an automated test framework | The repository has executable validation commands but no persistent unit/integration test runner. |
| P2 | Define retention and historical-token cleanup | New magic links do not store raw invite credentials, but expired legacy metadata, backups, provider logs, and deletion propagation need a documented lifecycle. |
| P2 | Confirm public-asset provenance | Font licenses are now documented, but repository-visible provenance for the public icon and social-preview image is still unclear. |

## Deployment prerequisites

### Verify the applied additive database migrations

Status: **reported as applied by the repository owner; not independently verified by the audit**.

The following generated migrations exist in the working tree:

- `drizzle/0012_curvy_iron_fist.sql`
  - Creates `automation_job_leases`.
  - Creates `repository_sync_states`.
  - Adds `email_deliveries.idempotency_key`.
  - Adds the unique email-idempotency index.
- `drizzle/0013_productive_tana_nile.sql`
  - Creates `rate_limit_buckets`.
  - Adds its expiration index.

The runtime impact before migration was:

- Database-backed job leases cannot be acquired.
- Magic-link rate limiting cannot update shared rate-limit buckets.
- Empty repository-issue synchronizations cannot persist their refresh state.
- Email delivery cannot persist stable idempotency keys.

Required follow-up:

1. Confirm the migration journal records both migrations in every target environment.
2. Verify the new tables, column, foreign key, and indexes.
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

The audit implemented an atomic magic-link completion statement covering token locking, invite locking, user upsert, account defaults, session creation, invite acceptance, and token consumption. Repository ingestion and snapshot writes also share a Neon batch.

Why it remains unresolved:

- Docker, `psql`, `pg_isready`, and a local PostgreSQL server were unavailable.
- Running these paths against the configured database would have changed remote state.

Required follow-up:

- Run the migrations against a disposable PostgreSQL or Neon branch.
- Test two concurrent requests using the same magic-link token; exactly one must create a session.
- Force a statement failure and confirm that the token, invite, user defaults, and session all roll back.
- Force a metric-snapshot failure and confirm that its repository write rolls back in the same batch.
- Run two copies of each leased job and confirm that only one performs the work.

### Admin audit logging remains best-effort

Status: **requires an explicit failure-semantics decision**.

Admin actions currently log an error if the primary mutation succeeds but the `admin_audit_logs` insert fails. The successful mutation is not rolled back.

Impact:

- An administrative change can exist without a corresponding audit entry during a database error affecting the audit write.

Why it was not changed automatically:

- Making the audit insert atomic would cause audit-storage failures to reject user suspension, role changes, deletions, invitations, and allowlist changes.
- That availability-versus-auditability behavior is a product and operational policy decision, not merely an implementation detail.

Required follow-up:

- Choose one policy:
  - **Strict audit:** execute every admin mutation and audit insert in one transaction and reject the mutation if the audit cannot be stored.
  - **Durable outbox:** commit the mutation with a guaranteed outbox event, then materialize the human-readable audit record asynchronously.
- Add concurrency and failure tests for the selected policy.

### Repositories with more than 500 open issues remain partially mirrored

Status: **safe but incomplete**.

Issue synchronization reads at most five GitHub pages of 100 issues each. When that limit is reached, `repository_sync_states.issues_complete` is stored as `false`.

Current safeguards:

- Existing issues that were not present in the partial response are not marked closed.
- The refresh time is persisted, including when GitHub returns zero issues.
- A per-repository database lease prevents duplicate concurrent refreshes.

Remaining impact:

- Issues after the first 500 are unavailable to recommendations and account views.

Required follow-up:

- Decide whether to paginate until exhaustion, synchronize incrementally in a background job, or explicitly support a documented mirror limit.
- Consider GitHub rate-limit cost and job-duration limits before removing the cap.

### Forwarded client IPs require a trusted proxy

Status: **deployment-dependent**.

Rate-limit counters are now shared in PostgreSQL and their keys are HMAC-hashed, but the source IP still comes from `x-forwarded-for` or `x-real-ip`.

Impact:

- If clients can send these headers directly and the edge proxy does not replace them, an attacker may rotate spoofed values to evade per-IP limits.

Required follow-up:

- Configure the edge proxy to strip client-supplied forwarding headers and set its own trusted value.
- Prefer a platform-specific verified client-IP header when the deployment platform is finalized.
- Add an integration test at the deployed edge, not only inside Next.js.

### Database state columns lack complete `CHECK` constraints

Status: **application-validated, database-hardening pending**.

Several fields use PostgreSQL `text` while the application treats them as finite states, including user roles/statuses, digest frequency, theme, setup difficulty, collection visibility, pipeline stage, follow target type, issue state, and journal status.

Impact:

- Direct SQL, an older deployment, or a future code defect could store values outside the runtime unions.

Why it remains unresolved:

- Existing deployed data was not accessible for validation.
- Adding validated constraints without first checking existing rows can fail deployment.

Required follow-up:

1. Query each affected column for values outside the current application sets.
2. Repair invalid rows if any exist.
3. Add additive `CHECK` constraints, initially `NOT VALID` where deployment safety requires it.
4. Validate the constraints after data cleanup.

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

### No established automated test framework

Status: **not introduced during the audits**.

The repository has no existing unit or integration test command. The audits used strict TypeScript, ESLint, Biome, Drizzle migration checks, production builds, focused executable assertions, and non-mutating production-server route checks.

Impact:

- Concurrency and rollback regressions are not protected by persistent tests.
- Client mutation and stale-response behavior is validated statically rather than through repeatable browser tests.

Required follow-up:

- Select a test runner compatible with Next.js and TypeScript.
- Add PostgreSQL-backed integration tests for authentication, admin invariants, job leases, rate limits, issue synchronization, email idempotency, and atomic ingestion.
- Add browser tests for account forms, duplicate-submission prevention, stale response handling, optimistic rollback, unauthorized states, and retry paths.

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
- Admin audit failure semantics are selected and implemented.
- The issue-mirroring policy for repositories above 500 open issues is implemented or explicitly accepted as a supported limit.
- Trusted proxy IP handling is verified in deployment.
- Database state constraints are added after data validation.
- Stable idempotency keys are required for all retryable email types.
- Historical authentication-token retention and cleanup are documented and exercised.
- Production observability, liveness/readiness, alerting, and incident ownership are established.
- Hosting, trusted proxy, TLS, preview indexing, CSP evaluation, secret management, backup, and restore controls are verified.
- Public icon and social-preview provenance is documented.
- The working tree is reviewed and the pre-existing whitespace/line-ending issues are resolved or intentionally accepted.
