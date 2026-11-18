import { expect, test } from 'claude-code/testing'
import type { Engine, Mounted } from 'claude-code/testing'
import type { On, PromptOrigin, RenderSurface, TurnStepChunk } from 'claude-code'

import { colors } from '../hooks/shared/colors'

const LABEL_CLAUDE = /✻ claude/
const LABEL_YOU = /▶ you/
const PADDED_LABEL_CLAUDE = /^ ✻ claude $/
const PADDED_LABEL_YOU = /^ ▶ you $/
const RULE = /─/
const VIEWPORT = { columns: 100, rows: 40 }
const STEP = { turnId: 'turn-1', index: 0, model: 'opus', messageCount: 1 }

const TOOL_FIRST: TurnStepChunk[] = [
  { kind: 'tool', index: 0, id: 'tool-1', name: 'Read', ref: 1 },
  { kind: 'tool', index: 1, id: 'tool-2', name: 'Bash', ref: 2 },
]
const TEXT_FIRST: TurnStepChunk[] = [
  { kind: 'text', index: 0, text: 'Looking now.', ref: 1 },
  { kind: 'tool', index: 1, id: 'tool-1', name: 'Read', ref: 2 },
]

const PERSON_ORIGINS: PromptOrigin[] = [
  { kind: 'composer' },
  { kind: 'slack-ping' },
  { kind: 'plugin', name: 'voice', asUser: true },
]
const OTHER_ORIGINS: PromptOrigin[] = [
  { kind: 'task-notification' },
  { kind: 'plugin', name: 'voice' },
  { kind: 'peer' },
]

const PERSON = { kind: 'composer' } as const

type ReplyPosition = { isFirstOfReply: boolean; isSummary?: true }

const FIRST_MESSAGE: ReplyPosition = { isFirstOfReply: true }
const LATER_MESSAGE: ReplyPosition = { isFirstOfReply: false }
const SUMMARY: ReplyPosition = { isFirstOfReply: true, isSummary: true }

const fakeEngine = (on: On, chunks: TurnStepChunk[]) => {
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>engine row</Text>
  })
  on('prompt.submit', ($, e) => ({ text: e.text }))
  on('turn.step', async function* (_, e) {
    for (const chunk of chunks) yield chunk
    return {
      turnId: e.turnId,
      index: e.index,
      answer: '',
      toolUses: [],
      stopReason: 'end_turn' as const,
      usage: null,
    }
  })
}

const drain = async (stream: AsyncIterable<unknown>) => {
  for await (const _ of stream) {}
}

const runTurn = async ($: Engine, origin: PromptOrigin) => {
  await $.prompt.submit({ text: 'hi', wait: false, origin })
  await drain($.turn.step(STEP))
}

const mountPrompt = ($: Engine, surface: RenderSurface, origin: PromptOrigin) =>
  $.ui.mount({
    plugin: 'turn-markers',
    surface,
    component: 'UserMessage',
    requestId: 'msg-1',
    viewport: VIEWPORT,
    props: { text: 'hello', origin, isExpanded: false },
  })

const mountReplyMessage = ($: Engine, surface: RenderSurface, position: ReplyPosition) =>
  $.ui.mount({
    plugin: 'turn-markers',
    surface,
    component: 'AssistantMessage',
    requestId: 'reply-1',
    viewport: VIEWPORT,
    props: { text: 'Looking now.', ...position },
  })

const mountToolRow = ($: Engine, surface: RenderSurface, id: string) =>
  $.ui.mount({
    plugin: 'turn-markers',
    surface,
    component: 'ToolUse',
    requestId: id,
    viewport: VIEWPORT,
    props: { tool_use_id: id, tool: 'Read', input: {}, isRunning: false, isErrored: false, isInterrupted: false },
  })

const findText = async (ui: Pick<Mounted, 'find'>, text: RegExp) =>
  ui.find({ type: 'Text', text })

