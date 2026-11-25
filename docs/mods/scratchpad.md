---
type: Reference
title: scratchpad
description: how the scratchpad sidebar finds the session's scratchpad, what it keeps in state, and how it stays current.
tags: [mods, scratchpad]
sources:
  - id: code
    resource: mods/scratchpad/hooks/register.tsx · findScratchpad, locateRoot, refresh, readNearestFirst, readFolder, toggleFolder, toggleSidebar
    title: the hooks module
    last_modified: 2026-11-25T00:00:00Z
  - id: tests
    resource: mods/scratchpad/tests/scratchpad.test.ts
    title: the tests (46 pass)
    last_modified: 2026-11-25T00:00:00Z
  - id: live
    resource: claude --plugin-dir mods/scratchpad, claude code 2.1.325
    title: live session, run by the repo owner
    last_modified: 2026-11-13T00:00:00Z
---

# scratchpad

a button above the prompt opens a sidebar pane
showing the session's scratchpad folder as a tree.
what it looks like and how to customize it are in
`mods/scratchpad/README.md`.

## finding the scratchpad

a mod can't be told the path: `$` has no
scratchpad path, and the only events that carry
one are classic hooks, which never reach a mod
(see
[mod api traps](../mod-api-traps.md#a-mods-classic-hooks-dont-run)).
so `findScratchpad` rebuilds it from claude code's
layout:[^code]

```
<tmp>/claude-<uid>/<slug>/<session id>/scratchpad
```

- `<tmp>` is `/private/tmp`, then `/tmp`; `<uid>`
  is any folder there starting `claude-`.
- `<slug>` is the project root, and the working
  directory if different, with every
  non-alphanumeric character turned into `-`.
- the first path that exists wins. a live
  session's scratchpad matched this layout.[^live]
- sessions without a scratchpad (`claude -p` runs)
  find nothing, and the pane says "Couldn't find
  this session's scratchpad."

`locateRoot` saves the path in state once found
and never searches again in that session. until
it's found, every refresh searches.

## state

all in `$.state`, so per session:[^code]

| key         | holds                                                              |
| ----------- | ------------------------------------------------------------------ |
| `root`      | the scratchpad path, or `null` until found                         |
| `entries`   | the tree as a flat list, each with `path`, `name`, `kind`, `depth` |
| `collapsed` | paths of collapsed folders                                         |
| `isOpen`    | whether the sidebar is open, for the button's label and icon       |

`entries` never holds what's inside a collapsed
folder: a refresh doesn't read collapsed folders.
the pane also hides entries under a collapsed
folder, which covers the moment between pressing
a folder and the refresh that follows.[^code]

## staying current

- `session.start` starts a 2 s timer. each tick
  checks whether the pane is up and refreshes only
  if it is.[^code]
- a refresh reads the folder breadth-first, one
  depth at a time, until it holds 2000 entries
  (`MAX_ENTRIES`), then writes them in tree order
  (folders first, then by name). entries nearest
  the root claim the budget first, so a huge
  folder, such as a repo checkout, can only crowd
  out entries deeper than itself, never the files
  beside it.[^code]
- a folder the budget cut short, or never reached,
  ends in a dim `…` row, so it doesn't look empty
  or complete. the row is an `entries` item of
  kind `leftOut`, with the folder's path plus a
  trailing `/` as its path, which no real file can
  have. it isn't pressable and doesn't count
  toward the 2000.[^code]
- `entries` is written only if the list changed,
  so an idle tree isn't redrawn, and never if a
  folder was pressed during the read: that press's
  own refresh writes instead.[^code]
- pressing a folder collapses or expands it, then
  refreshes at once: collapsing a huge folder
  frees its share of the budget for the rest of
  the tree.[^tests]
- opening the sidebar refreshes first, then opens
  the pane at a fifth of the terminal's width,
  measured when the button was last drawn.

## closing

`closeSidebar` clears `isOpen` itself, because
closing its own pane doesn't run the mod's
`ui.close` hook. that hook covers the other case:
the person closing the pane.[^code]
**Unconfirmed:** the "doesn't run its own
`ui.close` hook" part comes from the code's
comment; it hasn't been re-checked in a live
session.

## tests

the tests stand in for the engine with a fake
session, file system and pane (`fakeHost`), on
both the terminal and desktop surfaces.[^tests]

[^code]: code: the symbols named in this doc's
    `code` source.

[^live]: live: the repo owner's session found its
    scratchpad at a path of this shape.

[^tests]: tests: `fakeHost` and the surface loop;
    the huge-folder tests use a folder of 2000+
    files.
