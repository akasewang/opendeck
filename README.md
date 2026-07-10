# OpenDeck

OpenDeck is a public discovery engine for useful open source repositories. It serves curated, searchable GitHub project data from a local Postgres mirror so public pages can stay fast without calling GitHub during normal browsing.

## Stack

- Next.js 15 App Router
- React 19
- Strict TypeScript
- Tailwind CSS v4
- Drizzle ORM with Neon Postgres
- npm

## Local Setup

```sh
npm install
cp .env.example .env
npm run db:migrate
npm run dev
```

Open `http://localhost:3000`.

## Environment

```env
DATABASE_URL=
NEXT_PUBLIC_APP_URL=https://opendeck.akasewang.me
GITHUB_TOKEN=
GH_INGEST_TOKEN=
CRON_SECRET=
AUTH_SECRET=
AUTH_ADMIN_EMAILS=
AUTH_ALLOWED_EMAILS=
AUTH_ALLOWED_DOMAINS=
AUTH_INVITE_ONLY=false
EMAIL_FROM=
RESEND_API_KEY=
```

`DATABASE_URL` is required for the app and operational commands. `NEXT_PUBLIC_APP_URL` is public and is used for canonical URLs, sitemap entries and share previews. `GITHUB_TOKEN` is server only and is used for GitHub API reads. `GH_INGEST_TOKEN` is an optional ingestion-specific override and falls back to `GITHUB_TOKEN`. `CRON_SECRET` protects hosted ingestion triggers in production. `AUTH_SECRET` signs auth session cookies and must be at least 32 characters in production.

`AUTH_ADMIN_EMAILS`, `AUTH_ALLOWED_EMAILS` and `AUTH_ALLOWED_DOMAINS` are comma separated. Only emails listed in `AUTH_ADMIN_EMAILS` or users created through an admin invite become admins. Set `AUTH_INVITE_ONLY=true` to require invite links for signup. If allowed emails/domains or database allowlist rules exist, signup must match them unless the user has a valid invite.

If an older local database already promoted the first registered user, run `npm run auth:sync-admins` to preview persisted role changes, then `npm run auth:sync-admins -- --apply` to align `auth_users.role` with `AUTH_ADMIN_EMAILS`.

Authentication uses email magic links. `EMAIL_FROM` and `RESEND_API_KEY` are required in production for sign-in links, email verification, account digests and alerts.

## Commands

```sh
npm run dev
npm run build
npm run start
npm run lint
npm run format
npm run db:migrate
npm run ingest:trending
npm run ingest:discovery
npm run ingest:metadata
```

## Architecture

OpenDeck indexes selected public repositories into Postgres, scores them for contribution readiness and serves public dashboard pages from a local mirror. Dashboard lists remain public, while row expansion requires an account session.

### Source Map

- `src/app`: pages, layouts, metadata routes and route handlers
- `src/components`: shared brand, layout, UI, effects and transition components
- `src/config`: app-wide runtime-safe configuration
- `src/db`: Drizzle schema and database client
- `src/features`: domain feature modules for dashboard, landing and repositories
- `src/hooks`: app-wide reusable client hooks
- `src/lib`: server infrastructure and shared domain logic
- `src/utils`: generic pure helpers
- `src/operations`: typed operational command entrypoints for migrations, ingestion, admin sync and generated data
- `drizzle`: migrations and snapshots

### Runtime Flow

```text
GitHub API -> ingestion jobs -> normalization -> contribution gate -> Postgres mirror -> API routes -> public UI
```

Discovery and trending jobs query focused GitHub search lanes from `src/lib/ingest/sources.ts`. Repository data is normalized in `src/lib/ingest/repositories.ts`, scored with `src/lib/repositories/contribution.ts` and stored with Drizzle.

The repository corpus is bounded by `DEFAULT_REPOSITORY_CORPUS_TARGET`. When the cap is reached, ingestion updates known repositories and skips unknown candidates.

A contribution-ready repository must be public, active, licensed, have a primary language, have open issues and include description or README context. Resource lists, roadmaps, interview-prep collections, forks, mirrors, templates and archived repositories are blocked.

### Routes

- `/`: landing page with animated repository scatter
- `/auth`: sign in and account creation
- `/info`: product explanation and project links
- `/dashboard`: curated repository overview
- `/dashboard/compare`: side-by-side repository comparison
- `/dashboard/trending`: recently active contribution-ready repositories
- `/dashboard/discover`: filterable repository search
- `/dashboard/organizations`: organization summaries and mirrored repository details
- `/dashboard/repos/[owner]/[repo]`: repository detail workspace
- `/dashboard/home`: logged-in workspace for saved repos, collections, follows, pipeline, preferences, exports and security
- `/dashboard/admin`: admin-only user, invite and allowlist management
- `/shared/collections/[slug]`: public shared collection page

