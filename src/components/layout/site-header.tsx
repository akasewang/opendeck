'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Github, Volume2, VolumeX } from '@/components/ui/icons'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { APP_CONFIG } from '@/config/app'
import { useGithubStars } from '@/hooks/use-github-stars'
import { useSoundPreference } from '@/hooks/use-sound-preference'
import { cn } from '@/utils/cn'

const NAV_ITEMS = [
  { id: 'home', label: 'Home', href: '/' },
  { id: 'info', label: 'Info', href: '/info' },
]

const CONTROL_CLASS = 'inline-flex h-6 items-center justify-center text-primary'

export default function SiteHeader() {
  const pathname = usePathname()
  const { soundEnabled, toggleSound } = useSoundPreference()
  const { shortCount, fullCount } = useGithubStars()

  return (
    <nav
      aria-label="Site navigation"
      data-page-transition-navbar
      className="fixed left-4 right-4 top-2.5 z-50 flex items-start justify-between gap-4 text-base text-primary"
    >
      <ul className="flex items-start gap-2">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href

          return (
            <li key={item.id} className="flex items-baseline">
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className="flex text-primary"
              >
                {item.label}
              </Link>
            </li>
          )
        })}
      </ul>

      <div className="flex items-center gap-3 pr-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <a
              href={APP_CONFIG.links.github}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={fullCount ? `${fullCount} GitHub stars` : 'GitHub repository'}
              className={cn(CONTROL_CLASS, shortCount && 'gap-0.5')}
            >
              <Github size={18} />
              {shortCount && <span className="text-xs font-mono tracking-tight">{shortCount}</span>}
            </a>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {fullCount ? `${fullCount} GitHub stars` : 'GitHub repository'}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              aria-label={soundEnabled ? 'Disable sounds' : 'Enable sounds'}
              aria-pressed={soundEnabled}
              onClick={toggleSound}
              className={CONTROL_CLASS}
            >
              <Volume2 size={18} className={soundEnabled ? 'block' : 'hidden'} />
              <VolumeX size={18} className={soundEnabled ? 'hidden' : 'block'} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {soundEnabled ? 'Disable sounds' : 'Enable sounds'}
          </TooltipContent>
        </Tooltip>
      </div>
    </nav>
  )
}
