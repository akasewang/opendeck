import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import * as languages from 'linguist-languages'

type LanguageEntry = { name: string; color?: string; aliases?: string[] }

export async function runGenerateLanguageColorsCommand() {
  const entries = Object.values(languages) as LanguageEntry[]
  const colors: Record<string, string> = {}

  for (const lang of entries) {
    if (lang?.color) colors[lang.name.toLowerCase()] = lang.color
  }
  for (const lang of entries) {
    if (!lang?.color) continue
    for (const alias of lang.aliases ?? []) {
      const key = alias.toLowerCase()
      if (!(key in colors)) colors[key] = lang.color
    }
  }

  const sorted = Object.fromEntries(Object.entries(colors).sort(([a], [b]) => a.localeCompare(b)))
  const outPath = resolve(process.cwd(), 'src/features/repositories/data/language-colors.json')
  mkdirSync(dirname(outPath), { recursive: true })
  writeFileSync(outPath, `${JSON.stringify(sorted, null, 2)}\n`)

  console.log(`Wrote ${Object.keys(sorted).length} language colors to ${outPath}`)
}
