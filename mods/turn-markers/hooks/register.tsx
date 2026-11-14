import { atom, read, update } from 'claude-code'
import type {
  Elements,
  EngineInterface,
  PromptOrigin,
  Register,
  RenderElement,
  RenderSurface,
  RenderViewport,
  TurnStepChunk,
} from 'claude-code'

import type { ToolUseId } from '../types'
import { colors } from './shared/colors'

type Marker = { glyph: string; label: string; color: string }

const YOU: Marker = { glyph: '▶', label: 'you', color: colors.blue }
const CLAUDE: Marker = { glyph: '✻', label: 'claude', color: colors.pink }

const MAX_OPENERS = 500
const DEFAULT_COLUMNS = 80
const MAX_COLUMNS = 160
const MIN_RULE_LENGTH = 4
const RIGHT_MARGIN = 2

const awaitingReply = atom({ plugin: 'turn-markers', key: 'awaitingReply' } as const, false)
const openers = atom({ plugin: 'turn-markers', key: 'openers' } as const, [] as ToolUseId[])

const PERSON_KINDS = new Set(['composer', 'bridge', 'sdk', 'slack-ping'])
const isPerson = (origin: PromptOrigin) =>
  PERSON_KINDS.has(origin.kind) || (origin.kind === 'plugin' && origin.asUser === true)

const rule = (marker: Marker, viewport: RenderViewport | undefined) => {
  const head = `${marker.glyph} ${marker.label} `
  const columns = Math.min(viewport?.columns ?? DEFAULT_COLUMNS, MAX_COLUMNS)
  const length = Math.max(MIN_RULE_LENGTH, columns - head.length - RIGHT_MARGIN)
  return head + '─'.repeat(length)
}

// The viewport can be wider than the transcript column (a docked pane, a row gutter),
// so the rule truncates rather than wrapping onto a second line.
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

const opensReply = (chunk: TurnStepChunk) =>
  chunk.kind === 'tool' || (chunk.kind === 'text' && chunk.text.trim() !== '')

const rememberOpener = ($: EngineInterface, id: ToolUseId) =>
  update($, openers, ids => [...ids, id].slice(-MAX_OPENERS))

const isAwaitingMainReply = async ($: EngineInterface, agentId: string | undefined) =>
  agentId === undefined && (await read($, awaitingReply))

// A reply opens with text or a tool call. The AssistantMessage hook marks text;
// an opening tool call is remembered here so the ToolUse hook can mark its row.
async function* watchForOpener($: EngineInterface, stream: AsyncIterable<TurnStepChunk>) {
  let isOpened = false

  for await (const chunk of stream) {
    if (!isOpened && opensReply(chunk)) {
      isOpened = true
      if (chunk.kind === 'tool') await rememberOpener($, chunk.id)
      await update($, awaitingReply, () => false)
    }

    yield chunk
  }
}

export const register: Register = on => {
  on('prompt.submit', async ($, e, next) => {
    const result = await next(e)
    const isAccepted = !('drop' in result)

    if (isAccepted && e.origin && isPerson(e.origin)) {
      await update($, awaitingReply, () => true)
    }

    return result
  })

  on('turn.step', async function* ($, e, next) {
    if (await isAwaitingMainReply($, e.agentId)) {
      return yield* watchForOpener($, next(e))
    }

    return yield* next(e)
  })

  on('ui.render', { component: 'UserMessage' }, async ($, e, next) => {
    if (isPerson(e.props.origin)) {
      return withRule($.ui.resolve(e), YOU, e.viewport, await next(e))
    }

    return next(e)
  })

  on('ui.render', { component: 'AssistantMessage' }, async ($, e, next) => {
    if (e.props.isFirstOfReply && !e.props.isSummary) {
      return withRule($.ui.resolve(e), CLAUDE, e.viewport, await next(e))
    }

    return next(e)
  })

  on('ui.render', { component: 'ToolUse' }, async ($, e, next) => {
    if ((await read($, openers)).includes(e.props.tool_use_id)) {
      return withRule($.ui.resolve(e), CLAUDE, e.viewport, await next(e))
    }

    return next(e)
  })
}
