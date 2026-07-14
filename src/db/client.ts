import { neon } from '@neondatabase/serverless'
import { drizzle, type NeonHttpDatabase } from 'drizzle-orm/neon-http'
import { serverEnv } from '@/config/server-env'
import * as schema from './schema'

type Database = NeonHttpDatabase<typeof schema>

let database: Database | undefined

function getDb() {
  if (!database) {
    const sql = neon(serverEnv.databaseUrl)
    database = drizzle(sql, { schema })
  }

  return database
}

export const db = new Proxy({} as Database, {
  get(_target, property) {
    const database = getDb()
    const value = Reflect.get(database, property, database)

    return typeof value === 'function' ? value.bind(database) : value
  },
})
