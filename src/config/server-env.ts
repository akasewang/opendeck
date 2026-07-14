type ServerEnvName =
  | 'DATABASE_URL'
  | 'GH_INGEST_TOKEN'
  | 'GITHUB_TOKEN'
  | 'CRON_SECRET'
  | 'AUTH_SECRET'
  | 'AUTH_ADMIN_EMAILS'
  | 'AUTH_ALLOWED_EMAILS'
  | 'AUTH_ALLOWED_DOMAINS'
  | 'AUTH_INVITE_ONLY'
  | 'EMAIL_FROM'
  | 'RESEND_API_KEY'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const DOMAIN_PATTERN = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/

function readEnv(name: ServerEnvName) {
  const value = process.env[name]?.trim()
  return value || undefined
}

function requireEnv(name: ServerEnvName) {
  const value = readEnv(name)
  if (!value) {
    throw new Error(`${name} is not set`)
  }
  return value
}

function readCsv(name: ServerEnvName) {
  return (readEnv(name) ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function readEmails(name: ServerEnvName) {
  const emails = readCsv(name).map((email) => email.toLowerCase())
  const invalid = emails.find((email) => email.length > 254 || !EMAIL_PATTERN.test(email))
  if (invalid) throw new Error(`${name} contains an invalid email address`)
  return emails
}

function readDomains(name: ServerEnvName) {
  const domains = readCsv(name).map((domain) => domain.replace(/^@/, '').toLowerCase())
  const invalid = domains.find((domain) => !DOMAIN_PATTERN.test(domain) || domain.includes('..'))
  if (invalid) throw new Error(`${name} contains an invalid domain`)
  return domains
}

export const serverEnv = {
  get databaseUrl() {
    return requireEnv('DATABASE_URL')
  },
  get githubToken() {
    return readEnv('GH_INGEST_TOKEN') ?? readEnv('GITHUB_TOKEN')
  },
  get cronSecret() {
    const secret = readEnv('CRON_SECRET')
    if (secret && process.env.NODE_ENV === 'production' && secret.length < 32) {
      throw new Error('CRON_SECRET must be at least 32 characters in production')
    }
    return secret
  },
  get authSecret() {
    const secret = readEnv('AUTH_SECRET')
    if (secret) {
      if (process.env.NODE_ENV === 'production' && secret.length < 32) {
        throw new Error('AUTH_SECRET must be at least 32 characters in production')
      }
      return secret
    }
    if (process.env.NODE_ENV !== 'production') return 'opendeck-local-auth-secret'
    throw new Error('AUTH_SECRET is not set')
  },
  get authAdminEmails() {
    return readEmails('AUTH_ADMIN_EMAILS')
  },
  get authAllowedEmails() {
    return readEmails('AUTH_ALLOWED_EMAILS')
  },
  get authAllowedDomains() {
    return readDomains('AUTH_ALLOWED_DOMAINS')
  },
  get authInviteOnly() {
    const value = readEnv('AUTH_INVITE_ONLY')
    if (value === undefined || value === 'false') return false
    if (value === 'true') return true
    throw new Error('AUTH_INVITE_ONLY must be true or false')
  },
  get emailFrom() {
    return readEnv('EMAIL_FROM')
  },
  get resendApiKey() {
    return readEnv('RESEND_API_KEY')
  },
  get nodeEnv() {
    return process.env.NODE_ENV
  },
}
