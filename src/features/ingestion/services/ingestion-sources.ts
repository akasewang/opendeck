type DiscoverySource = {
  id: string
  label: string
  query: string
  tags: string[]
}

function isoDateDaysAgo(days: number, now = new Date()) {
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
}

export function getDiscoverySources(now = new Date()): DiscoverySource[] {
  const activeAfter = isoDateDaysAgo(365, now)
  const veryActiveAfter = isoDateDaysAgo(180, now)
  const recentAfter = isoDateDaysAgo(60, now)
  const publicContributorRepo = `is:public archived:false fork:false mirror:false template:false`
  const maintainedContributorRepo = `${publicContributorRepo} pushed:>${activeAfter}`
  const veryActiveContributorRepo = `${publicContributorRepo} pushed:>${veryActiveAfter}`

  return [
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
      query: `stars:50..50000 issues:>5 ${maintainedContributorRepo} sort:updated-desc`,
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
      query: `stars:25..30000 issues:>3 ${veryActiveContributorRepo} sort:updated-desc`,
      tags: ['active', 'contributor-ready'],
    },
    {
      id: 'developer-tools',
      label: 'Developer tools',
      query: `topic:developer-tools stars:25..50000 issues:>3 ${maintainedContributorRepo} sort:updated-desc`,
      tags: ['developer-tools', 'contributor-ready'],
    },
    {
      id: 'cli-tools',
      label: 'CLI tools',
      query: `topic:cli stars:25..50000 issues:>3 ${maintainedContributorRepo} sort:updated-desc`,
      tags: ['cli', 'developer-tools', 'contributor-ready'],
    },
    {
      id: 'databases',
      label: 'Databases and storage',
      query: `topic:database stars:25..50000 issues:>3 ${maintainedContributorRepo} sort:updated-desc`,
      tags: ['database', 'contributor-ready'],
    },
    {
      id: 'observability',
      label: 'Observability',
      query: `topic:observability stars:25..50000 issues:>3 ${maintainedContributorRepo} sort:updated-desc`,
      tags: ['observability', 'contributor-ready'],
    },
    {
      id: 'security',
      label: 'Security tooling',
      query: `topic:security stars:25..50000 issues:>3 ${maintainedContributorRepo} sort:updated-desc`,
      tags: ['security', 'contributor-ready'],
    },
    {
      id: 'typescript',
      label: 'TypeScript ecosystem',
      query: `language:TypeScript stars:25..50000 issues:>3 ${maintainedContributorRepo} sort:updated-desc`,
      tags: ['typescript', 'contributor-ready'],
    },
    {
      id: 'rust',
      label: 'Rust ecosystem',
      query: `language:Rust stars:25..50000 issues:>3 ${maintainedContributorRepo} sort:updated-desc`,
      tags: ['rust', 'contributor-ready'],
    },
  ]
}
