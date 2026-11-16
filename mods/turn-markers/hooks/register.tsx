import { atom, read, update } from 'claude-code'
import type {
  Elements,
  EngineInterface,
  PromptOrigin,
  Register,
  RenderElement,
  RenderSurface,
  TurnStepChunk,
} from 'claude-code'

import type { ToolUseId } from '../types'
import { colors } from './shared/colors'

type Marker = { glyph: string; name: string; fill: string }

const YOU: Marker = { glyph: '▶', name: 'you', fill: colors.blue }
const CLAUDE: Marker = { glyph: '✻', name: 'claude', fill: colors.pink }
const LABEL_TEXT_COLOR = colors.nearBlack
const BLANK_LINES_ABOVE_LABEL = 1

const MAX_OPENERS = 500

const awaitingReply = atom({ plugin: 'turn-markers', key: 'awaitingReply' } as const, false)
const openers = atom({ plugin: 'turn-markers', key: 'openers' } as const, [] as ToolUseId[])

const PERSON_KINDS = new Set(['composer', 'bridge', 'sdk', 'slack-ping'])
const isPerson = (origin: PromptOrigin) =>
  PERSON_KINDS.has(origin.kind) || (origin.kind === 'plugin' && origin.asUser === true)

const labelText = (marker: Marker) => ` ${marker.glyph} ${marker.name} `

// The label gets its own Box so a surface that stretches column children
// can't spread the fill across the whole row.
const withLabel = <S extends RenderSurface>(
  { Box, Text }: Elements[S],
  marker: Marker,
  row: RenderElement,
) => (
  <Box flexDirection="column">
    <Box key="label" marginTop={BLANK_LINES_ABOVE_LABEL}>
      <Text color={LABEL_TEXT_COLOR} backgroundColor={marker.fill} bold wrap="truncate-end">
        {labelText(marker)}
      </Text>
    </Box>
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
      return withLabel($.ui.resolve(e), YOU, await next(e))
    }

    return next(e)
  })

  on('ui.render', { component: 'AssistantMessage' }, async ($, e, next) => {
    if (e.props.isFirstOfReply && !e.props.isSummary) {
      return withLabel($.ui.resolve(e), CLAUDE, await next(e))
    }

    return next(e)
  })

  on('ui.render', { component: 'ToolUse' }, async ($, e, next) => {
    if ((await read($, openers)).includes(e.props.tool_use_id)) {
      return withLabel($.ui.resolve(e), CLAUDE, await next(e))
    }

    return next(e)
  })
}
