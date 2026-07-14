# Unresolved Audit Items

[![Open items](https://img.shields.io/badge/14_Open_Items-000000?style=for-the-badge)](#priority-summary)
[![P1](https://img.shields.io/badge/4_Blocking-FFBD2E?style=for-the-badge)](#priority-summary)
[![P2](https://img.shields.io/badge/5_Important-2088FF?style=for-the-badge)](#priority-summary)
[![P3](https://img.shields.io/badge/5_Deferred-61DAFB?style=for-the-badge)](#priority-summary)
[![Source audit](https://img.shields.io/badge/Source-Readiness_Audit-0055FF?style=for-the-badge)](./production-readiness-audit-2026-07-14.md)

This is the residual list from the architecture, implementation and data flow, UI and accessibility, and production readiness audits. It holds only outstanding work: deployment prerequisites, verification gaps and areas excluded on purpose. Anything already corrected lives in the [audit report](./production-readiness-audit-2026-07-14.md) and is not repeated here.

## Priority summary


| | Item | Why it is still open |
| :-- | :-- | :-- |
| ![P1](https://img.shields.io/badge/P1-FFBD2E?style=flat-square) | [Exercise database transactions against PostgreSQL](#postgresql-transaction-integration-has-not-been-executed) | The transactional SQL compiles and its migrations validate, but it has never run against a real PostgreSQL database. |
| ![P1](https://img.shields.io/badge/P1-FFBD2E?style=flat-square) | [Complete rendered UI and accessibility verification](#rendered-ui-and-accessibility-matrix-was-not-executable) | Source level repairs are in place, but no browser backend was available for viewport, zoom, keyboard, reduced motion or automated accessibility checks. |
| ![P1](https://img.shields.io/badge/P1-FFBD2E?style=flat-square) | [Rotate and verify the production cron credential](#rotate-and-verify-the-production-cron-credential) | Source now rejects values shorter than 32 characters, but the deployed application and scheduler must share a newly generated value. |
| ![P1](https://img.shields.io/badge/P1-FFBD2E?style=flat-square) | [Establish production observability and readiness policy](#production-observability-and-health-readiness-are-not-established) | There are diagnostic logs but no error reporter, metrics, traces, request identifiers or host specific readiness contract. |
| ![P2](https://img.shields.io/badge/P2-2088FF?style=flat-square) | [Apply generated database migrations](#apply-and-verify-the-database-migrations) | Verified through `0013`. Migrations `0014` and `0015` remain pending. |
| ![P2](https://img.shields.io/badge/P2-2088FF?style=flat-square) | [Establish trusted client IP provenance](#forwarded-client-ips-require-a-trusted-proxy) | Distributed rate limiting still trusts forwarding headers supplied by the deployment proxy. |
| ![P2](https://img.shields.io/badge/P2-2088FF?style=flat-square) | [Expand automated integration coverage](#automated-regression-coverage-is-partial) | Unit regressions run persistently, but database concurrency and browser workflows have no automated coverage. |
| ![P2](https://img.shields.io/badge/P2-2088FF?style=flat-square) | [Define retention and historical token cleanup](#historical-magic-link-metadata-needs-a-retention-decision) | New magic links carry no raw credentials, but legacy metadata, backups, provider logs and deletion propagation need a documented lifecycle. |
| ![P2](https://img.shields.io/badge/P2-2088FF?style=flat-square) | [Confirm public asset provenance](#public-icon-and-social-preview-ownership-is-undocumented) | Font licenses are documented. The icon and social preview image are not. |
| ![P3](https://img.shields.io/badge/P3-61DAFB?style=flat-square) | [Verify the CI workflow on GitHub](#verify-the-ci-workflow-on-github) | Validated locally, never executed on a GitHub hosted runner. |
| ![P3](https://img.shields.io/badge/P3-61DAFB?style=flat-square) | [Require idempotency keys for new email types](#email-guarantees-depend-on-stable-event-keys) | Current workflows are covered. A future call site could silently skip deduplication. |
| ![P3](https://img.shields.io/badge/P3-61DAFB?style=flat-square) | [Exercise live external workflows](#live-external-workflows-were-not-exercised) | Needs isolated credentials and disposable external state. |
| ![P3](https://img.shields.io/badge/P3-61DAFB?style=flat-square) | [Measure real performance](#performance-evidence-is-limited-to-local-build-output) | Only local build and bundle output exist. No production Core Web Vitals or query plans. |
| ![P3](https://img.shields.io/badge/P3-61DAFB?style=flat-square) | [Finish or drop theme and private profile](#stored-theme-and-private-profile-preferences-have-no-product-behavior) | The columns are stored but no product behavior exists behind them. |




## Deployment prerequisites



### Apply and verify the database migrations

> **Status**: `0011` through `0013` independently verified. `0014` and `0015` generated but pending.

Read only verification against the configured database confirmed that `0011`, `0012` and `0013` are recorded, the lease, synchronization and rate limit tables exist, the idempotency column and indexes exist, the legacy verification column is gone, and current finite state values fit the application sets.


| Migration | Contents | State |
| :-- | :-- | :-- |
| `0012_curvy_iron_fist.sql` | `automation_job_leases`, `repository_sync_states`, `email_deliveries.idempotency_key` and its unique index | ![Applied](https://img.shields.io/badge/Applied-00E599?style=flat-square) |
| `0013_productive_tana_nile.sql` | `rate_limit_buckets` and its expiration index | ![Applied](https://img.shields.io/badge/Applied-00E599?style=flat-square) |
| `0014_mighty_captain_midlands.sql` | Validated finite state and numeric range `CHECK` constraints. No data updates, drops, renames or table rewrites | ![Pending](https://img.shields.io/badge/Pending-FFBD2E?style=flat-square) |
| `0015_real_the_hand.sql` | Issue sync continuation page, full cycle start timestamp, index for the oldest incomplete issue mirrors, positive page `CHECK` | ![Pending](https://img.shields.io/badge/Pending-FFBD2E?style=flat-square) |


Until `0015` is applied, issue mirrors larger than one bounded batch cannot continue past their first 500 GitHub records.

**Follow up**

1. Review and apply `0014` and `0015` in order in every target environment.
2. Verify their constraints, columns and incomplete sync index after deployment.
3. Repeat the finite state query before applying `0014` to any other environment.
4. Exercise the authenticated and scheduled workflows listed below.



### Rotate and verify the production cron credential

> **Status**: source guard fixed, deployment rotation not verified.

Production configuration now rejects a `CRON_SECRET` shorter than 32 characters, and a local regression probe confirms a one character value fails. That does not generate or rotate the real deployment credential.

**Follow up**

1. Generate a cryptographically random value of at least 32 characters in the production secret manager.
2. Update the application and scheduler atomically so scheduled jobs never hit an authorization gap.
3. Verify unauthenticated and old secret requests return `401` while the new scheduler credential succeeds.
4. Confirm the secret never appears in workflow files, logs, URLs, analytics or provider error payloads.
5. Record a repeatable rotation and rollback procedure.



### Verify the CI workflow on GitHub

> **Status**: validated locally, hosted execution pending.

`.github/workflows/ci.yml` runs a clean install, production advisory check, type check, lint and production build, with read only permissions, cancellation of stale runs, a job timeout, non persistent checkout credentials and SHA pinned actions.

**Follow up**

- Run the workflow on a GitHub hosted Ubuntu runner.
- Confirm npm caching and the Node 22 build behave as expected.
- Make the job a required branch protection check.
- Periodically review and deliberately update the pinned action SHAs from their official releases.



## Verification gaps



### PostgreSQL transaction integration has not been executed

> **Status**: statically verified, never integration tested.

The audit implemented an atomic magic link completion statement covering token locking, invite locking, user upsert, account defaults, session creation, invite acceptance and token consumption. Repository ingestion and snapshot writes share a Neon batch. Administrative user changes, deletions, invitations and allowlist mutations commit their audit record in the same statement or transactional batch.

Docker, `psql` and a local PostgreSQL server were all unavailable, and running these paths against the configured database would have mutated remote state.

**Follow up**

- Run the migrations against a disposable PostgreSQL or Neon branch.
- Send two concurrent requests with the same magic link token. Exactly one must create a session.
- Force a statement failure and confirm the token, invite, user defaults and session all roll back.
- Force a metric snapshot failure and confirm its repository write rolls back in the same batch.
- Force every supported admin audit insert to fail and confirm the associated admin mutation rolls back.
- Run two copies of each leased job and confirm only one performs the work.



### Rendered UI and accessibility matrix was not executable

> **Status**: source audited and server rendered routes checked. Rendered interaction checks open.

The UI audit repaired global focus visibility, global scrollbar suppression, dialog focus management, reduced motion handling, form labels, live announcements, tab semantics, table semantics, skip navigation and mobile viewport height handling. No browser backend was available and the repository has no browser or accessibility test runner.

Unverified in a real browser:

- Mobile, tablet, desktop, wide screen, portrait and landscape layouts.
- Browser zoom through 200%, text expansion and horizontal overflow behavior.
- End to end keyboard order, visible focus placement, dialog trapping and restoration, mobile menu Escape behavior.
- Computed contrast, forced colors behavior, screen reader output and automated accessibility rules.
- Runtime reduced motion behavior for CSS, Framer Motion, scroll effects and landing page physics.
- Authenticated, admin, empty, partial, error, long content and permission restricted visual states.

Only the dark theme is implemented. Light theme and right to left behavior are not supported features and were not added.

**Follow up**

- Run the state matrix in a real browser with normal and reduced motion, keyboard only input, forced colors and 200% zoom.
- Run an established accessibility scanner once a browser test system is chosen.
- Repeat the matrix with disposable authenticated user and admin accounts.



### Automated regression coverage is partial

> **Status**: focused unit runner added, integration coverage open.

The repository runs persistent TypeScript tests through Node's test runner and the existing `tsx` dependency, and CI executes them through `npm test`. Coverage protects authentication error mapping, trust boundary input normalization, issue sync cursor progression, unsafe Markdown protocol removal and README URL resolution.

Concurrency and rollback regressions stay unprotected without a disposable PostgreSQL target. Client mutation, focus, responsive, hydration and stale response behavior still need a browser backend.

**Follow up**

- Add PostgreSQL backed integration tests for authentication, admin invariants, job leases, rate limits, issue synchronization, email idempotency and atomic ingestion.
- Add browser tests for account forms, duplicate submission prevention, stale response handling, optimistic rollback, unauthorized states and retry paths.



### Live external workflows were not exercised

> **Status**: needs isolated credentials and disposable external state.

No state changing tests ran against the deployed Neon database, Resend delivery, GitHub ingestion under real rate limits, authenticated browser sessions or overlapping production cron invocations.

**Follow up**

- Use a disposable Neon branch and test credentials.
- Use non production email recipients and a provider test domain.
- Capture GitHub rate limit and partial response behavior.
- Verify scheduled job lease renewal and recovery after a forced termination.



### Performance evidence is limited to local build output

> **Status**: configuration corrected, real user effect unmeasured.

The global image optimization bypass was removed and the production build passed. Shared first load JavaScript stayed at 102 kB and the largest route at 235 kB. Local build times are not comparable across runs because cache state, host load and worktree contents differed.

**Follow up**

- Capture production Core Web Vitals and route level server timing.
- Measure optimized image transfer size and image service CPU and cache behavior on the chosen host.
- Profile slow database queries and GitHub backed request waterfalls under representative data and traffic.
- Add budgets only once measurements identify stable thresholds.



## Policy and product decisions



### Production observability and health readiness are not established

> **Status**: needs deployment and privacy decisions.

The source has bounded error logs, and the production readiness audit removed raw provider and database objects from updated logging paths. The repository configures none of: a production error reporting destination, structured log transport and retention, metrics or distributed traces, cross service request and job correlation, a hosting specific liveness or readiness probe, alert thresholds, or an incident recovery runbook.

This was not automated because a vendor choice changes data processing, retention, cost and deployment configuration; a readiness probe must reflect the host's contract and whether third party degradation should pull an instance from service; and logging complete request bodies, headers, cookies, email addresses or tokens would create privacy and security risk.

**Follow up**

- Select privacy reviewed logging, error reporting, metric and tracing destinations.
- Add privacy safe request and job identifiers and propagate them through background work.
- Define liveness separately from readiness and expose only the minimum non sensitive status the host requires.
- Alert on cron authorization failures, limiter denials, GitHub quota, job lease expiry, email failures, database saturation and elevated route errors.
- Document retry, rollback and incident recovery ownership.



### Forwarded client IPs require a trusted proxy

> **Status**: deployment dependent.

Rate limit counters are shared in PostgreSQL and their keys are HMAC hashed, but the source IP still comes from `x-forwarded-for` or `x-real-ip`. If clients can send those headers directly and the edge proxy does not replace them, an attacker can rotate spoofed values to evade per IP limits.

**Follow up**

- Configure the edge proxy to strip client supplied forwarding headers and set its own trusted value.
- Prefer a platform specific verified client IP header once the deployment platform is final.
- Add an integration test at the deployed edge, not only inside Next.js.



### Historical magic link metadata needs a retention decision

> **Status**: new writes fixed, historical cleanup pending.

New magic link rows store an invite identifier rather than a raw invite token. A still valid legacy link can be consumed during the compatibility window, and consumption strips its old `inviteToken` metadata field.

Expired historical rows may keep old metadata until the row is deleted or a cleanup task removes the field. Backups and provider logs have separate retention lifecycles that application code cannot verify. Bulk deletion was skipped because production row volume, retention requirements, backup policy and rollback expectations were unknown.

**Follow up**

- Define the retention period for expired authentication token rows.
- Run a deployment reviewed cleanup that removes the legacy metadata field or expired rows without exposing token values in logs.
- Confirm backup expiry and restore procedures do not retain authentication credentials longer than intended.



### Email guarantees depend on stable event keys

> **Status**: resolved for current workflows, convention needed for future email types.

Magic link and digest sends provide stable event level idempotency keys. Delivery records enforce uniqueness locally and Resend receives the same key during safe retries.

A future email call site that omits `idempotencyKey` gets only a per attempt key and will not be deduplicated across separate application invocations. Resend retains provider side keys for 24 hours, so longer deduplication depends on the local delivery record surviving.

**Follow up**

- Require a stable domain event idempotency key for every new retryable email workflow.
- Add a code review or lint convention around `sendEmail` call sites.
- Exercise timeout after provider acceptance against a Resend test account.



### Public icon and social preview ownership is undocumented

> **Status**: font provenance fixed, remaining assets need owner confirmation.

The bundled Badeen Display and Geist fonts now carry upstream hashes, provenance and license text. No equivalent repository visible provenance exists for `public/icon.svg` or `public/landing-preview.jpg`.

**Follow up**

- Record whether each asset is original, commissioned, generated or obtained from a third party.
- Keep source and license or permission evidence where applicable.
- Confirm the CC-BY-NC-SA-4.0 license is compatible with the intended distribution of each asset.



### Stored theme and private profile preferences have no product behavior

> **Status**: intentionally outside every audit scope.

The database and account APIs store `theme` and `privateProfile`, but no global theme system or public profile visibility feature exists. Completing either needs product and UI decisions beyond a correctness audit.

**Follow up**

- Define the intended theme application and persistence lifecycle.
- Define which profile data is public, the affected routes and server side privacy enforcement, before `privateProfile` is treated as a security boundary.



## Excluded by design

Generated and externally managed areas were never manually refactored and are not defects: `node_modules`, `.next` and other build output, Drizzle snapshot JSON beyond generator produced updates, generated language color JSON, lockfile internals when dependencies did not change, binary images, and `.env` values. Font binaries were separately hash compared against upstream and their licenses documented. Regenerate these areas only through their owning tools.

## Completion criteria

This document can be deleted once all of the following hold:

- [ ] Migrations `0014` and `0015` are applied, and their constraints, columns and indexes are verified in every target environment.
- [ ] The production cron credential is generated, atomically deployed to the scheduler and application, and its rotation path is tested.
- [ ] Transactional authentication, ingestion, leases and rate limits have PostgreSQL integration coverage.
- [ ] Trusted proxy IP handling is verified in deployment.
- [ ] The rendered browser and accessibility matrix has been run against authenticated and admin states.
- [ ] Stable idempotency keys are required for all retryable email types.
- [ ] Historical authentication token retention and cleanup are documented and exercised.
- [ ] Production observability, liveness and readiness, alerting and incident ownership are established.
- [ ] Hosting, trusted proxy, TLS, preview indexing, CSP evaluation, secret management, backup and restore controls are verified.
- [ ] Public icon and social preview provenance is documented.