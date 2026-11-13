import { atom, read, update } from 'claude-code'
import type { Elements, PromptOrigin, Register, RenderElement, RenderSurface, RenderViewport } from 'claude-code'

import type { ToolUseId } from '../types'

type Marker = { glyph: string; label: string; color: string }

// Theme keys follow the active Claude Code theme (light/dark); a hex like '#5fd7ff' also works.
const YOU: Marker = { glyph: '▶', label: 'you', color: 'suggestion' }
const CLAUDE: Marker = { glyph: '✻', label: 'claude', color: 'claude' }

// How many reply-opening tool calls to remember; older rows lose their marker.
const MAX_OPENERS = 500

const awaitingReply = atom({ plugin: 'turn-markers', key: 'awaitingReply' } as const, false)
const openers = atom({ plugin: 'turn-markers', key: 'openers' } as const, [] as ToolUseId[])

// The person's own words: typed at the terminal, sent over Remote Control or the SDK, pinged
// from Slack, or submitted by a plugin as the person (voice input). Not task notifications,
// other agents' messages, scheduled prompts or channels.
const PERSON_KINDS = new Set(['composer', 'bridge', 'sdk', 'slack-ping'])
const isPerson = (origin: PromptOrigin) =>
  PERSON_KINDS.has(origin.kind) || (origin.kind === 'plugin' && origin.asUser === true)

// The label and a rule out toward the right edge. The viewport can be wider than the
// transcript column (a docked pane, a row gutter), so the Text truncates rather than wraps.
const rule = (marker: Marker, viewport: RenderViewport | undefined) => {
  const head = `${marker.glyph} ${marker.label} `
  const width = Math.max(4, Math.min(viewport?.columns ?? 80, 160) - head.length - 2)
  return head + '─'.repeat(width)
}

// The engine's own row with the marker's rule above it.
const withRule = <S extends RenderSurface>(
  { Box, Text }: Elements[S],
  marker: Marker,
  viewport: RenderViewport | undefined,
  row: RenderElement,
) => (
  <Box flexDirection="column">
    <Text color={marker.color} bold wrap="truncate-end">
      {rule(marker, viewport)}
    </Text>
    {row}
  </Box>
)

export const register: Register = on => {
  on('prompt.submit', async ($, e, next) => {
    const result = await next(e)

    if (!('drop' in result) && e.origin && isPerson(e.origin)) {
      await update($, awaitingReply, () => true)
    }

    return result
  })

  // Find what opens the reply: if a tool call streams in before any text, remember its id so
  // its row carries the claude marker. Text first is marked by the AssistantMessage hook.
  on('turn.step', async function* ($, e, next) {
    if (e.agentId !== undefined || !(await read($, awaitingReply))) {
      return yield* next(e)
    }

    let isDecided = false

    for await (const chunk of next(e)) {
      if (!isDecided && chunk.kind === 'tool') {
        isDecided = true
        const id = chunk.id
        await update($, openers, ids => [...ids, id].slice(-MAX_OPENERS))
        await update($, awaitingReply, () => false)
      } else if (!isDecided && chunk.kind === 'text' && chunk.text.trim() !== '') {
        isDecided = true
        await update($, awaitingReply, () => false)
      }

      yield chunk
    }
  })

  on('ui.render', { component: 'UserMessage' }, async ($, e, next) => {
    if (!isPerson(e.props.origin)) {
      return next(e)
    }

    return withRule($.ui.resolve(e), YOU, e.viewport, await next(e))
  })

  on('ui.render', { component: 'AssistantMessage' }, async ($, e, next) => {
    if (!e.props.isFirstOfReply || e.props.isSummary) {
      return next(e)
    }

    return withRule($.ui.resolve(e), CLAUDE, e.viewport, await next(e))
  })

  on('ui.render', { component: 'ToolUse' }, async ($, e, next) => {
    if (!(await read($, openers)).includes(e.props.tool_use_id)) {
      return next(e)
    }

    return withRule($.ui.resolve(e), CLAUDE, e.viewport, await next(e))
  })
}
