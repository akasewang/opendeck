import { DAY_MS } from '@/utils/time'

type DiscoverySource = {
  id: string
  label: string
  query: string
  tags: string[]
}

function isoDateDaysAgo(days: number, now = new Date()) {
  return new Date(now.getTime() - days * DAY_MS).toISOString().split('T')[0]
}

export function getDiscoverySources(now = new Date()): DiscoverySource[] {
  const activeAfter = isoDateDaysAgo(365, now)
  const freshAfter = isoDateDaysAgo(180, now)
  const veryFreshAfter = isoDateDaysAgo(90, now)
  const recentAfter = isoDateDaysAgo(60, now)
  const publicContributorRepo = `is:public archived:false fork:false mirror:false template:false`
  const maintainedContributorRepo = `${publicContributorRepo} pushed:>${activeAfter}`
  const freshContributorRepo = `${publicContributorRepo} pushed:>${freshAfter}`
  const veryFreshContributorRepo = `${publicContributorRepo} pushed:>${veryFreshAfter}`

  const ecosystemLane = (language: string) => ({
    id: language.toLowerCase(),
    label: `${language} ecosystem`,
    query: `language:${language} good-first-issues:>0 stars:50..25000 ${freshContributorRepo} sort:updated-desc`,
    tags: [language.toLowerCase(), 'starter-friendly', 'contributor-ready'],
  })

  const topicLane = (topic: string, label: string, extraTags: string[] = []) => ({
    id: topic,
    label,
    query: `topic:${topic} stars:50..25000 issues:>3 ${freshContributorRepo} sort:updated-desc`,
    tags: [topic, ...extraTags, 'contributor-ready'],
  })

  return [
    {
      id: 'good-first-and-help-wanted',
      label: 'Repos actively inviting contributors',
      query: `good-first-issues:>0 help-wanted-issues:>0 stars:20..25000 ${freshContributorRepo} sort:updated-desc`,
      tags: ['starter-friendly', 'good-first-issue', 'help-wanted'],
    },
    {
      id: 'good-first-issues',
      label: 'Repos with good first issues',
      query: `good-first-issues:>0 stars:10..50000 ${maintainedContributorRepo} sort:updated-desc`,
      tags: ['starter-friendly', 'good-first-issue'],
    },
    {
      id: 'help-wanted',
      label: 'Repos asking for help',
      query: `help-wanted-issues:>0 stars:10..50000 ${maintainedContributorRepo} sort:updated-desc`,
      tags: ['starter-friendly', 'help-wanted'],
    },
    {
      id: 'up-for-grabs',
      label: 'Up-for-grabs projects',
      query: `topic:up-for-grabs stars:10..50000 issues:>0 ${maintainedContributorRepo} sort:updated-desc`,
      tags: ['starter-friendly', 'up-for-grabs'],
    },
    {
      id: 'beginner-friendly',
      label: 'Beginner-friendly projects',
      query: `topic:beginner-friendly stars:10..50000 issues:>0 ${maintainedContributorRepo} sort:updated-desc`,
      tags: ['starter-friendly', 'beginner-friendly'],
    },
    {
      id: 'actively-maintained',
      label: 'Actively maintained contributor-ready repositories',
      query: `stars:50..20000 issues:5..1500 ${veryFreshContributorRepo} sort:updated-desc`,
      tags: ['maintained', 'contributor-ready'],
    },
    {
      id: 'recent-new',
      label: 'Recently created projects with open issues',
      query: `created:>${recentAfter} stars:10..5000 issues:>0 ${publicContributorRepo} sort:stars-desc`,
      tags: ['new', 'contributor-ready'],
    },
    {
      id: 'fast-moving',
      label: 'Fast-moving repositories updated recently',
      query: `stars:25..20000 issues:3..1500 ${veryFreshContributorRepo} sort:updated-desc`,
      tags: ['active', 'contributor-ready'],
    },
    topicLane('developer-tools', 'Developer tools', ['developer-tools']),
    topicLane('cli', 'CLI tools', ['cli', 'developer-tools']),
    topicLane('database', 'Databases and storage', ['database']),
    topicLane('observability', 'Observability', ['observability']),
    topicLane('security', 'Security tooling', ['security']),
    ecosystemLane('TypeScript'),
    ecosystemLane('Python'),
    ecosystemLane('Rust'),
    ecosystemLane('Go'),
    ecosystemLane('JavaScript'),
    ecosystemLane('Java'),
  ]
}
