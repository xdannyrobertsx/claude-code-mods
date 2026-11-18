export type Memory = {
  path: string
  name: string
  description: string | null
}

declare module 'claude-code' {
  interface PluginState {
    memory: { root: string | null; memories: Memory[]; isOpen: boolean }
  }
}
