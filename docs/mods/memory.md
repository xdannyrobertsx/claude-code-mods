---
type: Reference
title: memory
description: how the memory sidebar finds the project's memory folder, what it keeps in state, and how it stays current.
tags: [mods, memory]
sources:
  - id: code
    resource: mods/memory/hooks/register.tsx · loadedMemoryDir, defaultMemoryDir, readMemory, refresh
    title: the hooks module
    last_modified: 2026-11-15T00:00:00Z
  - id: tests
    resource: mods/memory/tests/memory.test.ts
    title: the tests (20 pass)
    last_modified: 2026-11-15T00:00:00Z
---

# memory

a button above the prompt opens a sidebar pane
listing the project's auto-memory files with their
frontmatter descriptions. it's built like
[scratchpad](scratchpad.md): same toggle, same
`isOpen` bookkeeping, same two-second refresh
while the pane is up. what it looks like and how
to customize it are in `mods/memory/README.md`.

## finding the memory folder

two sources, in order:[^code]

1. `loadedMemoryDir`: `$.session.usage({ breakdown: 'summary' })`
   lists the context's memory files. the one with
   type `AutoMem` ending in `/MEMORY.md` gives the
   exact folder, a custom memory directory
   included. `summary` estimates locally and sends
   no requests. it's only there once `MEMORY.md`
   exists and has been loaded.
2. `defaultMemoryDir`: rebuilds the default
   `<config dir>/projects/<slug>/memory`, the
   config dir being `CLAUDE_CONFIG_DIR` or
   `$HOME/.claude`, the slug the session's root or
   cwd with non-alphanumerics as dashes. the first
   that exists wins.

the folder found is kept in `memory.root` and not
looked up again. until one is found, each refresh
looks again, so a project's first memory shows up
without reopening the pane.

## reading memories

`readMemory` reads each `.md` file in the folder
(not subfolders). `MEMORY.md` is listed first as
"the index". other files take `name` and
`description` from their frontmatter, falling back
to the file name and no description.[^code]

## not yet checked live

the `AutoMem` type label and the breakdown's
`memoryFiles` come from the api types; the tests
fake them.[^tests] check them in a live session
(see
[installing and trying mods](../installing-and-trying-mods.md))
before relying on them.

[^code]: code: the functions named in the source.

[^tests]: tests: the `session.usage` stand-in in
    `fakeHost`.
