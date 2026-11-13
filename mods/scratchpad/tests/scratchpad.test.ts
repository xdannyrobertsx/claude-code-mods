import { expect, test } from 'claude-code/testing'
import type { FsEntry, On } from 'claude-code'

const ROOT = '/private/tmp/claude-502/-proj/sess-1/scratchpad'
const SCROLL = { offset: 0, bodyRows: 20 }

const entry = (name: string, kind: FsEntry['kind']): FsEntry => ({
  name,
  kind,
  size: 0,
  mtimeMs: 0,
  isLink: false,
})

const TREE: Record<string, FsEntry[]> = {
  '/private/tmp': [entry('claude-502', 'dir'), entry('other', 'dir')],
  [ROOT]: [entry('.env', 'file'), entry('notes.md', 'file'), entry('out', 'dir')],
  [`${ROOT}/out`]: [entry('a.txt', 'file')],
}

// Stands in for the engine beneath the plugin: a fake session, file system and panes.
const fakeHost = (on: On) => {
  const host = {
    isUp: false,
    openedColumns: undefined as number | undefined,
    copied: [] as string[],
    toasts: [] as string[],
  }

  on('session.id', () => ({ value: 'sess-1' }))
  on('session.root', () => ({ value: '/proj' }))
  on('session.cwd', () => ({ value: '/proj' }))
  on('fs.list', ($, e) => ({ value: TREE[e.path] ?? [] }))
  on('fs.exists', ($, e) => ({ value: e.path === ROOT }))
  on('ui.panes', () => ({
    value: host.isUp
      ? [
          {
            id: 'scratchpad',
            title: 'Scratchpad',
            isShown: true,
            isFocused: false,
            isPlaced: true,
          },
        ]
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

for (const surface of ['terminal', 'desktop'] as const) {
  test(`toggles the scratchpad sidebar and acts on its tree (${surface})`, async ($, on) => {
    const host = fakeHost(on)
    const band = await $.ui.mount({
      plugin: 'scratchpad',
      surface,
      component: 'AbovePrompt',
      viewport: { columns: 254, rows: 60 },
      props: {
        hasSurvey: false,
        isWorking: false,
        maxRows: 3,
        bodyColumns: 80,
        scroll: SCROLL,
        view: {},
      },
    })
    expect((await band.find({ key: 'toggle' }))?.text).toBe('Scratchpad')

    await band.press({ key: 'toggle' })
    expect(host.isUp).toBe(true)
    expect(host.openedColumns).toBe(51) // 20% of 254
    expect((await band.find({ key: 'toggle' }))?.text).toBe('Hide scratchpad')

    const pane = await $.ui.mount({
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
    expect(await pane.find({ key: `${ROOT}/out/a.txt` })).toBeDefined()

    // Claude Code's own look: folders bold, dotfiles dim, the rest plain.
    const styleOf = async (name: RegExp) => (await pane.find({ type: 'Text', text: name }))?.props
    expect(await styleOf(/out\/$/)).toMatchObject({ bold: true })
    expect((await styleOf(/\.env$/))?.dimColor).toBe(true)
    expect((await styleOf(/notes\.md$/))?.dimColor).toBeFalsy()
    expect((await styleOf(/notes\.md$/))?.bold).toBeFalsy()
    expect((await styleOf(/notes\.md$/))?.color).toBeUndefined()

    // Folders collapse and expand.
    await pane.press({ key: `${ROOT}/out` })
    expect(await pane.find({ key: `${ROOT}/out/a.txt` })).toBeUndefined()
    await pane.press({ key: `${ROOT}/out` })
    expect(await pane.find({ key: `${ROOT}/out/a.txt` })).toBeDefined()

    // Files copy their full path.
    await pane.press({ key: `${ROOT}/notes.md` })
    expect(host.copied).toEqual([`${ROOT}/notes.md`])
    expect(host.toasts).toEqual(['Copied path of notes.md'])

    await band.press({ key: 'toggle' })
    expect(host.isUp).toBe(false)
    expect((await band.find({ key: 'toggle' }))?.text).toBe('Scratchpad')
  })
}
