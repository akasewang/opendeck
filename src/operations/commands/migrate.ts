import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { migrate } from 'drizzle-orm/neon-http/migrator'
import { serverEnv } from '@/lib/server-env'

export async function runMigrateCommand() {
  const sql = neon(serverEnv.databaseUrl)
  const db = drizzle(sql)

  console.log('Applying migrations...')
  await migrate(db, { migrationsFolder: './drizzle' })
  console.log('Migrations applied.')
}
