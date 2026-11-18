---
type: Reference
title: memory
description: how the memory sidebar finds the project's memory folder and reads each memory's name and description.
tags: [mods, memory]
sources:
  - id: code
    resource: mods/memory/hooks/register.tsx · loadedMemoryDir, mainCheckoutOf, defaultMemoryDir, readMemory, refresh
    title: the hooks module
    last_modified: 2026-11-15T00:00:00Z
  - id: tests
    resource: mods/memory/tests/memory.test.ts
    title: the tests (28 pass)
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
   `$HOME/.claude`, the slug a project folder with
   non-alphanumerics as dashes. `mainCheckoutOf`
   finds the folder: it walks up from the session's
   root to the first `.git`, and a worktree's `.git`
   file points it at the main checkout, so
   subfolders and worktrees share one memory
   folder, as claude code keys it. the session's
   root, then its cwd, are tried after it. the
   first that exists wins.

the folder found is kept in `memory.root` and not
looked up again. until one is found, each refresh
looks again, so a project's first memory shows up
without reopening the pane.

## reading memories

`readMemory` reads each `.md` file in the folder
(not subfolders). `MEMORY.md` is listed first as
"the index". other files take `name` and
`description` from their frontmatter, with one
pair of surrounding quotes taken off, falling back
to the file name and no description.[^code]

## not yet checked live

the `AutoMem` type label and the breakdown's
`memoryFiles` come from the api types; the tests
fake them.[^tests] so does keying memory to the
main checkout, which is how claude code is
understood to work but hasn't been seen in a
session. check them in a live session
(see
[installing and trying mods](../installing-and-trying-mods.md))
before relying on them.

[^code]: code: the functions named in the source.

[^tests]: tests: the `session.usage` stand-in in
    `fakeHost`.
