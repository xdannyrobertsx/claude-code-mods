export type Entry = {
  path: string
  name: string
  kind: 'file' | 'dir' | 'other'
  depth: number
}

export type Snapshot = { root: string | null; entries: Entry[] }

declare module 'claude-code' {
  interface PluginState {
    scratchpad: { snapshot: Snapshot; collapsed: string[]; isOpen: boolean }
  }
}
