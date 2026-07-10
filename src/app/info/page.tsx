import type { Metadata } from 'next'
import ExploreButton from '@/components/brand/explore-button'
import PianoTitle from '@/components/brand/piano-title'
import SiteHeader from '@/components/layout/site-header'
import { ExternalLink } from '@/components/ui/icons'
import { APP_CONFIG } from '@/config/app'
import { createPageMetadata } from '@/lib/seo/metadata'

export const metadata: Metadata = createPageMetadata({
  title: 'Info',
  description:
    'Learn how OpenDeck serves focused open source repository discovery from a local GitHub mirror.',
  path: '/info',
})

const lead =
  'OpenDeck is open source discovery without the noise, a public surface for developers who want useful repositories. Repository data is served from a local GitHub mirror, ranked by contribution readiness and browsable without login.'

const info = [
  'OpenDeck filters for repositories that look maintained, understandable, and realistic for contributors to enter. Activity, licensing, language, README context, issue count, starter friendly labels, and topic quality all shape the final fit score.',
  'The mirror keeps a refreshable corpus of repository metadata that the public app can query quickly. Dashboard, search, trending, discovery, and organizations read from Postgres instead of calling GitHub at page load.',
  'Accounts unlock row level repository and organization details while the dashboard, search, trending and discovery surfaces stay public.',
]

const links = [
  { label: 'X [Twitter]', href: `${APP_CONFIG.links.x}` },
  { label: 'Email', href: `mailto:${APP_CONFIG.links.email}` },
  { label: 'Github', href: `${APP_CONFIG.links.github}` },
]

export default function InfoPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <SiteHeader />

      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 right-0 z-0 w-[50vw] max-w-3xl translate-y-[22%]"
      >
        <PianoTitle
          text="info"
          as="div"
          sound={false}
          interactive={false}
          className="font-display font-normal tracking-tight text-transparent [-webkit-text-stroke:2px_var(--color-border)]"
        />
      </div>

      <div className="relative z-10 w-full px-4 pb-24 pt-16 sm:pt-20">
        <div className="flex flex-col items-start gap-16 lg:flex-row lg:gap-20">
          <div className="flex w-full flex-col gap-14 lg:max-w-6xl lg:gap-20">
            <p className="max-w-4xl text-pretty text-lg font-normal leading-tight tracking-tight text-primary sm:text-2xl lg:text-[2rem] lg:leading-[1.1]">
              {lead}
            </p>

            <section>
              <h2 className="mb-2.5 text-sm text-primary">Info</h2>
              <div className="flex max-w-xl flex-col gap-2.5 text-pretty text-sm leading-snug text-primary">
                {info.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </section>
          </div>

          <aside className="flex w-full shrink-0 flex-col gap-7 lg:w-[140px]">
            <section>
              <h2 className="mb-2.5 text-sm text-primary">Links</h2>
              <ul className="flex flex-col items-start gap-2">
                {links.map((link) => (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-transparent px-3 py-1 text-sm text-primary transition-colors hover:bg-border/50"
                    >
                      {link.label}
                      <ExternalLink size={14} className="opacity-60" />
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          </aside>
        </div>
      </div>

      <ExploreButton />
    </main>
  )
}
