import type { Register, RenderViewport } from 'claude-code'

type Marker = { glyph: string; label: string; color: string }

// Theme keys follow the active Claude Code theme (light/dark); a hex like '#5fd7ff' also works.
const YOU: Marker = { glyph: '▶', label: 'you', color: 'suggestion' }
const CLAUDE: Marker = { glyph: '✻', label: 'claude', color: 'claude' }

// Prompts the person typed (terminal, Remote Control, SDK): not task notifications or agent messages.
const PERSON_ORIGINS = new Set(['composer', 'bridge', 'sdk'])

// The label and a rule out toward the right edge. The viewport can be wider than the
// transcript column (a docked pane, a row gutter), so the Text truncates rather than wraps.
const rule = (marker: Marker, viewport: RenderViewport | undefined) => {
  const head = `${marker.glyph} ${marker.label} `
  const width = Math.max(4, Math.min(viewport?.columns ?? 80, 160) - head.length - 2)
  return head + '─'.repeat(width)
}

export const register: Register = on => {
  on('ui.render', { component: 'UserMessage' }, async ($, e, next) => {
    if (!PERSON_ORIGINS.has(e.props.origin.kind)) {
      return next(e)
    }

    const row = await next(e)
    const { Box, Text } = $.ui.resolve(e)

    return (
      <Box flexDirection="column">
        <Text color={YOU.color} bold wrap="truncate-end">
          {rule(YOU, e.viewport)}
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

    return (
      <Box flexDirection="column">
        <Text color={CLAUDE.color} bold wrap="truncate-end">
          {rule(CLAUDE, e.viewport)}
        </Text>
        {row}
      </Box>
    )
  })
}
