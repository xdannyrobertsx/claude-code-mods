import type { Register, RenderViewport } from 'claude-code'

// Theme keys follow the active Claude Code theme (light/dark); a hex like '#5fd7ff' also works.
const YOU = { glyph: '▶', label: 'you', color: 'suggestion' }
const CLAUDE = { glyph: '✻', label: 'claude', color: 'claude' }

// Prompts the person typed (terminal, Remote Control, SDK): not task notifications or agent messages.
const PERSON_ORIGINS = new Set(['composer', 'bridge', 'sdk'])

const ruleWidth = (viewport: RenderViewport | undefined, used: number) =>
  Math.max(4, Math.min(viewport?.columns ?? 80, 160) - used - 2)

export const register: Register = on => {
  on('ui.render', { component: 'UserMessage' }, async ($, e, next) => {
    if (!PERSON_ORIGINS.has(e.props.origin.kind)) {
      return next(e)
    }

    const row = await next(e)
    const { Box, Text } = $.ui.resolve(e)
    const head = `${YOU.glyph} ${YOU.label} `

    return (
      <Box flexDirection="column">
        <Text color={YOU.color} bold>
          {head}
          {'─'.repeat(ruleWidth(e.viewport, head.length))}
        </Text>
        {row}
      </Box>
    )
  })

  on('ui.render', { component: 'AssistantMessage' }, async ($, e, next) => {
    if (!e.props.isFirstOfReply || e.props.isSummary) {
      return next(e)
    }

    const row = await next(e)
    const { Box, Text } = $.ui.resolve(e)
    const head = `${CLAUDE.glyph} ${CLAUDE.label} `

    return (
      <Box flexDirection="column">
        <Text color={CLAUDE.color} bold>
          {head}
          {'─'.repeat(ruleWidth(e.viewport, head.length))}
        </Text>
        {row}
      </Box>
    )
  })
}
