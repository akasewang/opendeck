# Production Readiness Audit

[![Audited](https://img.shields.io/badge/Audited-14_July_2026-000000?style=for-the-badge)](#)
[![Findings](https://img.shields.io/badge/3_Reportable_Findings-FFBD2E?style=for-the-badge)](#findings)
[![Fixed](https://img.shields.io/badge/All_Fixed_In_Source-00E599?style=for-the-badge)](#findings)
[![Reviewed](https://img.shields.io/badge/252_Files_Reviewed-2088FF?style=for-the-badge)](#outcome)
[![Residuals](https://img.shields.io/badge/14_Open_Items-0055FF?style=for-the-badge)](./unresolved-audit-items.md)

## Outcome

Every verified production readiness defect that could be corrected safely from source now has a scoped fix. The security scan surfaced three reportable issues, two request amplification paths and one weak cron credential path, and all three are fixed. Four further defense in depth concerns below the scan's reportability threshold were fixed as well.

This is **not** a claim that OpenDeck is fully secure, compliant, performant or production ready. Production infrastructure, real traffic, provider dashboards, authenticated browser fixtures and a disposable PostgreSQL environment were all unavailable. Those limits are tracked in [unresolved-audit-items.md](./unresolved-audit-items.md).

The security phase reviewed 252 first party files across 51 inventory shards. All 252 files received review receipts, all 16 security surfaces received a final disposition and all 10 discovered candidates received validation closure. Three candidates survived as reportable findings.

## Findings

All eight are fixed in the current source. Severity follows the security scan's own rating.

| | Finding | Severity | Surface |
| :-- | :-- | :-- | :-- |
| 1 | Public repository comparison request amplification | ![Medium](https://img.shields.io/badge/Medium_P2-FFBD2E?style=flat-square) | `api/repos/compare/route.ts` |
| 2 | Authenticated contributor lookup request amplification | ![Low](https://img.shields.io/badge/Low_P3-61DAFB?style=flat-square) | `api/repos/contributors/route.ts` |
| 3 | Guessable production cron credential | ![Medium](https://img.shields.io/badge/Medium_P2-FFBD2E?style=flat-square) | `config/server-env.ts` |
| 4 | Last active administrator races | ![Defense in depth](https://img.shields.io/badge/Defense_in_depth-2088FF?style=flat-square) | `auth/services/admin-role-service.ts` |
| 5 | Cleartext invite token in magic link metadata | ![Defense in depth](https://img.shields.io/badge/Defense_in_depth-2088FF?style=flat-square) | `auth/services/magic-link-service.ts` |
| 6 | Cross account private browser cache collision | ![Defense in depth](https://img.shields.io/badge/Defense_in_depth-2088FF?style=flat-square) | `repositories/api/personal-repo-cache.ts` |
| 7 | Entity obfuscated unsafe Markdown protocols | ![Defense in depth](https://img.shields.io/badge/Defense_in_depth-2088FF?style=flat-square) | `lib/github/markdown.ts` |
| 8 | CI supply chain drift | ![Hardening](https://img.shields.io/badge/Hardening-0055FF?style=flat-square) | `.github/workflows/` |

### 1. Public repository comparison request amplification

The public compare route could start four cold repository issue synchronizations with no caller budget. It now applies the existing database backed limiter before comparison, keyed by caller IP, at 20 requests per five minutes. Denials return `429`, `Retry-After` and `Cache-Control: no-store` before any GitHub or database work.

### 2. Authenticated contributor lookup request amplification

Any active account could rotate distinct mirrored repositories through a cold twenty page GitHub contributor fetch. The route now applies a per user database backed budget of 30 requests per five minutes before the lookup. Existing authentication, mirror membership, page, payload, timeout and cache bounds are intact.

### 3. Guessable production cron credential

Production previously accepted any nonempty `CRON_SECRET`, including a single character. `serverEnv.cronSecret` now rejects configured production secrets shorter than 32 characters. Fail closed behavior on a missing secret, timing safe comparison, bounded inputs and database job leases are intact.

### 4. Last active administrator races

Role changes and deletes made a pre transaction last admin decision that could go stale. Both operations now lock active administrator rows and re evaluate the invariant inside the same database batch before mutating.

### 5. Cleartext invite token in magic link metadata

New magic link rows store an invite identifier instead of the raw invite token. Completion resolves the invite by identifier, normalized email and expiry. Legacy links stay temporarily compatible, and consuming one strips its old `inviteToken` metadata field.

### 6. Cross account private browser cache collision

Personal repository cache keys and in flight keys now include both the authenticated user ID and the case normalized repository name.

### 7. Entity obfuscated unsafe Markdown protocols

The sanitizer now decodes numeric and relevant named character references before checking for the `javascript:`, `vbscript:` and `data:` protocols. This was rejected as reportable because the upstream [GitHub Markdown API](https://docs.github.com/en/rest/markdown/markdown) already removed the crafted links before returning HTML, but the local second boundary was hardened anyway.

### 8. CI supply chain drift

GitHub Actions are pinned to full commit SHAs, checkout credentials are not persisted, workflow permissions are read only, jobs have timeouts and CI concurrency cancels stale runs. The added CI workflow runs a clean install, a production dependency audit, type checking, linting and a production build. Pin provenance was checked against the official [checkout](https://github.com/actions/checkout/releases) and [setup-node](https://github.com/actions/setup-node/releases) releases.

## Other corrections

### Privacy and sensitive data

- Added `safeErrorContext()` and replaced raw database, email provider and authentication error logging in high risk handlers with a bounded name, code and cause code object.
- Removed user IDs from updated catch all logs where they were not needed for diagnosis.
- Stopped new raw invite credentials from entering magic link metadata.
- Isolated private browser cache state by user identity.
- A high confidence secret format scan covered 322 source controlled first party files and found no private keys, GitHub tokens, AWS access keys, Google keys, Slack tokens, Stripe live secrets, Resend keys or credential bearing PostgreSQL URLs.

### SEO and metadata

- Added noindex, nofollow and nocache metadata to the private dashboard home, administrator and dynamic repository pages.
- Dynamic repository metadata now validates names, uses one canonical encoder and avoids double decoding.
- Missing shared collections and invalid repository routes now return a real framework 404 instead of a successful empty page, with a route local not found page that preserves the existing visual language.
- Sitemap generation no longer fabricates a build time `lastModified` timestamp for static routes.

Local production HTTP evidence confirmed the root title `OpenDeck - Open Source Discovery`, canonical `https://opendeck.akasewang.me`, an absolute Open Graph image URL, `<html lang="en">`, robots and sitemap at `200`, no fabricated `<lastmod>`, `noindex, nofollow, nocache` on dashboard metadata, and `404` on missing shared content and invalid repository routes.

### Performance

- Removed the global `images.unoptimized: true` override so existing `next/image` usage can reach the framework image pipeline on a compatible host.
- No speculative memoization, caching, dynamic imports, dependency swaps or business logic rewrites were made.
- The final build kept 102 kB of shared first load JavaScript. The largest route stayed `/dashboard/home` at 235 kB first load JavaScript.
- Build times (90.06s initial, 132.76s final) are **not** a controlled comparison: cache state, host load and worktree size all differed. No speedup is claimed.
- No production Core Web Vitals, CDN transfer measurements, query plans or bundle analyzer output were available. The image change is a verified configuration correction, not a measured user performance improvement.

### Reliability and deployment safety

- Expensive compare and contributor operations now fail closed at caller budgets before doing external work.
- Existing job leases, bounded pagination, timeouts and idempotency controls were preserved.
- CI now enforces the install, audit, type, lint and build gates on pushes and pull requests.
- Security responses keep stable user safe messages while server logs retain bounded diagnostic class and code information.
- Additive migrations were reviewed for ordering and backward compatible object creation.

### Dependencies and supply chain

| Check | Result |
| :-- | :-- |
| `npm audit` | 0 known vulnerabilities across 520 packages |
| `npm audit --omit=dev` | 0 known vulnerabilities |
| `npm ls --all --depth=0` | Valid installed top level tree |
| Dependency changes | None. `package-lock.json` untouched by this audit |
| Lifecycle scripts | Limited to known native build packages such as esbuild, sharp and unrs-resolver |

No suspicious dependency name, unowned remote runtime script or unexpected first party postinstall hook was found. Available upgrades were intentionally not applied, because advisory free dependencies do not justify an unscoped upgrade.

### Licensing and asset ownership

- The bundled Badeen Display and Geist font binaries were hash compared against their official upstream files.
- Added the SIL Open Font License text and a provenance and hash README beside the fonts. Sources: [Badeen Display OFL](https://github.com/google/fonts/blob/main/ofl/badeendisplay/OFL.txt) and [Geist license](https://github.com/vercel/geist-font/blob/main/LICENSE.txt).
- Dependency license metadata had no missing or `UNLICENSED` entries.
- Ownership of `public/icon.svg` and `public/landing-preview.jpg` is still undocumented and needs owner confirmation.

## Validation evidence

| Check | Result |
| :-- | :-- |
| Canonical Codex Security finalizer | Passed twice. Sealed scan, 3 findings, 16 closed surfaces, 23 evidence artifacts, Markdown report and SARIF |
| Compare resource control probe | Passed vulnerable model arithmetic and the fixed 20 per five minute denial behavior |
| Contributor loopback probe | Passed 401 with no upstream call, 20 page cold fetch, same URL cache and distinct URL fan out assertions |
| Production cron secret probe | Passed. A one character secret is rejected with a clear configuration error |
| Markdown sanitizer assertions | Passed four encoded unsafe protocol cases. Safe HTTPS preserved |
| Private browser cache assertions | Passed per user isolation and repository name case normalization |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed. ESLint and Biome checked 238 files with no warnings |
| `npm run build` | Passed. 31 static pages generated, shared first load JS 102 kB |
| Full and production only `npm audit` | Passed. 0 known vulnerabilities |
| High confidence secret format scan | 322 files scanned, 0 hits. Gitleaks itself was unavailable |
| Production HTTP smoke test | Passed representative public, private, missing, invalid, unauthenticated and cron responses |
| Security headers | Confirmed `nosniff`, frame deny, strict origin referrer policy, restrictive permissions policy and HSTS |
| Production server logs | Next.js ready in 4 seconds. stderr empty, server stopped cleanly |

## Checks not completed

- No browser backend was available, so hydration warnings, browser console output, keyboard behavior, viewport behavior and browser accessibility rules were not verified.
- GitHub Actions workflow syntax and action execution were not exercised on a GitHub hosted runner.
- Authenticated, administrator, magic link and concurrency workflows were not executed against a disposable PostgreSQL database.
- Resend delivery, GitHub rate limit behavior, scheduled job retries and overlapping production jobs were not exercised with external credentials.
- Hosting, DNS, TLS termination, WAF and CDN policy, trusted forwarding headers, secret storage and rotation, backups, database roles, preview indexing and storage permissions were unavailable.
- No production logs, metrics, traces, Core Web Vitals, query plans or real traffic baseline were available.
- Privacy retention, account deletion propagation through backups and providers, and compliance obligations need product, legal and infrastructure confirmation.

## Recommendations intentionally not implemented

- A Content Security Policy was not added without a deployed script, font and image inventory plus report only browser testing. An untested CSP can break supported workflows.
- A monitoring, tracing or error reporting vendor was not introduced without a platform and privacy decision.
- A health and readiness endpoint was not invented without knowing the hosting probe contract and which dependencies should gate readiness.
- Edge rate limiting was not represented as verified. The source has database backed limits, while trusted client IP provenance stays a deployment requirement.
- Dependency upgrades were not performed merely because newer releases exist.
- Database `CHECK` constraints were not generated before validating deployed data.
- Historical expired magic link metadata was not bulk deleted without a retention and deployment safe cleanup plan.
- No new browser or screenshot framework was introduced solely for this audit.

<details>
<summary><b>Review identity and scope</b></summary>

- **Framework**: Next.js 15.5.19 App Router, React 19, strict TypeScript.
- **Build and tooling**: npm, Next.js production build, ESLint 9, Biome 2.
- **Styling and motion**: Tailwind CSS 4, local semantic CSS variables, Framer Motion, Radix primitives, Iconify.
- **Data**: Neon PostgreSQL through Drizzle ORM with generated SQL migrations.
- **Authentication**: passwordless email magic links, hashed server sessions, invite and allowlist policy, administrator roles.
- **External integrations**: GitHub REST API and Markdown renderer, Resend email, Neon PostgreSQL, GitHub Actions schedules.
- **Hosting assumptions**: a Node capable Next.js host behind trusted HTTPS and forwarding header infrastructure. No repository owned platform deployment file identifies the actual provider.
- **Monitoring**: none configured in the repository.
- **Queues and workers**: no external queue. Scheduled GitHub Actions call protected Next.js routes and database leases coordinate jobs.

**Directories inspected**: `.github/workflows`, `docs`, `drizzle`, `public`, `scripts`, `src/app`, `src/components`, `src/config`, `src/db`, `src/features`, `src/hooks`, `src/lib`, `src/operations`, `src/utils`, and repository root manifests.

**Excluded as generated or externally owned**:

- `node_modules/**`: not manually refactored. Manifests, lockfile, lifecycle scripts, license metadata and npm advisory data were reviewed.
- `.next/**`: excluded from source review, but regenerated and inspected through the production build and server smoke test.
- `drizzle/meta/**`: generator owned snapshots. Schema source, migration SQL and journal order were reviewed.
- `src/features/repositories/data/language-colors.json`: generator owned. Its generator and consumers were reviewed.
- `next-env.d.ts`: framework generated type shim.
- `.env`: secret values were never printed or modified.

</details>

<details>
<summary><b>Files changed by this audit</b></summary>

**Security, privacy and reliability**

`.env.example` · `.github/workflows/ci.yml` · `.github/workflows/ingest-daily.yml` · `.github/workflows/ingest-trending.yml` · `src/app/api/account/[...resource]/route.ts` · `src/app/api/admin/[...resource]/route.ts` · `src/app/api/auth/magic-link/callback/route.ts` · `src/app/api/auth/magic-link/route.ts` · `src/app/api/auth/session/route.ts` · `src/app/api/cron/account-alerts/route.ts` · `src/app/api/repos/compare/route.ts` · `src/app/api/repos/contributors/route.ts` · `src/config/server-env.ts` · `src/features/auth/services/admin-role-service.ts` · `src/features/auth/services/authentication-service.ts` · `src/features/auth/services/magic-link-service.ts` · `src/features/repositories/api/personal-repo-cache.ts` · `src/lib/api/errors.ts` · `src/lib/email/email-client.ts` · `src/lib/github/markdown.ts`

**Performance, SEO and licensing**

`next.config.ts` · `src/app/dashboard/(overview)/page.tsx` · `src/app/dashboard/admin/page.tsx` · `src/app/dashboard/home/page.tsx` · `src/app/dashboard/repos/[owner]/[repo]/page.tsx` · `src/app/shared/collections/[slug]/not-found.tsx` · `src/app/shared/collections/[slug]/page.tsx` · `src/app/sitemap.ts` · `src/lib/seo/fonts/OFL-1.1.txt` · `src/lib/seo/fonts/README.md`

The repository already held extensive uncommitted changes from earlier audits and user work. This list identifies the production readiness changes. It does not claim ownership of every diff Git showed at the time.

</details>

## Next actions

The authoritative residual list is [unresolved-audit-items.md](./unresolved-audit-items.md). Before a production rollout, the highest value actions are:

1. Generate and atomically rotate a random production `CRON_SECRET` of at least 32 characters in both the scheduler and the application.
2. Apply and verify the pending migrations, then exercise transactions, last admin concurrency, job leases and rate limits against a disposable PostgreSQL or Neon branch.
3. Confirm the deployment edge strips caller supplied forwarding headers and supplies one trusted client IP value.
4. Run the CI workflow on GitHub and make it a required branch check.
5. Establish production error reporting, structured logs, metrics, request and job identifiers, and safe health and readiness behavior.
6. Run the rendered browser, accessibility, authenticated state, reduced motion, zoom and responsive matrix.
7. Define privacy retention and deletion behavior, historical token cleanup, backup expiry and third party processor obligations.
8. Confirm provenance and usage rights for the public icon and social preview image.
