/** A tool call's id (`tool_use_id`), the same value as its ToolUse row's `requestId`. */
export type ToolUseId = string

declare module 'claude-code' {
  interface PluginState {
    'turn-markers': {
      /** True from a person's prompt until the reply's first text or tool call streams in. */
      awaitingReply: boolean
      /** Tool calls that opened a reply (no text before them), newest last. */
      openers: ToolUseId[]
    }
  }
}