### API Routes

- `/api/curated`
- `/api/github-trending`
- `/api/github-discover`
- `/api/github-overview`
- `/api/organizations`
- `/api/organizations/profile`
- `/api/search`
- `/api/repos/compare`
- `/api/repos/contributors`
- `/api/repos/detail`
- `/api/repos/document`
- `/api/auth/email-verification`
- `/api/auth/magic-link`
- `/api/auth/magic-link/callback`
- `/api/auth/session`
- `/api/auth/sign-out`
- `/api/account/*`
- `/api/admin/*`
- `/api/github-stars`
- `/api/shared/collections/[slug]`
- `/api/cron/ingest`
- `/api/cron/account-alerts`

Route handlers validate enum-like query values and keep public response shapes stable.

Repository and organization list APIs remain public. Detail-style APIs used by row expansion, including `/api/github-overview`, `/api/organizations/profile` and `/api/repos/contributors`, require a valid account session.

### Server and Client Boundaries

Server-only code lives in `src/db`, server modules under `src/lib`, route handlers and `src/operations`. These modules can read secrets, issue auth tokens, sign sessions, call GitHub with authorization headers and access the database.

Client-safe code includes UI components, browser hooks, public constants and pure formatting helpers. Client code must not import `serverEnv`, `db`, ingestion modules or GitHub token helpers. The public UI fetches local API routes instead.

Feature modules own their components, hooks, constants, types and feature-specific data. Shared primitives stay in `src/components/ui`, while cross-feature helpers belong in `src/utils`.

### UI, Motion and SEO

Global semantic tokens live in `src/app/globals.css`. Component-specific styling stays in component class names unless it is genuinely shared.

Motion-heavy UI respects `prefers-reduced-motion`. Page curtain transitions are skipped between dashboard routes and for reduced-motion users. The repository scatter falls back to a static layout for reduced-motion users.

App Router metadata defines titles, descriptions, canonical URLs, Open Graph metadata and Twitter Card metadata. `src/app/sitemap.ts`, `src/app/robots.ts`, `src/app/opengraph-image.tsx` and `src/app/twitter-image.tsx` are generated from public site configuration only.

## Security

Server secrets are read through `src/lib/server-env.ts`. `DATABASE_URL`, `GITHUB_TOKEN`, `GH_INGEST_TOKEN`, `CRON_SECRET` and `AUTH_SECRET` are server only. `NEXT_PUBLIC_APP_URL` is public and must not contain secrets.

Client components never import the database client, GitHub token rotation or ingestion modules.

Authentication uses email magic links. Session cookies are HTTP-only, same-site and backed by hashed session tokens in Postgres.

Logged-in users can save repositories, create collections, follow repositories or organizations, store private notes, track contribution stage, hide or dismiss results, review recent history, tune recommendation preferences, request good-first-issue alerts, configure digests, export saved repositories and manage sessions. `/api/cron/account-alerts` can be scheduled after metadata ingestion to generate unread alerts for saved repositories with good-first-issue signals. Admin users can assign roles, suspend accounts, create invites and manage email/domain allowlist rules.

Route handlers validate enum-like values such as repository sort, curated source and ingest kind. Repository full names are validated before GitHub contributor lookups. API errors return stable public shapes and avoid exposing stack traces.

`next.config.ts` sets conservative security headers that do not require a fragile Content Security Policy. The production build also sends HSTS. A full CSP should be added only after testing every external asset, font, image and API source in the deployed environment.

Abuse prone public endpoints can still benefit from persistent rate limiting at the hosting edge or a shared store. In memory rate limits are not reliable across serverless instances, so that work should be designed with the deployment target.

## Testing and Verification

The current repo uses linting, formatting, type checking and production build verification. There is no unit test runner configured.

```sh
npm run lint
npx biome check .
npx tsc --noEmit --incremental false
npm run build
npm audit --omit=dev
```

## Deployment Notes

Set `DATABASE_URL`, `NEXT_PUBLIC_APP_URL`, `GITHUB_TOKEN`, `GH_INGEST_TOKEN`, `CRON_SECRET`, `AUTH_SECRET`, `EMAIL_FROM` and `RESEND_API_KEY` in the hosting environment. Run migrations before relying on ingestion jobs, magic-link sign-in, account alerts, digests or email verification. The included GitHub Actions workflows use `DATABASE_URL` and `GH_INGEST_TOKEN` secrets.

## Attribution

OpenDeck is maintained as a public open source discovery project. Original project attribution remains with Akash Dewangan.
