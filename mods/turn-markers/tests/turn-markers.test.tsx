import { expect, test } from 'claude-code/testing'
import type { On, PromptOrigin, TurnStepChunk } from 'claude-code'

const RULE_CLAUDE = /✻ claude ─/
const RULE_YOU = /▶ you ─/
const VIEWPORT = { columns: 100, rows: 40 }

// Stands in for the engine beneath the plugin: draws each row as one Text, accepts every
// prompt, and streams the given chunks as the model's response.
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

const STEP = { turnId: 'turn-1', index: 0, model: 'opus', messageCount: 1 }

const prompt = (origin: PromptOrigin) => ({
  plugin: 'turn-markers',
  component: 'UserMessage' as const,
  requestId: 'msg-1',
  viewport: VIEWPORT,
  props: { text: 'hello', origin, isExpanded: false },
})

const toolRow = (id: string) => ({
  plugin: 'turn-markers',
  component: 'ToolUse' as const,
  requestId: id,
  viewport: VIEWPORT,
  props: { tool_use_id: id, tool: 'Read', input: {}, isRunning: false, isErrored: false, isInterrupted: false },
})

const drain = async (stream: AsyncIterable<unknown>) => {
  for await (const _ of stream) {
    // the stream's chunks are the engine's; only what the mod records matters here
  }
}

for (const surface of ['terminal', 'desktop'] as const) {
  test(`a reply that opens with a tool call marks that call (${surface})`, async ($, on) => {
    fakeEngine(on, [
      { kind: 'tool', index: 0, id: 'tool-1', name: 'Read', ref: 1 },
      { kind: 'tool', index: 1, id: 'tool-2', name: 'Bash', ref: 2 },
    ])

    await $.prompt.submit({ text: 'hi', wait: false, origin: { kind: 'composer' } })
    await drain($.turn.step(STEP))

    const first = await $.ui.mount({ ...toolRow('tool-1'), surface })
    expect(await first.find({ type: 'Text', text: RULE_CLAUDE })).toBeTruthy()
    expect(await first.find({ type: 'Text', text: /engine row/ })).toBeTruthy()
    await first.unmount()

    const second = await $.ui.mount({ ...toolRow('tool-2'), surface })
    expect(await second.find({ type: 'Text', text: RULE_CLAUDE })).toBeFalsy()
    await second.unmount()
  })

  test(`a reply that opens with text marks no tool call (${surface})`, async ($, on) => {
    fakeEngine(on, [
      { kind: 'text', index: 0, text: 'Looking now.', ref: 1 },
      { kind: 'tool', index: 1, id: 'tool-1', name: 'Read', ref: 2 },
    ])

    await $.prompt.submit({ text: 'hi', wait: false, origin: { kind: 'composer' } })
    await drain($.turn.step(STEP))

    const row = await $.ui.mount({ ...toolRow('tool-1'), surface })
    expect(await row.find({ type: 'Text', text: RULE_CLAUDE })).toBeFalsy()
    await row.unmount()
  })

  test(`a turn no person started marks no tool call (${surface})`, async ($, on) => {
    fakeEngine(on, [{ kind: 'tool', index: 0, id: 'tool-1', name: 'Read', ref: 1 }])

    await $.prompt.submit({ text: 'done', wait: false, origin: { kind: 'task-notification' } })
    await drain($.turn.step(STEP))

    const row = await $.ui.mount({ ...toolRow('tool-1'), surface })
    expect(await row.find({ type: 'Text', text: RULE_CLAUDE })).toBeFalsy()
    await row.unmount()
  })

  test(`the person's prompts are marked, other senders' are not (${surface})`, async ($, on) => {
    fakeEngine(on, [])

    const marked: PromptOrigin[] = [
      { kind: 'composer' },
      { kind: 'slack-ping' },
      { kind: 'plugin', name: 'voice', asUser: true },
    ]
    const unmarked: PromptOrigin[] = [
      { kind: 'task-notification' },
      { kind: 'plugin', name: 'voice' },
      { kind: 'peer' },
    ]

    for (const origin of marked) {
      const ui = await $.ui.mount({ ...prompt(origin), surface })
      expect(await ui.find({ type: 'Text', text: RULE_YOU })).toBeTruthy()
      await ui.unmount()
    }

    for (const origin of unmarked) {
      const ui = await $.ui.mount({ ...prompt(origin), surface })
      expect(await ui.find({ type: 'Text', text: RULE_YOU })).toBeFalsy()
      await ui.unmount()
    }
  })
}
