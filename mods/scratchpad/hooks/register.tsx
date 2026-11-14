import { atom, read, update } from 'claude-code'
import type { EngineInterface, FsEntry, Register, RenderSurface } from 'claude-code'

import type { Entry } from '../types'

const PANE = 'scratchpad'
const REFRESH_MS = 2000
const MAX_ENTRIES = 2000
const WIDTH_SHARE = 0.2
const INDENT = '  '
const FOLDER_CLOSED = '📁'
const FOLDER_OPEN = '📂'
const TMP_DIRS = ['/private/tmp', '/tmp']

const root = atom({ plugin: 'scratchpad', key: 'root' } as const, null as string | null)
const entries = atom({ plugin: 'scratchpad', key: 'entries' } as const, [] as Entry[])
const collapsed = atom({ plugin: 'scratchpad', key: 'collapsed' } as const, [] as string[])
const isOpen = atom({ plugin: 'scratchpad', key: 'isOpen' } as const, false)

const toProjectSlug = (dir: string) => dir.replace(/[^a-zA-Z0-9]/g, '-')

// A mod can't be told the scratchpad path: $ doesn't expose it, and Claude Code's guard
// (cc-plugin-sec-default) bypasses a mod's classic hooks, the only events carrying scratchpad_dir.
// So this rebuilds the harness's layout:
// <tmp>/claude-<uid>/<project path, non-alphanumerics as dashes>/<session id>/scratchpad
const findScratchpad = async ($: EngineInterface): Promise<string | null> => {
  const [id, projectRoot, cwd] = await Promise.all([$.session.id(), $.session.root(), $.session.cwd()])
  const slugs = [...new Set([projectRoot, cwd])].map(toProjectSlug)

  for (const tmp of TMP_DIRS) {
    const tmpEntries = await $.fs.list(tmp).catch(() => [])
    const userDirs = tmpEntries.filter(child => child.name.startsWith('claude-'))

    for (const userDir of userDirs) {
      for (const slug of slugs) {
        const path = `${tmp}/${userDir.name}/${slug}/${id}/scratchpad`
        if (await $.fs.exists(path)) return path
      }
    }
  }

  return null
}

const locateRoot = async ($: EngineInterface) => {
  const known = await read($, root)
  if (known !== null) return known

  const found = await findScratchpad($)
  if (found !== null) await update($, root, () => found)
  return found
}

const foldersFirstThenByName = (a: FsEntry, b: FsEntry) =>
  Number(b.kind === 'dir') - Number(a.kind === 'dir') || a.name.localeCompare(b.name)

const walk = async ($: EngineInterface, dir: string, depth: number, out: Entry[]) => {
  const children = await $.fs.list(dir).catch(() => [])

  for (const child of [...children].sort(foldersFirstThenByName)) {
    if (out.length >= MAX_ENTRIES) return
    const path = `${dir}/${child.name}`
    out.push({ path, name: child.name, kind: child.kind, depth })
    if (child.kind === 'dir') await walk($, path, depth + 1, out)
  }
}

const refresh = async ($: EngineInterface) => {
  const dir = await locateRoot($)
  if (dir === null) return

  const next: Entry[] = []
  await walk($, dir, 0, next)
  const hasChanged = JSON.stringify(next) !== JSON.stringify(await read($, entries))
  if (hasChanged) await update($, entries, () => next)
}

const isPaneUp = async ($: EngineInterface) => (await $.ui.panes()).some(pane => pane.id === PANE)

const sidebarWidth = (terminalColumns: number | undefined) =>
  terminalColumns === undefined ? {} : { columns: Math.max(1, Math.round(terminalColumns * WIDTH_SHARE)) }

const openSidebar = async ($: EngineInterface, terminalColumns: number | undefined) => {
  await refresh($)
  await $.ui.open({ id: PANE, title: 'Scratchpad', ...sidebarWidth(terminalColumns) })
  await update($, isOpen, () => true)
}

// Closing our own pane doesn't run our ui.close hook, so isOpen is cleared here as well.
const closeSidebar = async ($: EngineInterface) => {
  await $.ui.close({ id: PANE })
  await update($, isOpen, () => false)
}

const toggleSidebar = async ($: EngineInterface, terminalColumns: number | undefined) =>
  (await isPaneUp($)) ? closeSidebar($) : openSidebar($, terminalColumns)

const toggleCollapsed = ($: EngineInterface, path: string) =>
  update($, collapsed, paths =>
    paths.includes(path) ? paths.filter(one => one !== path) : [...paths, path],
  )

const copyPath = async ($: EngineInterface, entry: Entry, surface: RenderSurface) => {
  const copied = await $.ui.copy({ text: entry.path, surface })
  $.ui.toast(copied.isCopied ? `Copied path of ${entry.name}` : `Couldn't copy: ${copied.reason}`)
}

const isInsideCollapsed = (entry: Entry, collapsedDirs: string[]) =>
  collapsedDirs.some(dir => entry.path.startsWith(`${dir}/`))

const folderMark = (entry: Entry, collapsedDirs: string[]) => {
  if (entry.kind !== 'dir') return INDENT
  return collapsedDirs.includes(entry.path) ? '▸ ' : '▾ '
}

const entryLabel = (entry: Entry, collapsedDirs: string[]) => {
  const suffix = entry.kind === 'dir' ? '/' : ''
  return `${INDENT.repeat(entry.depth)}${folderMark(entry, collapsedDirs)}${entry.name}${suffix}`
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    $.clock.every(REFRESH_MS, () => {
      void isPaneUp($).then(isUp => (isUp ? refresh($) : undefined))
    })

    return next(e)
  })

  on('ui.close', async ($, e, next) => {
    const closed = await next(e)
    if (e.id === PANE) await update($, isOpen, () => false)

    return closed
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) return next(e)

    const { Box, Button, Text } = $.ui.resolve(e)
    const open = await read($, isOpen)
    const label = open ? 'Hide scratchpad' : 'Scratchpad'

    return (
      <Box>
        <Button key="toggle" label={label} onPress={() => toggleSidebar($, e.viewport?.columns)}>
          <Text>
            {open ? FOLDER_OPEN : FOLDER_CLOSED} {label}
          </Text>
        </Button>
      </Box>
    )
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Button, Text } = $.ui.resolve(e)
    const dir = await read($, root)
    const collapsedDirs = await read($, collapsed)

    if (dir === null) {
      return (
        <Box flexDirection="column">
          <Text dimColor>Couldn't find this session's scratchpad.</Text>
        </Box>
      )
    }

    const visible = (await read($, entries)).filter(entry => !isInsideCollapsed(entry, collapsedDirs))

    return (
      <Box flexDirection="column">
        {visible.length === 0 && <Text dimColor>Empty.</Text>}
        {visible.map(entry => {
          const isDir = entry.kind === 'dir'

          return (
            <Button
              key={entry.path}
              plain
              onPress={press => (isDir ? toggleCollapsed($, entry.path) : copyPath($, entry, press.surface))}
            >
              <Text bold={isDir} dimColor={entry.name.startsWith('.')} wrap="truncate-end">
                {entryLabel(entry, collapsedDirs)}
              </Text>
            </Button>
          )
        })}
      </Box>
    )
  })
}
