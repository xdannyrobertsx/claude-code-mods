export type ToolUseId = string

declare module 'claude-code' {
  interface PluginState {
    'turn-markers': {
      awaitingReply: boolean
      openers: ToolUseId[]
    }
  }
}
