# Production-Readiness Audit — 2026-07-14

## Outcome

The repository now has scoped fixes for every verified production-readiness defect that could be corrected safely from source. The completed security scan found three reportable issues—two request-amplification paths and one weak cron-credential configuration path—and all three are fixed in the current working tree. Four additional defense-in-depth concerns below the scan's reportability threshold were also fixed.

This is not a claim that OpenDeck is fully secure, compliant, performant, or production-ready. Production infrastructure, real traffic, provider dashboards, authenticated browser fixtures, and a disposable PostgreSQL environment were unavailable. Those limitations are recorded in [unresolved-audit-items.md](./unresolved-audit-items.md).

## Review identity and scope

- Framework: Next.js 15.5.19 App Router with React 19 and strict TypeScript.
- Package manager and build: npm, Next.js production build, ESLint 9, and Biome 2.
- Styling and motion: Tailwind CSS 4, local semantic CSS variables, Framer Motion, Radix primitives, and Iconify.
- Data: Neon PostgreSQL through Drizzle ORM and generated SQL migrations.
- Authentication: passwordless email magic links, hashed server sessions, invite and allowlist policy, and administrator roles.
- External integrations: GitHub REST API and Markdown renderer, Resend email, Neon PostgreSQL, and GitHub Actions schedules.
- Hosting assumptions: a Node-capable Next.js host behind trusted HTTPS and forwarding-header infrastructure. No repository-owned platform deployment file identifies the actual provider.
- Monitoring and analytics: no production monitoring, error-reporting, tracing, analytics, or session-replay service is configured in the repository.
- Queues and workers: no external queue. Scheduled GitHub Actions call protected Next.js routes; database leases coordinate jobs.

The security phase reviewed 252 first-party files through 51 inventory shards. All 252 files received review receipts, all 16 security surfaces received a final disposition, and all 10 discovered candidates received validation closure. Three candidates survived as reportable findings.

### Directories inspected

- `.github/workflows`
- `docs`
- `drizzle`
- `public`
- `scripts`
- `src/app`
- `src/components`
- `src/config`
- `src/db`
- `src/features`
- `src/hooks`
- `src/lib`
- `src/operations`
- `src/utils`
- Repository-root manifests and configuration files

### Generated and excluded areas

- `node_modules/**`: dependency source was not manually refactored; manifests, the lockfile, lifecycle scripts, license metadata, and npm advisory data were reviewed.
- `.next/**`: generated output was excluded from source review but was regenerated and inspected through the production build and server smoke test.
- `drizzle/meta/**`: generator-owned snapshots were not manually refactored; schema source, migration SQL, and journal order were reviewed.
- `src/features/repositories/data/language-colors.json`: generator-owned data; its generator and consumers were reviewed.
- `next-env.d.ts`: framework-generated type shim.
- `.env`: secret values were not printed or modified.

## Verified issues fixed

### Security

1. Public repository comparison request amplification — Medium / P2.
   - The public compare route could initiate four cold repository issue synchronizations without a caller budget.
   - The route now uses the existing database-backed limiter before comparison, keyed by caller IP, with 20 requests per five minutes.
   - Denials return `429`, `Retry-After`, and `Cache-Control: no-store` before GitHub or database work.

2. Authenticated contributor lookup request amplification — Low / P3.
   - Any active account could rotate distinct mirrored repositories through a cold, twenty-page GitHub contributor fetch.
   - The route now uses a per-user database-backed budget of 30 requests per five minutes before contributor lookup.
   - Existing authentication, mirror-membership, page, payload, timeout, and cache bounds remain intact.

3. Guessable production cron credential — Medium / P2.
   - Production previously accepted any nonempty `CRON_SECRET`, including one character.
   - `serverEnv.cronSecret` now rejects configured production secrets shorter than 32 characters.
   - Missing-secret fail-closed behavior, timing-safe comparison, bounded inputs, and database job leases remain intact.

