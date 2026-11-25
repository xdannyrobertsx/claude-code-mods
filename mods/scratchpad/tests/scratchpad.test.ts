import { expect, test } from 'claude-code/testing'
import type { Engine, Mounted } from 'claude-code/testing'
import type { FsEntry, On, RenderSurface } from 'claude-code'

const ROOT = '/private/tmp/claude-502/-proj/sess-1/scratchpad'
const SCROLL = { offset: 0, bodyRows: 20 }
const TERMINAL_COLUMNS = 254
const FIFTH_OF_TERMINAL = 51
const FOLDER_CLOSED = '📁'
const FOLDER_OPEN = '📂'
const MAX_ENTRIES = 2000

const entry = (name: string, kind: FsEntry['kind']): FsEntry => ({
  name,
  kind,
  size: 0,
  mtimeMs: 0,
  isLink: false,
})

const TMP_FOLDERS = [entry('claude-502', 'dir'), entry('other', 'dir')]

const TREE: Record<string, FsEntry[]> = {
  [ROOT]: [entry('.env', 'file'), entry('notes.md', 'file'), entry('out', 'dir')],
  [`${ROOT}/out`]: [entry('a.txt', 'file')],
}

const manyFiles = (count: number) => Array.from({ length: count }, (_, index) => entry(`file-${index}.txt`, 'file'))

const HUGE_FOLDER_BESIDE_A_FILE: Record<string, FsEntry[]> = {
  [ROOT]: [entry('huge', 'dir'), entry('notes.md', 'file')],
  [`${ROOT}/huge`]: manyFiles(MAX_ENTRIES + 1),
}

const HUGE_FOLDER_BESIDE_A_FOLDER: Record<string, FsEntry[]> = {
  [ROOT]: [entry('a', 'dir'), entry('b', 'dir')],
  [`${ROOT}/a`]: manyFiles(MAX_ENTRIES),
  [`${ROOT}/b`]: [entry('deep.txt', 'file')],
}

