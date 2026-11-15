import { expect, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import type { FsEntry, On, RenderSurface, SessionUsage } from 'claude-code'

const HOME = '/home/u'
const DEFAULT_DIR = `${HOME}/.claude/projects/-proj/memory`
const LOADED_DIR = '/elsewhere/memory'
const CUSTOM_CONFIG = '/cfg'
const SCROLL = { offset: 0, bodyRows: 20 }
const TERMINAL_COLUMNS = 200
const QUARTER_OF_TERMINAL = 50

const entry = (name: string, kind: FsEntry['kind'] = 'file'): FsEntry => ({
  name,
  kind,
  size: 0,
  mtimeMs: 0,
  isLink: false,
})

const FILES: Record<string, string> = {
  'MEMORY.md': '- [Preferred name](preferred-name.md) — call the user "danny"\n',
  'preferred-name.md': '---\nname: preferred-name\ndescription: call the user "danny", lowercase d\n---\n\nbody\n',
  'zz-untitled.md': 'no frontmatter here\n',
  'about-me.md': '---\nname: about-me\ndescription: who the user is\n---\n',
  'notes.txt': 'not a memory\n',
}

type HostOptions = {
  hasMemory?: boolean
  loadedDir?: string | null
  configDir?: string
}

const fakeHost = (on: On, { hasMemory = true, loadedDir = null, configDir }: HostOptions = {}) => {
  const memoryDir = loadedDir ?? (configDir === undefined ? DEFAULT_DIR : `${configDir}/projects/-proj/memory`)
  const host = { isUp: false, openedColumns: undefined as number | undefined, copied: [] as string[] }

  const memoryFiles = loadedDir === null ? [] : [{ path: `${loadedDir}/MEMORY.md`, type: 'AutoMem', tokens: 1 }]
  on('session.usage', () => ({ value: { context: { breakdown: { memoryFiles } } } as unknown as SessionUsage }))
  on('env.get', ($, e) => ({
    value: e.name === 'HOME' ? HOME : e.name === 'CLAUDE_CONFIG_DIR' ? configDir : undefined,
  }))
  on('session.root', () => ({ value: '/proj' }))
  on('session.cwd', () => ({ value: '/proj' }))
  on('fs.exists', ($, e) => ({ value: hasMemory && e.path === memoryDir }))
  on('fs.list', ($, e) => ({
    value: hasMemory && e.path === memoryDir ? [...Object.keys(FILES).map(name => entry(name)), entry('sub', 'dir')] : [],
  }))
  on('fs.read', ($, e) => {
    const text = e.path.startsWith(`${memoryDir}/`) ? FILES[e.path.slice(memoryDir.length + 1)] : undefined
    if (text === undefined) throw new Error(`ENOENT ${e.path}`)
    return { value: text }
  })
  on('ui.panes', () => ({
    value: host.isUp ? [{ id: 'memory', title: 'Memory', isShown: true, isFocused: false, isPlaced: true }] : [],
  }))
  on('ui.open', ($, e) => {
    host.isUp = true
    host.openedColumns = e.columns
    return { value: { isPlaced: true as const } }
  })
  on('ui.close', () => {
    host.isUp = false
    return { value: undefined }
  })
  on('ui.copy', ($, e) => {
    host.copied.push(e.text)
    return { value: { isCopied: true as const } }
  })
  on('ui.toast', () => ({ value: undefined }))

  return host
}

const mountBand = ($: Engine, surface: RenderSurface) =>
  $.ui.mount({
    plugin: 'memory',
    surface,
    component: 'AbovePrompt',
    viewport: { columns: TERMINAL_COLUMNS, rows: 60 },
    props: {
      hasSurvey: false,
      isCollapsed: false,
      isWorking: false,
      maxRows: 3,
      bodyColumns: 80,
      scroll: SCROLL,
      view: {},
    },
  })

const mountPane = ($: Engine, surface: RenderSurface) =>
  $.ui.mount({
    plugin: 'memory',
    surface,
    component: 'Pane',
    requestId: 'memory',
    props: { title: 'Memory', isFocused: false, bodyColumns: 50, placement: 'dock', scroll: SCROLL, view: {} },
  })

const openSidebar = async ($: Engine, surface: RenderSurface) => {
  const band = await mountBand($, surface)
  await band.press({ key: 'toggle' })
  return band
}

const openPane = async ($: Engine, surface: RenderSurface) => {
  await openSidebar($, surface)
  return mountPane($, surface)
}

const buttonTexts = async ($: Engine, surface: RenderSurface) => {
  const pane = await openPane($, surface)
  return (await pane.findAll({ type: 'Button' })).map(button => button.text)
}

for (const surface of ['terminal', 'desktop'] as const) {
  test(`the toggle opens the sidebar (${surface})`, async ($, on) => {
    const host = fakeHost(on)
    await openSidebar($, surface)
    expect(host.isUp).toBe(true)
  })

  test(`the toggle closes an open sidebar (${surface})`, async ($, on) => {
    const host = fakeHost(on)
    const band = await openSidebar($, surface)
    await band.press({ key: 'toggle' })
    expect(host.isUp).toBe(false)
  })

  test(`the toggle offers to hide an open sidebar (${surface})`, async ($, on) => {
    fakeHost(on)
    const band = await openSidebar($, surface)
    expect((await band.find({ key: 'toggle' }))?.props.label).toBe('Hide memory')
  })

  test(`the sidebar takes a quarter of the terminal's width (${surface})`, async ($, on) => {
    const host = fakeHost(on)
    await openSidebar($, surface)
    expect(host.openedColumns).toBe(QUARTER_OF_TERMINAL)
  })

  test(`the pane lists the index first, then memories by name, markdown files only (${surface})`, async ($, on) => {
    fakeHost(on)
    expect(await buttonTexts($, surface)).toEqual(['MEMORY.md', 'about-me', 'preferred-name', 'zz-untitled'])
  })

  test(`a memory shows its frontmatter description, dim (${surface})`, async ($, on) => {
    fakeHost(on)
    const pane = await openPane($, surface)
    expect((await pane.find({ type: 'Text', text: /lowercase d/ }))?.props).toMatchObject({ dimColor: true })
  })

  test(`pressing a memory copies its full path (${surface})`, async ($, on) => {
    const host = fakeHost(on)
    const pane = await openPane($, surface)
    await pane.press({ key: `${DEFAULT_DIR}/preferred-name.md` })
    expect(host.copied).toEqual([`${DEFAULT_DIR}/preferred-name.md`])
  })

  test(`it reads the folder the engine loaded memory from (${surface})`, async ($, on) => {
    fakeHost(on, { loadedDir: LOADED_DIR })
    const pane = await openPane($, surface)
    expect(await pane.find({ key: `${LOADED_DIR}/preferred-name.md` })).toBeDefined()
  })

  test(`CLAUDE_CONFIG_DIR moves the default folder (${surface})`, async ($, on) => {
    fakeHost(on, { configDir: CUSTOM_CONFIG })
    const pane = await openPane($, surface)
    expect(await pane.find({ key: `${CUSTOM_CONFIG}/projects/-proj/memory/preferred-name.md` })).toBeDefined()
  })

  test(`a project without memories says so (${surface})`, async ($, on) => {
    fakeHost(on, { hasMemory: false })
    const pane = await openPane($, surface)
    expect(await pane.find({ type: 'Text', text: /No memories/ })).toBeDefined()
  })
}
