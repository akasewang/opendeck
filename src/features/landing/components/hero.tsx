'use client'

import { motion } from 'framer-motion'
import ExploreButton from '@/components/brand/explore-button'
import PianoTitle from '@/components/brand/piano-title'
import SiteHeader from '@/components/layout/site-header'
import RepoScatter, { type ScatterItem } from '@/features/landing/components/repo-scatter'
import { useHomeClock } from '@/features/landing/hooks/use-home-clock'
import { useSoundPreference } from '@/hooks/use-sound-preference'

export default function Hero({ icons = [] }: { icons?: ScatterItem[] }) {
  const clock = useHomeClock()
  const { soundEnabled } = useSoundPreference()

  return (
    <main className="relative h-screen w-full overflow-hidden bg-background text-foreground">
      <SiteHeader />

      <section className="relative flex h-screen w-full flex-col px-4 pb-12 pt-[38px]">
        <div className="pointer-events-auto relative z-10 w-full">
          <PianoTitle
            text="opendeck"
            as="h1"
            sound={soundEnabled}
            className="font-display font-normal tracking-tight text-primary"
          />
        </div>

        <motion.div
          initial="hidden"
          animate="show"
          variants={{
            hidden: {},
            show: { transition: { staggerChildren: 0.12, delayChildren: 0.2 } },
          }}
          className="relative z-10 mt-4 flex max-w-[32ch] flex-col text-left"
        >
          <motion.p
            variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="text-pretty text-base text-primary"
          >
            <strong className="font-normal">Open source discovery engine.</strong> Fast, focused
            repository search from a local GitHub mirror.
          </motion.p>
          <motion.div
            variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="mt-1 flex gap-1 overflow-hidden text-xs text-muted-foreground"
          >
            <span>Local Time</span>
            <span>{clock}</span>
          </motion.div>
        </motion.div>

        <RepoScatter items={icons} />
      </section>

      <ExploreButton />
    </main>
  )
}
