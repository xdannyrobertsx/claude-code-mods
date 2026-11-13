import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, RenderSurface } from 'claude-code'

import type { Entry, Snapshot } from '../types'

const PANE = 'scratchpad'
const REFRESH_MS = 2000
const MAX_ENTRIES = 2000
const WIDTH_SHARE = 0.2

const snapshot = atom({ plugin: 'scratchpad', key: 'snapshot' } as const, {
  root: null,
  entries: [],
} as Snapshot)
const collapsed = atom({ plugin: 'scratchpad', key: 'collapsed' } as const, [] as string[])
const isOpen = atom({ plugin: 'scratchpad', key: 'isOpen' } as const, false)

// The API has no scratchpad path, so rebuild the harness's layout:
// <tmp>/claude-<uid>/<project path, non-alphanumerics as dashes>/<session id>/scratchpad
const findScratchpad = async ($: EngineInterface): Promise<string | null> => {
  const [id, root, cwd] = await Promise.all([$.session.id(), $.session.root(), $.session.cwd()])
  const slugs = [...new Set([root, cwd])].map(dir => dir.replace(/[^a-zA-Z0-9]/g, '-'))

  for (const tmp of ['/private/tmp', '/tmp']) {
    const tops = await $.fs.list(tmp).catch(() => [])
    for (const top of tops) {
      if (!top.name.startsWith('claude-')) continue
      for (const slug of slugs) {
        const path = `${tmp}/${top.name}/${slug}/${id}/scratchpad`
        if (await $.fs.exists(path)) return path
      }
    }
  }

  return null
}

// Folders first, then names; the whole tree, so collapsing is a view filter.
const walk = async ($: EngineInterface, dir: string, depth: number, out: Entry[]) => {
  const list = await $.fs.list(dir).catch(() => [])
  const sorted = [...list].sort(
    (a, b) => Number(b.kind === 'dir') - Number(a.kind === 'dir') || a.name.localeCompare(b.name),
  )
  for (const one of sorted) {
    if (out.length >= MAX_ENTRIES) return
    const path = `${dir}/${one.name}`
    out.push({ path, name: one.name, kind: one.kind, depth })
    if (one.kind === 'dir') await walk($, path, depth + 1, out)
  }
}

const refresh = async ($: EngineInterface) => {
  const known = await read($, snapshot)
  const root = known.root ?? (await findScratchpad($))
  const entries: Entry[] = []
  if (root !== null) await walk($, root, 0, entries)

  const next: Snapshot = { root, entries }
  // Only write on change, so an idle tree isn't redrawn every tick.
  if (JSON.stringify(next) !== JSON.stringify(known)) await update($, snapshot, () => next)
}

const isPaneUp = async ($: EngineInterface) => (await $.ui.panes()).some(pane => pane.id === PANE)

// `columns` is the terminal width the button was last drawn at; the sidebar
// asks for WIDTH_SHARE of it (left to the engine's default when unmeasured).
const toggle = async ($: EngineInterface, columns: number | undefined) => {
  if (await isPaneUp($)) {
    // Our own close doesn't pass back through our ui.close hook, so clear it here.
    await $.ui.close({ id: PANE })
    await update($, isOpen, () => false)
    return
  }
  await refresh($)
  const width = columns === undefined ? undefined : Math.max(1, Math.round(columns * WIDTH_SHARE))
  await $.ui.open({ id: PANE, title: 'Scratchpad', ...(width === undefined ? {} : { columns: width }) })
  await update($, isOpen, () => true)
}

const toggleDir = ($: EngineInterface, path: string) =>
  update($, collapsed, list =>
    list.includes(path) ? list.filter(one => one !== path) : [...list, path],
  )

const copyPath = async ($: EngineInterface, entry: Entry, surface: RenderSurface) => {
  const copied = await $.ui.copy({ text: entry.path, surface })
  $.ui.toast(copied.isCopied ? `Copied path of ${entry.name}` : `Couldn't copy: ${copied.reason}`)
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    // Poll only while the pane is up; the timer is dropped on reload and
    // session.start runs again then.
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

    const { Box, Button } = $.ui.resolve(e)
    const open = await read($, isOpen)

    return (
      <Box>
        <Button
          key="toggle"
          label={open ? 'Hide scratchpad' : 'Scratchpad'}
          onPress={() => toggle($, e.viewport?.columns)}
        />
      </Box>
    )
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Button, Text } = $.ui.resolve(e)
    const { root, entries } = await read($, snapshot)
    const shut = await read($, collapsed)

    if (root === null) {
      return (
        <Box flexDirection="column">
          <Text dimColor>Couldn't find this session's scratchpad.</Text>
        </Box>
      )
    }

    const visible = entries.filter(entry => !shut.some(dir => entry.path.startsWith(dir + '/')))

    return (
      <Box flexDirection="column">
        {visible.length === 0 && <Text dimColor>Empty.</Text>}
        {visible.map(entry => {
          const isDir = entry.kind === 'dir'
          const mark = isDir ? (shut.includes(entry.path) ? '▸ ' : '▾ ') : '  '
          const label = `${'  '.repeat(entry.depth)}${mark}${entry.name}${isDir ? '/' : ''}`

          return (
            <Button
              key={entry.path}
              plain
              onPress={press => (isDir ? toggleDir($, entry.path) : copyPath($, entry, press.surface))}
            >
              {/* Claude Code's own look: folders bold, dotfiles dim, the rest plain. */}
              <Text bold={isDir} dimColor={entry.name.startsWith('.')} wrap="truncate-end">
                {label}
              </Text>
            </Button>
          )
        })}
      </Box>
    )
  })
}
