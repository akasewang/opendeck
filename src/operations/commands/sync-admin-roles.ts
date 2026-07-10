import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { authUsers } from '@/db/schema'
import { serverEnv } from '@/lib/server-env'

export async function runSyncAdminRolesCommand(args: string[]) {
  const apply = args.includes('--apply')
  const allowEmpty = args.includes('--allow-empty')
  const adminEmails = new Set(serverEnv.authAdminEmails.map((email) => email.toLowerCase()))

  const users = await db
    .select({
      id: authUsers.id,
      email: authUsers.email,
      role: authUsers.role,
      status: authUsers.status,
    })
    .from(authUsers)

  const changes = users
    .map((user) => {
      const email = user.email.toLowerCase()
      const shouldBeAdmin = adminEmails.has(email)
      const nextRole = shouldBeAdmin ? 'admin' : 'user'
      return user.role === nextRole ? null : { ...user, email, nextRole }
    })
    .filter((change): change is NonNullable<typeof change> => Boolean(change))

  const retainedAdmins = users.filter(
    (user) => user.role === 'admin' && adminEmails.has(user.email.toLowerCase()),
  )
  const finalActiveAdmins = users.filter(
    (user) => user.status === 'active' && adminEmails.has(user.email.toLowerCase()),
  )
  const promotions = changes.filter((change) => change.nextRole === 'admin')
  const demotions = changes.filter((change) => change.nextRole === 'user')

  console.log(
    JSON.stringify(
      {
        mode: apply ? 'apply' : 'dry-run',
        configuredAdminEmails: adminEmails.size,
        retainedAdmins: retainedAdmins.map((user) => user.email),
        finalActiveAdmins: finalActiveAdmins.map((user) => user.email),
        promotions: promotions.map((change) => change.email),
        demotions: demotions.map((change) => change.email),
      },
      null,
      2,
    ),
  )

  if (!apply) {
    console.log('Dry run only. Re-run with --apply to update auth_users.role.')
    return
  }

  if (finalActiveAdmins.length === 0 && !allowEmpty) {
    throw new Error(
      'No active users match AUTH_ADMIN_EMAILS. Refusing to apply without --allow-empty.',
    )
  }

  for (const change of changes) {
    await db
      .update(authUsers)
      .set({ role: change.nextRole, updatedAt: new Date() })
      .where(eq(authUsers.id, change.id))
  }

  console.log(`Applied ${changes.length} admin role change${changes.length === 1 ? '' : 's'}.`)
}
