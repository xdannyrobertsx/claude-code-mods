export type Entry = {
  path: string
  name: string
  kind: 'file' | 'dir' | 'other' | 'leftOut'
  depth: number
}

declare module 'claude-code' {
  interface PluginState {
    scratchpad: { root: string | null; entries: Entry[]; collapsed: string[]; isOpen: boolean }
  }
}