for (const surface of ['terminal', 'desktop'] as const) {
  test(`a reply that opens with a tool call marks that call (${surface})`, async ($, on) => {
    fakeEngine(on, TOOL_FIRST)
    await runTurn($, PERSON)
    expect(await findText(await mountToolRow($, surface, 'tool-1'), LABEL_CLAUDE)).toBeTruthy()
  })

  test(`a marked tool call keeps the engine's row under the label (${surface})`, async ($, on) => {
    fakeEngine(on, TOOL_FIRST)
    await runTurn($, PERSON)
    expect(await findText(await mountToolRow($, surface, 'tool-1'), /engine row/)).toBeTruthy()
  })

  test(`only a reply's first tool call is marked (${surface})`, async ($, on) => {
    fakeEngine(on, TOOL_FIRST)
    await runTurn($, PERSON)
    expect(await findText(await mountToolRow($, surface, 'tool-2'), LABEL_CLAUDE)).toBeFalsy()
  })

  test(`a reply that opens with text marks no tool call (${surface})`, async ($, on) => {
    fakeEngine(on, TEXT_FIRST)
    await runTurn($, PERSON)
    expect(await findText(await mountToolRow($, surface, 'tool-1'), LABEL_CLAUDE)).toBeFalsy()
  })

  test(`a turn no person started marks no tool call (${surface})`, async ($, on) => {
    fakeEngine(on, TOOL_FIRST)
    await runTurn($, { kind: 'task-notification' })
    expect(await findText(await mountToolRow($, surface, 'tool-1'), LABEL_CLAUDE)).toBeFalsy()
  })

  test(`a reply's first message is marked (${surface})`, async ($, on) => {
    fakeEngine(on, [])
    expect(await findText(await mountReplyMessage($, surface, FIRST_MESSAGE), LABEL_CLAUDE)).toBeTruthy()
  })

  test(`a reply's later message is not marked (${surface})`, async ($, on) => {
    fakeEngine(on, [])
    expect(await findText(await mountReplyMessage($, surface, LATER_MESSAGE), LABEL_CLAUDE)).toBeFalsy()
  })

  test(`a summary is not marked (${surface})`, async ($, on) => {
    fakeEngine(on, [])
    expect(await findText(await mountReplyMessage($, surface, SUMMARY), LABEL_CLAUDE)).toBeFalsy()
  })

  for (const origin of PERSON_ORIGINS) {
    test(`a prompt from ${JSON.stringify(origin)} is marked (${surface})`, async ($, on) => {
      fakeEngine(on, [])
      expect(await findText(await mountPrompt($, surface, origin), LABEL_YOU)).toBeTruthy()
    })
  }

  for (const origin of OTHER_ORIGINS) {
    test(`a prompt from ${JSON.stringify(origin)} is not marked (${surface})`, async ($, on) => {
      fakeEngine(on, [])
      expect(await findText(await mountPrompt($, surface, origin), LABEL_YOU)).toBeFalsy()
    })
  }

  test(`a prompt's label is filled with blue (${surface})`, async ($, on) => {
    fakeEngine(on, [])
    const label = await findText(await mountPrompt($, surface, PERSON), LABEL_YOU)
    expect(label?.props.backgroundColor).toBe(colors.blue)
  })

  test(`a reply's label is filled with pink (${surface})`, async ($, on) => {
    fakeEngine(on, [])
    const label = await findText(await mountReplyMessage($, surface, FIRST_MESSAGE), LABEL_CLAUDE)
    expect(label?.props.backgroundColor).toBe(colors.pink)
  })

  test(`a prompt's label text is near black on its fill (${surface})`, async ($, on) => {
    fakeEngine(on, [])
    const label = await findText(await mountPrompt($, surface, PERSON), LABEL_YOU)
    expect(label?.props.color).toBe(colors.nearBlack)
  })

  test(`a reply's label text is near black on its fill (${surface})`, async ($, on) => {
    fakeEngine(on, [])
    const label = await findText(await mountReplyMessage($, surface, FIRST_MESSAGE), LABEL_CLAUDE)
    expect(label?.props.color).toBe(colors.nearBlack)
  })

  test(`a label never wraps onto a second row (${surface})`, async ($, on) => {
    fakeEngine(on, [])
    const label = await findText(await mountPrompt($, surface, PERSON), LABEL_YOU)
    expect(label?.props.wrap).toBe('truncate-end')
  })

  test(`a prompt's label is its glyph and name, padded by a space on each side (${surface})`, async ($, on) => {
    fakeEngine(on, [])
    expect(await findText(await mountPrompt($, surface, PERSON), PADDED_LABEL_YOU)).toBeTruthy()
  })

  test(`a reply's label is its glyph and name, padded by a space on each side (${surface})`, async ($, on) => {
    fakeEngine(on, [])
    expect(await findText(await mountReplyMessage($, surface, FIRST_MESSAGE), PADDED_LABEL_CLAUDE)).toBeTruthy()
  })

  test(`a label leaves a blank line above it (${surface})`, async ($, on) => {
    fakeEngine(on, [])
    const labelBox = await (await mountPrompt($, surface, PERSON)).find({ key: 'label' })
    expect(labelBox?.props.marginTop).toBe(1)
  })

  test(`a marked prompt draws no rule (${surface})`, async ($, on) => {
    fakeEngine(on, [])
    expect(await findText(await mountPrompt($, surface, PERSON), RULE)).toBeFalsy()
  })
}