const fakeHost = (on: On, { hasScratchpad = true, startedIn = '-proj', tree = TREE } = {}) => {
  const scratchpad = `/private/tmp/claude-502/${startedIn}/sess-1/scratchpad`
  const host = {
    isUp: false,
    openedColumns: undefined as number | undefined,
    copied: [] as string[],
    toasts: [] as string[],
  }

  on('session.id', () => ({ value: 'sess-1' }))
  on('session.root', () => ({ value: '/proj' }))
  on('session.cwd', () => ({ value: '/proj' }))
  const listing = (path: string) => {
    if (path === '/private/tmp') return TMP_FOLDERS
    if (path === '/private/tmp/claude-502') return [entry(startedIn, 'dir')]
    return tree[path.replace(scratchpad, ROOT)] ?? []
  }

  on('fs.list', ($, e) => ({ value: listing(e.path) }))
  on('fs.exists', ($, e) => ({ value: hasScratchpad && e.path === scratchpad }))
  on('ui.panes', () => ({
    value: host.isUp
      ? [{ id: 'scratchpad', title: 'Scratchpad', isShown: true, isFocused: false, isPlaced: true }]
      : [],
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
  on('ui.toast', ($, e) => {
    host.toasts.push(e.text)
    return { value: undefined }
  })

  return host
}

const mountBand = ($: Engine, surface: RenderSurface) =>
  $.ui.mount({
    plugin: 'scratchpad',
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
    plugin: 'scratchpad',
    surface,
    component: 'Pane',
    requestId: 'scratchpad',
    props: {
      title: 'Scratchpad',
      isFocused: false,
      bodyColumns: 40,
      placement: 'dock',
      scroll: SCROLL,
      view: {},
    },
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

const styleOf = async (pane: Pick<Mounted, 'find'>, name: RegExp) =>
  (await pane.find({ type: 'Text', text: name }))?.props

for (const surface of ['terminal', 'desktop'] as const) {
  test(`a closed sidebar shows a closed folder (${surface})`, async ($, on) => {
    fakeHost(on)
    const band = await mountBand($, surface)
    expect(await band.find({ type: 'Text', text: new RegExp(FOLDER_CLOSED) })).toBeDefined()
  })

  test(`the folder icon opens with the sidebar (${surface})`, async ($, on) => {
    fakeHost(on)
    const band = await openSidebar($, surface)
    expect(await band.find({ type: 'Text', text: new RegExp(FOLDER_OPEN) })).toBeDefined()
  })

  test(`the toggle opens the sidebar (${surface})`, async ($, on) => {
    const host = fakeHost(on)
    await openSidebar($, surface)
    expect(host.isUp).toBe(true)
  })

  test(`the sidebar takes a fifth of the terminal's width (${surface})`, async ($, on) => {
    const host = fakeHost(on)
    await openSidebar($, surface)
    expect(host.openedColumns).toBe(FIFTH_OF_TERMINAL)
  })

  test(`the toggle offers to hide an open sidebar (${surface})`, async ($, on) => {
    fakeHost(on)
    const band = await openSidebar($, surface)
    expect((await band.find({ key: 'toggle' }))?.props.label).toBe('Hide scratchpad')
  })

  test(`the toggle closes an open sidebar (${surface})`, async ($, on) => {
    const host = fakeHost(on)
    const band = await openSidebar($, surface)
    await band.press({ key: 'toggle' })
    expect(host.isUp).toBe(false)
  })

  test(`the toggle offers to show a closed sidebar (${surface})`, async ($, on) => {
    fakeHost(on)
    const band = await openSidebar($, surface)
    await band.press({ key: 'toggle' })
    expect((await band.find({ key: 'toggle' }))?.props.label).toBe('Scratchpad')
  })

  test(`the pane lists files inside folders (${surface})`, async ($, on) => {
    fakeHost(on)
    const pane = await openPane($, surface)
    expect(await pane.find({ key: `${ROOT}/out/a.txt` })).toBeDefined()
  })

  test(`folders are bold (${surface})`, async ($, on) => {
    fakeHost(on)
    const pane = await openPane($, surface)
    expect(await styleOf(pane, /out\/$/)).toMatchObject({ bold: true })
  })

  test(`dotfiles are dim (${surface})`, async ($, on) => {
    fakeHost(on)
    const pane = await openPane($, surface)
    expect(await styleOf(pane, /\.env$/)).toMatchObject({ dimColor: true })
  })

  test(`other files are plain (${surface})`, async ($, on) => {
    fakeHost(on)
    const pane = await openPane($, surface)
    const style = await styleOf(pane, /notes\.md$/)
    expect({ bold: Boolean(style?.bold), dimColor: Boolean(style?.dimColor), color: style?.color }).toEqual({
      bold: false,
      dimColor: false,
      color: undefined,
    })
  })

  test(`pressing a folder collapses it (${surface})`, async ($, on) => {
    fakeHost(on)
    const pane = await openPane($, surface)
    await pane.press({ key: `${ROOT}/out` })
    expect(await pane.find({ key: `${ROOT}/out/a.txt` })).toBeUndefined()
  })

  test(`pressing a collapsed folder expands it (${surface})`, async ($, on) => {
    fakeHost(on)
    const pane = await openPane($, surface)
    await pane.press({ key: `${ROOT}/out` })
    await pane.press({ key: `${ROOT}/out` })
    expect(await pane.find({ key: `${ROOT}/out/a.txt` })).toBeDefined()
  })

  test(`a huge folder doesn't hide the files beside it (${surface})`, async ($, on) => {
    fakeHost(on, { tree: HUGE_FOLDER_BESIDE_A_FILE })
    const pane = await openPane($, surface)
    expect(await pane.find({ key: `${ROOT}/notes.md` })).toBeDefined()
  })

  test(`collapsing a folder makes room for what it crowded out (${surface})`, async ($, on) => {
    fakeHost(on, { tree: HUGE_FOLDER_BESIDE_A_FOLDER })
    const pane = await openPane($, surface)
    await pane.press({ key: `${ROOT}/a` })
    expect(await pane.find({ key: `${ROOT}/b/deep.txt` })).toBeDefined()
  })

  test(`pressing a file copies its full path (${surface})`, async ($, on) => {
    const host = fakeHost(on)
    const pane = await openPane($, surface)
    await pane.press({ key: `${ROOT}/notes.md` })
    expect(host.copied).toEqual([`${ROOT}/notes.md`])
  })

  test(`copying a path says so in a toast (${surface})`, async ($, on) => {
    const host = fakeHost(on)
    const pane = await openPane($, surface)
    await pane.press({ key: `${ROOT}/notes.md` })
    expect(host.toasts).toEqual(['Copied path of notes.md'])
  })

  test(`it finds a scratchpad filed under the folder the session started in (${surface})`, async ($, on) => {
    fakeHost(on, { startedIn: '-somewhere-else' })
    const pane = await openPane($, surface)
    const started = '/private/tmp/claude-502/-somewhere-else/sess-1/scratchpad'
    expect(await pane.find({ key: `${started}/out/a.txt` })).toBeDefined()
  })

  test(`a session without a scratchpad says it couldn't find one (${surface})`, async ($, on) => {
    fakeHost(on, { hasScratchpad: false })
    const pane = await openPane($, surface)
    expect(await pane.find({ type: 'Text', text: /Couldn't find/ })).toBeDefined()
  })
}
