'use client'

import { Icon } from '@iconify/react'
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { type ReactNode, Suspense, useEffect, useRef, useState } from 'react'
import PianoTitle from '@/components/brand/piano-title'
import { GradientAvatar } from '@/components/ui/gradient-avatar'
import { Lock, Menu, X } from '@/components/ui/icons'
import { ScrollShadow } from '@/components/ui/scroll-shadow'
import {
  MOTION_DELAY_SECONDS,
  MOTION_DURATION_SECONDS,
  MOTION_EASING,
  MOTION_SPRING,
} from '@/config/motion'
import { useAuth } from '@/features/auth/providers/auth-provider'
import { DASHBOARD_NAV_GROUPS } from '@/features/dashboard/data/dashboard-navigation'
import { cn } from '@/utils/cn'

type NavVariant = 'rail' | 'mobile'

const SIDENAV_RAIL_WIDTH = 56
const SIDENAV_RAIL_GUTTER_WIDTH = 104
const SIDENAV_RAIL_EXPANDED_WIDTH = 256
const SIDENAV_BRAND_FIRST_TILE_WIDTH = 26
const SIDENAV_BRAND_FULL_WIDTH = 194
const SIDENAV_BRAND_TRAILING_WIDTH = SIDENAV_BRAND_FULL_WIDTH - SIDENAV_BRAND_FIRST_TILE_WIDTH
const SIDENAV_BRAND_TRAILING_OVERLAP = 2
const SIDENAV_RAIL_CONTENT_INSET = 10
const SIDENAV_AUTH_CONTROL_INSET = 8
const SIDENAV_RAIL_SIDE_OFFSET = (SIDENAV_RAIL_GUTTER_WIDTH - SIDENAV_RAIL_WIDTH) / 2
const SIDENAV_BRAND_SIDE_OFFSET = (SIDENAV_RAIL_WIDTH - SIDENAV_BRAND_FIRST_TILE_WIDTH) / 2
const SIDENAV_RAIL_ICON_CELL_WIDTH = SIDENAV_RAIL_WIDTH - SIDENAV_RAIL_CONTENT_INSET * 2
const SIDENAV_RAIL_LABEL_WIDTH =
  SIDENAV_RAIL_EXPANDED_WIDTH - SIDENAV_RAIL_CONTENT_INSET * 2 - SIDENAV_RAIL_ICON_CELL_WIDTH
const SIDENAV_AUTH_ICON_CELL_WIDTH = SIDENAV_RAIL_WIDTH - SIDENAV_AUTH_CONTROL_INSET * 2
const SIDENAV_AUTH_LABEL_WIDTH =
  SIDENAV_RAIL_EXPANDED_WIDTH - SIDENAV_AUTH_CONTROL_INSET * 2 - SIDENAV_AUTH_ICON_CELL_WIDTH
const SIDENAV_RAIL_TRANSITION = MOTION_SPRING.rail

function RailLabel({
  show,
  children,
  className,
  width = SIDENAV_RAIL_LABEL_WIDTH,
}: {
  show: boolean
  children: ReactNode
  className?: string
  width?: number
}) {
  return (
    <motion.span
      initial={false}
      animate={{ opacity: show ? 1 : 0, width: show ? width : 0, x: show ? 0 : -6 }}
      transition={{
        width: SIDENAV_RAIL_TRANSITION,
        opacity: {
          duration: show ? MOTION_DURATION_SECONDS.standard : MOTION_DURATION_SECONDS.instant,
          delay: show ? MOTION_DELAY_SECONDS.labelReveal : 0,
          ease: MOTION_EASING.standard,
        },
        x: { duration: MOTION_DURATION_SECONDS.standard, ease: MOTION_EASING.standard },
      }}
      aria-hidden={!show}
      className={cn('flex min-w-0 flex-none overflow-hidden whitespace-nowrap', className)}
    >
      {children}
    </motion.span>
  )
}

function RailReveal({ children }: { children: ReactNode }) {
  return <span className="flex min-w-0 flex-1 items-center overflow-hidden">{children}</span>
}

function RailIconCell({
  children,
  width = SIDENAV_RAIL_ICON_CELL_WIDTH,
  className,
}: {
  children: ReactNode
  width?: number
  className?: string
}) {
  return (
    <span
      className={cn('flex h-9 shrink-0 items-center justify-center', className)}
      style={{ width }}
    >
      {children}
    </span>
  )
}