4. Last-active-administrator races — defense in depth.
   - Role changes and deletes previously made a pre-transaction last-admin decision that could become stale.
   - Both operations now lock active administrator rows and re-evaluate the invariant inside the same database batch before mutation.

5. Cleartext invite token in magic-link metadata — defense in depth.
   - New magic-link rows store an invite identifier instead of the raw invite token.
   - Completion resolves the invite by identifier, normalized email, and expiry.
   - Legacy links remain temporarily compatible, and consuming one removes its old `inviteToken` metadata field.

6. Cross-account private browser cache collision — defense in depth.
   - Personal repository cache and in-flight keys now include both authenticated user ID and case-normalized repository name.

7. Entity-obfuscated unsafe Markdown protocols — defense in depth.
   - The sanitizer now decodes numeric and relevant named character references before checking `javascript:`, `vbscript:`, and `data:` protocols.
   - The security candidate was rejected as reportable because the documented upstream GitHub Markdown renderer removed the crafted links before returning HTML, but the local second boundary was still hardened. See [GitHub's Markdown API documentation](https://docs.github.com/en/rest/markdown/markdown).

8. CI supply-chain drift.
   - GitHub Actions are pinned to full commit SHAs.
   - Checkout credentials are not persisted.
   - Workflow permissions are read-only, jobs have timeouts, and CI concurrency cancels stale runs.
   - The added CI workflow runs clean install, production dependency audit, type checking, linting, and a production build.
   - Pin provenance was checked against the official [checkout releases](https://github.com/actions/checkout/releases) and [setup-node releases](https://github.com/actions/setup-node/releases).

### Privacy and sensitive data

- Added `safeErrorContext()` and replaced raw database, email-provider, and authentication error logging in high-risk handlers with a bounded name/code/cause-code object.
- Removed user IDs from the updated catch-all logs where they were unnecessary for diagnosis.
- Prevented new raw invite credentials from entering magic-link metadata.
- Isolated private browser cache state by user identity.
- A high-confidence secret-format scan covered 322 source-controlled and non-ignored first-party files and found no private keys, GitHub tokens, AWS access keys, Google keys, Slack tokens, Stripe live secrets, Resend keys, or credential-bearing PostgreSQL URLs.

### SEO and metadata

- Added noindex, nofollow, and nocache metadata to private dashboard home, administrator, and dynamic repository pages.
- Dynamic repository metadata now validates names, uses one canonical encoder, and avoids double decoding.
- Missing shared collections and invalid repository routes now return a real framework 404 rather than a successful empty page.
- Added a route-local shared-collection not-found page so the existing visual language is preserved.
- Missing shared-collection metadata is noindex.
- Sitemap generation no longer fabricates a build-time `lastModified` timestamp for static routes.
- Local production HTTP evidence confirmed:
  - root title `OpenDeck - Open Source Discovery`;
  - canonical `https://opendeck.akasewang.me`;
  - absolute Open Graph image URL;
  - `<html lang="en">`;
  - robots and sitemap responses at `200`;
  - sitemap contains no fabricated `<lastmod>`;
  - dashboard metadata is `noindex, nofollow, nocache`;
  - missing shared content and invalid repository routes return `404`.

### Performance

- Removed the global `images.unoptimized: true` override so existing `next/image` usage can use the framework image pipeline on a compatible host.
- No speculative memoization, caching, dynamic imports, dependency swaps, or business-logic rewrites were made.
- The final build retained 102 kB of shared first-load JavaScript; the largest route remained `/dashboard/home` at 235 kB first-load JavaScript.
- The initial build elapsed in 90.06 seconds and the final build in 132.76 seconds, with final compilation taking 51 seconds. These local runs are not a controlled performance comparison: cache state, concurrent host load, and the much larger changed worktree differ. No speedup is claimed.
- No production Core Web Vitals, CDN transfer measurements, query plans, request traces, or bundle-analyzer output were available. The image change is therefore a verified configuration correction, not a measured user-performance improvement.

### Reliability and deployment safety

- Expensive compare and contributor operations now fail closed at caller budgets before external work.
- Production rejects short configured cron credentials.
- Existing job leases, bounded pagination, timeouts, and idempotency controls were preserved.
- CI now enforces the repository's install, audit, type, lint, and build gates on pushes and pull requests.
- Security responses preserve stable user-safe messages while server logs retain bounded diagnostic class and code information.
- The additive migrations were reviewed for ordering and backward-compatible object creation. The repository owner reports migrations `0012` and `0013` were applied; this audit did not independently query the target database.

### Dependency and supply-chain status

- No dependency version or dependency classification was changed during this audit.
- `package-lock.json` was not modified by the production-readiness work.
- `npm audit --json`: 0 known vulnerabilities across 520 packages.
- `npm audit --omit=dev --json`: 0 known vulnerabilities.
- `npm ls --all --depth=0`: valid installed top-level dependency tree.
- No suspicious dependency name, unowned remote runtime script, or unexpected first-party postinstall hook was found.
- Lifecycle scripts identified in the dependency graph were limited to known native/build packages such as esbuild, sharp, and unrs-resolver.
- Available major or minor upgrades were intentionally not applied because advisory-free dependencies do not justify an unscoped upgrade.

### Licensing and asset ownership

- The bundled Badeen Display and Geist font binaries were hash-compared with their official upstream files.
- Added the SIL Open Font License text and a provenance/hash README beside the fonts. Sources: [Badeen Display OFL](https://github.com/google/fonts/blob/main/ofl/badeendisplay/OFL.txt) and [Geist license](https://github.com/vercel/geist-font/blob/main/LICENSE.txt).
- Dependency license metadata had no missing or `UNLICENSED` package entries in the reviewed install.
- The repository-visible ownership or source of `public/icon.svg` and `public/landing-preview.jpg` remains undocumented and needs owner confirmation.

## Files changed by this audit

### Security, privacy, and reliability

- `.env.example`
- `.github/workflows/ci.yml`
- `.github/workflows/ingest-daily.yml`
- `.github/workflows/ingest-trending.yml`
- `src/app/api/account/[...resource]/route.ts`
- `src/app/api/admin/[...resource]/route.ts`
- `src/app/api/auth/magic-link/callback/route.ts`
- `src/app/api/auth/magic-link/route.ts`
- `src/app/api/auth/session/route.ts`
- `src/app/api/cron/account-alerts/route.ts`
- `src/app/api/repos/compare/route.ts`
- `src/app/api/repos/contributors/route.ts`
- `src/config/server-env.ts`
- `src/features/auth/services/admin-role-service.ts`
- `src/features/auth/services/authentication-service.ts`
- `src/features/auth/services/magic-link-service.ts`
- `src/features/repositories/api/personal-repo-cache.ts`
- `src/lib/api/errors.ts`
- `src/lib/email/email-client.ts`
- `src/lib/github/markdown.ts`

### Performance, SEO, and licensing

- `next.config.ts`
- `src/app/dashboard/(overview)/page.tsx`
- `src/app/dashboard/admin/page.tsx`
- `src/app/dashboard/home/page.tsx`
- `src/app/dashboard/repos/[owner]/[repo]/page.tsx`
- `src/app/shared/collections/[slug]/not-found.tsx`
- `src/app/shared/collections/[slug]/page.tsx`
- `src/app/sitemap.ts`
- `src/lib/seo/fonts/OFL-1.1.txt`
- `src/lib/seo/fonts/README.md`

The repository already contained extensive uncommitted changes from earlier audits and user work. This list identifies the production-readiness changes; it does not imply ownership of every diff shown by Git.

## Validation evidence

| Check | Result |
| --- | --- |
| Canonical Codex Security finalizer | Passed twice; sealed scan, 3 findings, 16 closed surfaces, 23 evidence artifacts, Markdown report, and SARIF |
| Compare resource-control probe | Passed vulnerable-model arithmetic and fixed 20-per-five-minute denial behavior |
| Contributor loopback probe | Passed 401/no-upstream, 20-page cold fetch, same-URL cache, and distinct-URL fan-out assertions |
| Production cron-secret probe | Passed; one-character secret rejected with a clear configuration error |
| Markdown sanitizer assertions | Passed four encoded unsafe-protocol cases; safe HTTPS preserved |
| Private browser-cache assertions | Passed per-user isolation and repository-name case normalization |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed; ESLint and Biome checked 238 files with no warnings |
| `npm run build` | Passed; 31 static pages generated, shared first-load JS 102 kB |
| Full npm audit | Passed; 0 known vulnerabilities across 520 packages |
| Production-only npm audit | Passed; 0 known vulnerabilities |
| Installed top-level dependency tree | Passed |
| High-confidence secret-format scan | 322 files scanned, 0 hits; Gitleaks itself was unavailable |
| Production HTTP smoke test | Passed representative public, private, missing, invalid, unauthenticated, and cron responses |
| Security headers | Confirmed `nosniff`, frame deny, strict-origin referrer policy, restrictive permissions policy, and HSTS |
| Production server logs | Next.js ready in 4 seconds; stderr empty; server stopped cleanly |

## Checks not completed

- No browser backend was available, so hydration warnings, browser console output, keyboard behavior, viewport behavior, and browser accessibility rules were not verified.
- No established test runner exists, so the safe probes remain audit artifacts rather than persistent repository tests.
- GitHub Actions workflow syntax and action execution were not exercised on a GitHub-hosted runner.
- Authenticated, administrator, magic-link, and concurrency workflows were not executed against a disposable PostgreSQL database.
- The applied state of migrations `0012` and `0013` was reported by the owner but not independently queried.
- Resend delivery, GitHub rate-limit behavior, scheduled-job retries, and overlapping production jobs were not exercised with external credentials.
- Hosting, DNS, TLS termination, WAF/CDN policy, trusted forwarding headers, secret storage and rotation, backups, database roles, preview indexing, and storage permissions were not available.
- No production logs, metrics, traces, Core Web Vitals, query plans, or real traffic baseline were available.
- Privacy retention, account-deletion propagation through backups and providers, and compliance obligations require product, legal, and infrastructure confirmation.

## Recommendations intentionally not implemented

- A Content Security Policy was not added without deployed script/font/image inventory and report-only browser testing; an untested CSP can break supported workflows.
- A monitoring, tracing, or error-reporting vendor was not introduced without a platform and privacy decision.
- A health/readiness endpoint was not invented without knowing the hosting probe contract and which dependencies should gate readiness.
- Edge rate limiting was not represented as verified; the source now has database-backed limits, while trusted client-IP provenance remains a deployment requirement.
- Dependency upgrades were not performed merely because newer releases exist.
- Database `CHECK` constraints were not generated before validating deployed data.
- Historical expired magic-link metadata was not bulk-deleted without a retention and deployment-safe cleanup plan.
- No new browser or screenshot framework was introduced solely for this audit.

## Remaining risks and next actions

The authoritative residual list is [unresolved-audit-items.md](./unresolved-audit-items.md). Before production rollout, the most important actions are:

1. Generate and atomically rotate a random production `CRON_SECRET` of at least 32 characters in both the scheduler and application.
2. Verify migrations `0012` and `0013` and exercise transactions, last-admin concurrency, job leases, and rate limits against a disposable PostgreSQL or Neon branch.
3. Confirm the deployment edge strips caller-supplied forwarding headers and supplies one trusted client-IP value.
4. Run the new CI workflow on GitHub and make it a required branch check.
5. Establish production error reporting, structured logs, metrics, request/job identifiers, and safe health/readiness behavior.
6. Run the rendered browser, accessibility, authenticated-state, reduced-motion, zoom, and responsive matrix.
7. Define privacy retention/deletion behavior, historical token cleanup, backup expiry, and third-party processor obligations.
8. Confirm provenance and usage rights for the public icon and social-preview image.
