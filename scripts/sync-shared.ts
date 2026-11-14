// Copies shared/ into every mod that opts in, so each mod stays a self-contained folder.
//
// A mod can't import a file outside its own folder (Claude Code refuses it, symlinks
// included), so shared code is copied in. shared/ is the one place to edit it.
//
// A mod opts in by having a hooks/shared/ folder. Anything in hooks/shared/ that has no
// source in shared/ is removed.
//
//   node scripts/sync-shared.ts          write the copies
//   node scripts/sync-shared.ts --check  write nothing; exit 1 if any copy is missing or stale
//
// Runs on Node 23.6 or newer, which runs TypeScript directly.

import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'

const root = join(import.meta.dirname, '..')
const sharedDir = join(root, 'shared')
const modsDir = join(root, 'mods')
const isCheck = process.argv.includes('--check')

// Every file under a folder, as paths relative to it.
const filesUnder = (dir: string): string[] =>
  existsSync(dir)
    ? readdirSync(dir, { recursive: true, withFileTypes: true })
        .filter(entry => entry.isFile())
        .map(entry => relative(dir, join(entry.parentPath, entry.name)))
    : []

const readOrNull = (path: string) => (existsSync(path) ? readFileSync(path, 'utf8') : null)

const sources = filesUnder(sharedDir)
const problems: string[] = []

const optedIn = readdirSync(modsDir, { withFileTypes: true })
  .filter(entry => entry.isDirectory())
  .map(entry => join(modsDir, entry.name, 'hooks', 'shared'))
  .filter(dest => existsSync(dest))

for (const dest of optedIn) {
  const mod = relative(root, dest)

  for (const file of sources) {
    const want = readFileSync(join(sharedDir, file), 'utf8')
    const copy = join(dest, file)

    if (readOrNull(copy) === want) {
      continue
    }

    if (isCheck) {
      problems.push(`stale: ${mod}/${file}`)
    } else {
      mkdirSync(dirname(copy), { recursive: true })
      writeFileSync(copy, want)
      console.log(`wrote: ${mod}/${file}`)
    }
  }

  for (const file of filesUnder(dest)) {
    if (sources.includes(file)) {
      continue
    }

    if (isCheck) {
      problems.push(`orphaned: ${mod}/${file} (no shared/${file})`)
    } else {
      rmSync(join(dest, file))
      console.log(`removed: ${mod}/${file}`)
    }
  }
}

if (problems.length > 0) {
  console.error([...problems, 'Run `node scripts/sync-shared.ts` to update the copies.'].join('\n'))
  process.exit(1)
}
