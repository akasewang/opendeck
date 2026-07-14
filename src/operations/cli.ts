const USAGE = `Usage:
  tsx src/operations/cli.ts ingest <trending|discovery|curated|metadata> [limit]
  tsx src/operations/cli.ts db migrate
  tsx src/operations/cli.ts auth sync-admins [--apply] [--allow-empty]
  tsx src/operations/cli.ts data gen-language-colors`

async function main() {
  const [area, command, ...args] = process.argv.slice(2)

  if (area === 'ingest') {
    const { runIngestCommand } = await import('@/operations/commands/ingest-repositories')
    await runIngestCommand(command ? [command, ...args] : args)
    return
  }

  if (area === 'db' && command === 'migrate') {
    const { runMigrateCommand } = await import('@/operations/commands/migrate-database')
    await runMigrateCommand()
    return
  }

  if (area === 'auth' && command === 'sync-admins') {
    const { runSyncAdminRolesCommand } = await import('@/operations/commands/sync-admin-roles')
    await runSyncAdminRolesCommand(args)
    return
  }

  if (area === 'data' && command === 'gen-language-colors') {
    const { runGenerateLanguageColorsCommand } = await import(
      '@/operations/commands/generate-language-colors'
    )
    await runGenerateLanguageColorsCommand()
    return
  }

  throw new Error(USAGE)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