function SidebarNavigation({
  variant,
  expanded,
  pathname,
  activeTab,
  closeMobileMenu,
}: {
  variant: NavVariant
  expanded: boolean
  pathname: string
  activeTab: string | null
  closeMobileMenu: () => void
}) {
  const { user, openAuth } = useAuth()

  return (
    <nav
      className={cn('w-full', variant === 'mobile' ? 'px-4 py-4' : 'px-2.5 pt-4 pb-1')}
      aria-label="Sidebar"
    >
      <LayoutGroup id={`sidebar-nav-${variant}`}>
        <div className="flex flex-col gap-5">
          {DASHBOARD_NAV_GROUPS.map((group) => {
            const items = group.items.filter((item) =>
              'admin' in item && item.admin ? user?.role === 'admin' : true,
            )
            if (items.length === 0) return null

            return (
              <div key={group.title} className="space-y-1.5">
                <div className="h-4 px-3.5 text-2xs font-semibold uppercase tracking-normal leading-4 text-muted-foreground/60">
                  {variant === 'mobile' ? (
                    group.title
                  ) : (
                    <RailLabel show={expanded}>{group.title}</RailLabel>
                  )}
                </div>
                <div className="space-y-1">
                  {items.map((item) => {
                    const locked = Boolean('auth' in item && item.auth && !user)
                    const [linkPath, linkQuery] = item.link.split('?')
                    const itemTab = linkQuery ? new URLSearchParams(linkQuery).get('tab') : null
                    const isActive = pathname === linkPath && (itemTab ?? '') === (activeTab ?? '')
                    const ItemIcon = item.icon
                    const isCollapsedRail = variant === 'rail' && !expanded

                    return (
                      <div key={item.name} className="relative">
                        {isActive && (
                          <motion.div
                            layoutId={`nav-active-tile-${variant}`}
                            className="absolute inset-0 z-0 rounded-md border border-border/50 bg-background/70 shadow-[0_1px_3px_oklch(0%_0_0_/_0.25)]"
                            transition={SIDENAV_RAIL_TRANSITION}
                          />
                        )}
                        <Link
                          href={item.link}
                          aria-current={isActive ? 'page' : undefined}
                          aria-label={item.name}
                          onClick={(event) => {
                            if (locked) {
                              event.preventDefault()
                              openAuth({
                                message: `Sign in to open ${item.name === 'Home' ? 'My Deck' : item.name}.`,
                              })
                            }
                            closeMobileMenu()
                          }}
                          className={cn(
                            'relative z-10 flex h-9 items-center rounded-md text-sm font-medium transition-colors',
                            variant === 'mobile' ? 'gap-2.5 px-2.5' : 'w-full overflow-hidden px-0',
                            isActive
                              ? 'text-primary'
                              : 'text-muted-foreground hover:bg-muted-hover hover:text-primary',
                          )}
                        >
                          {variant === 'mobile' ? (
                            <>
                              <ItemIcon size={16} className="shrink-0" />
                              <span className="min-w-0 flex-1 truncate">{item.name}</span>
                              {locked && (
                                <Lock
                                  size={12}
                                  className="shrink-0 text-muted-foreground/50 mr-2.5"
                                />
                              )}
                            </>
                          ) : (
                            <RailReveal>
                              <RailIconCell>
                                <ItemIcon size={16} className="shrink-0" />
                              </RailIconCell>
                              <RailLabel
                                show={!isCollapsedRail}
                                className="flex min-w-0 items-center gap-2"
                              >
                                <span className="min-w-0 flex-1 truncate">{item.name}</span>
                                {locked && (
                                  <Lock
                                    size={12}
                                    className="shrink-0 text-muted-foreground/50 mr-2.5"
                                  />
                                )}
                              </RailLabel>
                            </RailReveal>
                          )}
                        </Link>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </LayoutGroup>
    </nav>
  )
}

function SidebarNavigationWithSearch(props: {
  variant: NavVariant
  expanded: boolean
  pathname: string
  closeMobileMenu: () => void
}) {
  const searchParams = useSearchParams()
  return <SidebarNavigation {...props} activeTab={searchParams.get('tab')} />
}

function NavigationSection(props: {
  variant: NavVariant
  expanded: boolean
  pathname: string
  closeMobileMenu: () => void
}) {
  return (
    <Suspense fallback={<SidebarNavigation {...props} activeTab={null} />}>
      <SidebarNavigationWithSearch {...props} />
    </Suspense>
  )
}

function AuthControl({
  variant,
  expanded,
  closeMobileMenu,
}: {
  variant: NavVariant
  expanded: boolean
  closeMobileMenu: () => void
}) {
  const { user, isLoading, openAuth, signOut } = useAuth()
  const isSignedIn = Boolean(user)
  const showLabels = variant === 'mobile' || expanded

  const handleClick = () => {
    if (isLoading) return
    if (!user) {
      openAuth()
      closeMobileMenu()
      return
    }

    void signOut()
    closeMobileMenu()
  }

  const avatar = isSignedIn ? (
    <GradientAvatar
      name={user?.name || user?.email || '?'}
      size={28}
      className="transition duration-200 group-hover:scale-[1.04]"
    />
  ) : (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground transition duration-200 group-hover:scale-[1.04] group-hover:text-foreground">
      <Icon icon="ri:user-fill" className="h-3.5 w-3.5" />
    </span>
  )

  const details = (
    <>
      <span className="min-w-0 flex-1 text-left">
        <span className="block truncate text-sm font-medium text-foreground transition-colors group-hover:text-primary">
          {isSignedIn ? user?.name : 'Sign in'}
        </span>
        <span className="block truncate text-xs text-muted-foreground transition-colors group-hover:text-secondary">
          {isSignedIn ? user?.email : 'Unlock row details'}
        </span>
      </span>
      {isSignedIn && (
        <Icon
          icon="ri:logout-box-r-line"
          className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground"
        />
      )}
    </>
  )

  return (
    <div
      className={cn(
        'shrink-0 border-t border-border/40',
        variant === 'mobile' ? 'px-4 pb-5 pt-3' : 'px-2 py-2.5',
      )}
    >
      <button
        type="button"
        onClick={handleClick}
        disabled={isLoading}
        aria-label={isSignedIn ? 'Sign out' : 'Sign in'}
        className={cn(
          'group flex w-full items-center rounded-md text-left transition duration-200 disabled:pointer-events-none disabled:opacity-60',
          variant === 'mobile' ? 'gap-2.5 px-2 py-2' : 'h-10 overflow-hidden p-0',
        )}
      >
        {variant === 'mobile' ? (
          <>
            {avatar}
            {details}
          </>
        ) : (
          <RailReveal>
            <RailIconCell width={SIDENAV_AUTH_ICON_CELL_WIDTH} className="h-10">
              {avatar}
            </RailIconCell>
            <RailLabel
              show={showLabels}
              width={SIDENAV_AUTH_LABEL_WIDTH}
              className="flex min-w-0 items-center gap-2.5 pr-2"
            >
              {details}
            </RailLabel>
          </RailReveal>
        )}
      </button>
    </div>
  )
}

function RailBrand({ expanded }: { expanded: boolean }) {
  return (
    <motion.div
      initial={false}
      animate={{ width: expanded ? SIDENAV_BRAND_FULL_WIDTH : SIDENAV_BRAND_FIRST_TILE_WIDTH }}
      transition={SIDENAV_RAIL_TRANSITION}
      className="relative h-12 shrink-0 overflow-hidden"
      aria-hidden="true"
    >
      <span
        className="absolute inset-y-0 left-0 flex items-center"
        style={{ width: SIDENAV_BRAND_FULL_WIDTH }}
      >
        <PianoTitle
          as="span"
          text="o"
          fitText="opendeck"
          interactive={false}
          sound={false}
          letterClassName="cursor-pointer"
          className="font-display font-normal leading-none tracking-normal whitespace-nowrap"
        />
      </span>
      <motion.span
        initial={false}
        animate={{
          width: expanded ? SIDENAV_BRAND_TRAILING_WIDTH + SIDENAV_BRAND_TRAILING_OVERLAP : 0,
        }}
        transition={SIDENAV_RAIL_TRANSITION}
        className="absolute inset-y-0 flex items-center overflow-hidden"
        style={{ left: SIDENAV_BRAND_FIRST_TILE_WIDTH - SIDENAV_BRAND_TRAILING_OVERLAP }}
      >
        <span className="block shrink-0" style={{ width: SIDENAV_BRAND_FULL_WIDTH }}>
          <PianoTitle
            as="span"
            text="pendeck"
            fitText="opendeck"
            interactive={false}
            sound={false}
            letterClassName="cursor-pointer"
            className="font-display font-normal leading-none tracking-normal whitespace-nowrap"
          />
        </span>
      </motion.span>
    </motion.div>
  )
}

export default function Sidenav() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [isRailExpanded, setIsRailExpanded] = useState(false)
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null)
  const closeMobileMenu = () => setIsOpen(false)

  useEffect(() => {
    if (!isOpen) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      setIsOpen(false)
      mobileMenuButtonRef.current?.focus()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen])

  return (
    <aside className="absolute z-30 w-full flex-shrink-0 md:relative md:w-[104px]">
      <div className="relative px-3 pt-3 md:hidden">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-background" />
        <div className="relative flex h-14 items-center justify-between rounded-lg border border-border/60 bg-sidebar/95 px-4 shadow-floating backdrop-blur">
          <div className="w-36">
            <Link href="/" onClick={closeMobileMenu} className="block w-full">
              <PianoTitle
                as="span"
                text="opendeck"
                interactive={false}
                sound={false}
                letterClassName="cursor-pointer"
                className="font-display font-normal tracking-normal whitespace-nowrap"
              />
            </Link>
          </div>
          <button
            ref={mobileMenuButtonRef}
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            aria-label={isOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isOpen}
            aria-controls="dashboard-mobile-navigation"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border/50 bg-card/40 text-muted-foreground transition-colors hover:border-border/70 hover:bg-card hover:text-foreground"
          >
            {isOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      <motion.div
        initial={false}
        animate={{ width: isRailExpanded ? SIDENAV_RAIL_EXPANDED_WIDTH : SIDENAV_RAIL_WIDTH }}
        transition={SIDENAV_RAIL_TRANSITION}
        onHoverStart={() => setIsRailExpanded(true)}
        onHoverEnd={() => setIsRailExpanded(false)}
        onFocusCapture={() => setIsRailExpanded(true)}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node)) {
            setIsRailExpanded(false)
          }
        }}
        className={cn(
          'absolute bottom-3 top-3 z-40 hidden flex-col overflow-hidden rounded-lg border border-border/60 bg-sidebar/95 shadow-floating backdrop-blur md:flex',
          isRailExpanded && 'shadow-floating-hover',
        )}
        style={{ left: SIDENAV_RAIL_SIDE_OFFSET }}
      >
        <Link
          href="/"
          aria-label="OpenDeck home"
          className="relative flex h-14 shrink-0 items-center overflow-hidden border-b border-border/40"
          style={{ paddingLeft: SIDENAV_BRAND_SIDE_OFFSET }}
        >
          <RailBrand expanded={isRailExpanded} />
        </Link>

        <ScrollShadow wrapperClassName="min-h-0 flex-1" className="hide-scrollbar pt-1">
          <NavigationSection
            variant="rail"
            expanded={isRailExpanded}
            pathname={pathname}
            closeMobileMenu={closeMobileMenu}
          />
        </ScrollShadow>

        <AuthControl variant="rail" expanded={isRailExpanded} closeMobileMenu={closeMobileMenu} />
      </motion.div>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.button
            key="mobile-scrim"
            type="button"
            aria-label="Close menu"
            tabIndex={-1}
            onClick={closeMobileMenu}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: MOTION_DURATION_SECONDS.quick }}
            className="fixed inset-x-0 bottom-0 top-[68px] z-20 cursor-default bg-black/50 backdrop-blur-sm md:hidden"
          />
        )}
      </AnimatePresence>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="mobile-sidebar"
            id="dashboard-mobile-navigation"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{
              duration: MOTION_DURATION_SECONDS.navigation,
              ease: MOTION_EASING.enter,
            }}
            className="relative z-30 mx-3 mt-2 overflow-hidden rounded-lg border border-border/60 bg-sidebar/95 shadow-floating backdrop-blur md:hidden"
          >
            <ScrollShadow className="hide-scrollbar max-h-[calc(100dvh-5.5rem)]">
              <NavigationSection
                variant="mobile"
                expanded
                pathname={pathname}
                closeMobileMenu={closeMobileMenu}
              />
              <AuthControl variant="mobile" expanded closeMobileMenu={closeMobileMenu} />
            </ScrollShadow>
          </motion.div>
        )}
      </AnimatePresence>
    </aside>
  )
}
