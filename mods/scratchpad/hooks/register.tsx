import { atom, read, update } from 'claude-code'
import type { EngineInterface, FsEntry, Register, RenderSurface } from 'claude-code'

import type { Entry } from '../types'

const PANE = 'scratchpad'
const REFRESH_MS = 2000
const MAX_ENTRIES = 2000
const WIDTH_SHARE = 0.2
const INDENT = '  '
const LEFT_OUT = '…'
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

    // The slug is keyed to the folder the session *started* in, which root()/cwd() stop
    // reporting after a directory change (or once a spare folder is deleted). The session id
    // is unique, so fall back to looking for it under every project folder.
    for (const userDir of userDirs) {
      const projectDirs = await $.fs.list(`${tmp}/${userDir.name}`).catch(() => [])
      for (const projectDir of projectDirs) {
        if (projectDir.kind !== 'dir') continue
        const path = `${tmp}/${userDir.name}/${projectDir.name}/${id}/scratchpad`
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

const listSorted = async ($: EngineInterface, dir: string) =>
  [...(await $.fs.list(dir).catch(() => []))].sort(foldersFirstThenByName)

const toEntry = (dir: string, child: FsEntry, depth: number): Entry => ({
  path: `${dir}/${child.name}`,
  name: child.name,
  kind: child.kind,
  depth,
})

// The trailing slash gives the marker a path no real file can have, yet still inside dir.
const leftOutMarker = (dir: string, depth: number): Entry => ({
  path: `${dir}/`,
  name: LEFT_OUT,
  kind: 'leftOut',
  depth,
})

const isListed = (entry: Entry) => entry.kind !== 'leftOut'

const isExpandedFolder = (entry: Entry, collapsedDirs: string[]) =>
  entry.kind === 'dir' && !collapsedDirs.includes(entry.path)

const readFolder = async ($: EngineInterface, dir: string, depth: number, room: number) => {
  if (room === 0) return [leftOutMarker(dir, depth)]

  const listing = await listSorted($, dir)
  const children = listing.slice(0, room).map(child => toEntry(dir, child, depth))
  return children.length < listing.length ? [...children, leftOutMarker(dir, depth)] : children
}

// Breadth-first, so MAX_ENTRIES goes to the entries nearest the root: a huge folder can only
// crowd out entries deeper than itself. Collapsed folders aren't read, which frees their share.
// A folder the budget cut short, or never reached, ends in a marker instead of looking empty.
const readNearestFirst = async ($: EngineInterface, rootDir: string, collapsedDirs: string[]) => {
  const childrenOf = new Map<string, Entry[]>()
  let room = MAX_ENTRIES
  let level = [rootDir]

  for (let depth = 0; level.length > 0; depth++) {
    const nextLevel: string[] = []
    for (const dir of level) {
      const children = await readFolder($, dir, depth, room)
      room -= children.filter(isListed).length
      childrenOf.set(dir, children)
      const expandedFolders = children.filter(child => isExpandedFolder(child, collapsedDirs))
      nextLevel.push(...expandedFolders.map(child => child.path))
    }
    level = nextLevel
  }

  return childrenOf
}

const inTreeOrder = (dir: string, childrenOf: Map<string, Entry[]>): Entry[] =>
  (childrenOf.get(dir) ?? []).flatMap(entry => [entry, ...inTreeOrder(entry.path, childrenOf)])

const refresh = async ($: EngineInterface) => {
  const dir = await locateRoot($)
  if (dir === null) return

  const collapsedDirs = await read($, collapsed)
  const next = inTreeOrder(dir, await readNearestFirst($, dir, collapsedDirs))
  // A folder pressed mid-read starts its own refresh, so this stale list must not land after it.
  if (JSON.stringify(collapsedDirs) !== JSON.stringify(await read($, collapsed))) return

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

const toggleFolder = async ($: EngineInterface, path: string) => {
  await toggleCollapsed($, path)
  await refresh($)
}

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
          if (!isListed(entry)) {
            return (
              <Box key={entry.path}>
                <Text dimColor wrap="truncate-end">
                  {entryLabel(entry, collapsedDirs)}
                </Text>
              </Box>
            )
          }

          const isDir = entry.kind === 'dir'

          return (
            <Button
              key={entry.path}
              plain
              onPress={press => (isDir ? toggleFolder($, entry.path) : copyPath($, entry, press.surface))}
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
