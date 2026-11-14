import { expect, test } from 'claude-code/testing'
import type { Engine, Mounted } from 'claude-code/testing'
import type { On, PromptOrigin, RenderSurface, TurnStepChunk } from 'claude-code'

const RULE_CLAUDE = /✻ claude ─/
const RULE_YOU = /▶ you ─/
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
    await runTurn($, { kind: 'composer' })
    expect(await findText(await mountToolRow($, surface, 'tool-1'), RULE_CLAUDE)).toBeTruthy()
  })

  test(`a marked tool call keeps the engine's row under the rule (${surface})`, async ($, on) => {
    fakeEngine(on, TOOL_FIRST)
    await runTurn($, { kind: 'composer' })
    expect(await findText(await mountToolRow($, surface, 'tool-1'), /engine row/)).toBeTruthy()
  })

  test(`only a reply's first tool call is marked (${surface})`, async ($, on) => {
    fakeEngine(on, TOOL_FIRST)
    await runTurn($, { kind: 'composer' })
    expect(await findText(await mountToolRow($, surface, 'tool-2'), RULE_CLAUDE)).toBeFalsy()
  })

  test(`a reply that opens with text marks no tool call (${surface})`, async ($, on) => {
    fakeEngine(on, TEXT_FIRST)
    await runTurn($, { kind: 'composer' })
    expect(await findText(await mountToolRow($, surface, 'tool-1'), RULE_CLAUDE)).toBeFalsy()
  })

  test(`a turn no person started marks no tool call (${surface})`, async ($, on) => {
    fakeEngine(on, TOOL_FIRST)
    await runTurn($, { kind: 'task-notification' })
    expect(await findText(await mountToolRow($, surface, 'tool-1'), RULE_CLAUDE)).toBeFalsy()
  })

  for (const origin of PERSON_ORIGINS) {
    test(`a prompt from ${JSON.stringify(origin)} is marked (${surface})`, async ($, on) => {
      fakeEngine(on, [])
      expect(await findText(await mountPrompt($, surface, origin), RULE_YOU)).toBeTruthy()
    })
  }

  for (const origin of OTHER_ORIGINS) {
    test(`a prompt from ${JSON.stringify(origin)} is not marked (${surface})`, async ($, on) => {
      fakeEngine(on, [])
      expect(await findText(await mountPrompt($, surface, origin), RULE_YOU)).toBeFalsy()
    })
  }
}
