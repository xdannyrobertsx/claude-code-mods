import { atom, read, update } from 'claude-code'
import type { EngineInterface, RenderSurface, Register } from 'claude-code'

import type { Memory } from '../types'

const PANE = 'memory'
const REFRESH_MS = 2000
const WIDTH_SHARE = 0.25
const ICON = '🧠'
const INDEX_FILE = 'MEMORY.md'
const AUTO_MEMORY_TYPE = 'AutoMem'
const DESCRIPTION_INDENT = '  '

const root = atom({ plugin: 'memory', key: 'root' } as const, null as string | null)
const memories = atom({ plugin: 'memory', key: 'memories' } as const, [] as Memory[])
const isOpen = atom({ plugin: 'memory', key: 'isOpen' } as const, false)

const toProjectSlug = (dir: string) => dir.replace(/[^a-zA-Z0-9]/g, '-')
const parentOf = (path: string) => path.slice(0, path.lastIndexOf('/'))

// The engine knows the exact folder (it honours a custom memory directory), but only
// reports it once MEMORY.md exists and is loaded into the context.
const loadedMemoryDir = async ($: EngineInterface): Promise<string | null> => {
  const usage = await $.session.usage({ breakdown: 'summary' }).catch(() => null)
  const index = usage?.context.breakdown?.memoryFiles.find(
    file => file.type === AUTO_MEMORY_TYPE && file.path.endsWith(`/${INDEX_FILE}`),
  )
  return index === undefined ? null : parentOf(index.path)
}

const configDir = async ($: EngineInterface): Promise<string | null> => {
  const custom = await $.env.get('CLAUDE_CONFIG_DIR')
  if (custom !== undefined) return custom

  const home = await $.env.get('HOME')
  return home === undefined ? null : `${home}/.claude`
}

// Before the engine has loaded any memory, rebuild its default layout:
// <config dir>/projects/<project path, non-alphanumerics as dashes>/memory
const defaultMemoryDir = async ($: EngineInterface): Promise<string | null> => {
  const config = await configDir($)
  if (config === null) return null

  const [projectRoot, cwd] = await Promise.all([$.session.root(), $.session.cwd()])
  for (const slug of new Set([projectRoot, cwd].map(toProjectSlug))) {
    const path = `${config}/projects/${slug}/memory`
    if (await $.fs.exists(path)) return path
  }

  return null
}

const findMemoryDir = async ($: EngineInterface) => (await loadedMemoryDir($)) ?? defaultMemoryDir($)

const locateRoot = async ($: EngineInterface) => {
  const known = await read($, root)
  if (known !== null) return known

  const found = await findMemoryDir($)
  if (found !== null) await update($, root, () => found)
  return found
}

const frontmatterField = (text: string, key: string) => {
  const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text)?.[1]
  const value = frontmatter && new RegExp(`^${key}:[ \\t]*(.+)$`, 'm').exec(frontmatter)?.[1]?.trim()
  return value || null
}

const readMemory = async ($: EngineInterface, path: string, fileName: string): Promise<Memory | null> => {
  const text = await $.fs.read(path).catch(() => null)
  if (text === null) return null
  if (fileName === INDEX_FILE) return { path, name: INDEX_FILE, description: 'the index' }

  return {
    path,
    name: frontmatterField(text, 'name') ?? fileName.replace(/\.md$/, ''),
    description: frontmatterField(text, 'description'),
  }
}

const indexFirstThenByName = (a: Memory, b: Memory) =>
  Number(b.name === INDEX_FILE) - Number(a.name === INDEX_FILE) || a.name.localeCompare(b.name)

const readMemories = async ($: EngineInterface, dir: string) => {
  const files = (await $.fs.list(dir).catch(() => [])).filter(
    child => child.kind === 'file' && child.name.endsWith('.md'),
  )
  const found = await Promise.all(files.map(file => readMemory($, `${dir}/${file.name}`, file.name)))
  return found.filter(memory => memory !== null).sort(indexFirstThenByName)
}

const refresh = async ($: EngineInterface) => {
  const dir = await locateRoot($)
  if (dir === null) return

  const next = await readMemories($, dir)
  const hasChanged = JSON.stringify(next) !== JSON.stringify(await read($, memories))
  if (hasChanged) await update($, memories, () => next)
}

const isPaneUp = async ($: EngineInterface) => (await $.ui.panes()).some(pane => pane.id === PANE)

const sidebarWidth = (terminalColumns: number | undefined) =>
  terminalColumns === undefined ? {} : { columns: Math.max(1, Math.round(terminalColumns * WIDTH_SHARE)) }

const openSidebar = async ($: EngineInterface, terminalColumns: number | undefined) => {
  await refresh($)
  await $.ui.open({ id: PANE, title: 'Memory', ...sidebarWidth(terminalColumns) })
  await update($, isOpen, () => true)
}

// Closing our own pane doesn't run our ui.close hook, so isOpen is cleared here as well.
const closeSidebar = async ($: EngineInterface) => {
  await $.ui.close({ id: PANE })
  await update($, isOpen, () => false)
}

const toggleSidebar = async ($: EngineInterface, terminalColumns: number | undefined) =>
  (await isPaneUp($)) ? closeSidebar($) : openSidebar($, terminalColumns)

const copyPath = async ($: EngineInterface, memory: Memory, surface: RenderSurface) => {
  const copied = await $.ui.copy({ text: memory.path, surface })
  $.ui.toast(copied.isCopied ? `Copied path of ${memory.name}` : `Couldn't copy: ${copied.reason}`)
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
    const label = (await read($, isOpen)) ? 'Hide memory' : 'Memory'

    return (
      <Box>
        <Button key="toggle" label={label} onPress={() => toggleSidebar($, e.viewport?.columns)}>
          <Text>
            {ICON} {label}
          </Text>
        </Button>
      </Box>
    )
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Button, Text } = $.ui.resolve(e)
    const list = await read($, memories)

    if ((await read($, root)) === null || list.length === 0) {
      return (
        <Box flexDirection="column">
          <Text dimColor>No memories for this project yet.</Text>
        </Box>
      )
    }

    return (
      <Box flexDirection="column">
        {list.map(memory => (
          <Box key={`row:${memory.path}`} flexDirection="column">
            <Button key={memory.path} plain onPress={press => copyPath($, memory, press.surface)}>
              <Text bold wrap="truncate-end">
                {memory.name}
              </Text>
            </Button>
            {memory.description !== null && (
              <Text dimColor wrap="truncate-end">
                {DESCRIPTION_INDENT}
                {memory.description}
              </Text>
            )}
          </Box>
        ))}
      </Box>
    )
  })
}
