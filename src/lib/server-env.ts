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

export const serverEnv = {
  get databaseUrl() {
    return requireEnv('DATABASE_URL')
  },
  get githubToken() {
    return readEnv('GH_INGEST_TOKEN') ?? readEnv('GITHUB_TOKEN')
  },
  get cronSecret() {
    return readEnv('CRON_SECRET')
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
    return readCsv('AUTH_ADMIN_EMAILS').map((email) => email.toLowerCase())
  },
  get authAllowedEmails() {
    return readCsv('AUTH_ALLOWED_EMAILS').map((email) => email.toLowerCase())
  },
  get authAllowedDomains() {
    return readCsv('AUTH_ALLOWED_DOMAINS').map((domain) => domain.replace(/^@/, '').toLowerCase())
  },
  get authInviteOnly() {
    return readEnv('AUTH_INVITE_ONLY') === 'true'
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
