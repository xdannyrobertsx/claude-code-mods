---
type: Reference
title: turn-markers
description: how turn-markers decides which prompts and replies get a label, and how it finds a reply's first row.
tags: [mods, turn-markers]
sources:
  - id: code
    resource: mods/turn-markers/hooks/register.tsx · isPerson, watchForOpener, labelText, withLabel
    title: the hooks module
    last_modified: 2026-11-16T00:00:00Z
  - id: tests
    resource: mods/turn-markers/tests/turn-markers.test.tsx
    title: the tests (46 pass)
    last_modified: 2026-11-16T00:00:00Z
  - id: owner
    resource: the repo owner
    title: subagent replies left unmarked on purpose
    last_modified: 2026-11-13T00:00:00Z
---

# turn-markers

draws a colored label above each of the person's
prompts and above the start of each claude reply.
what it looks like and how to customize it are in
`mods/turn-markers/README.md`.

## which prompts count as the person's

`isPerson` accepts a prompt whose origin `kind` is
`composer`, `bridge` (remote control), `sdk` or
`slack-ping`, or a `plugin` origin with
`asUser: true` (voice input, say).[^code] task
notifications, scheduled prompts and other agents'
messages don't count. the tests cover `composer`,
`slack-ping` and a plugin with and without
`asUser`; `bridge` and `sdk` are only in the code.[^tests]

## finding a reply's first row

a reply opens with either text or a tool call, and
different hooks mark each:[^code]

1. `prompt.submit`: when a person's prompt is
   accepted (not dropped), sets `awaitingReply`.
2. `turn.step`: while `awaitingReply` is set, and
   only for the main agent, `watchForOpener`
   watches the streamed chunks. the first tool
   call or non-empty text decides; a tool call's
   id goes into `openers`. either way
   `awaitingReply` clears.
3. `AssistantMessage` render: a block with
   `isFirstOfReply` that isn't a summary gets the
   claude label. this covers replies that open with
   text.
4. `ToolUse` render: a call whose `tool_use_id` is
   in `openers` gets the claude label.

subagents' replies are never marked, by design.[^owner]
`openers` keeps the newest 500 ids, so a very old
opening tool call loses its label.

## state

per session, in `$.state`: `awaitingReply` (a
boolean) and `openers` (tool call ids, newest
last).

## the label

` <glyph> <name> `, bold, in its own row above the
marked one, with a blank line above it: a pill
filled with the marker's color, with `nearBlack`
text, as wide as its text. a pane narrower
than the label truncates it rather than wrapping
the fill onto a second row.[^code] the gap between
the label and its row is the engine row's own top
margin, not the mod's.
it doesn't depend on the viewport. an earlier
version drew a `─` rule sized from the viewport's
columns instead, which came up short in a wide
terminal and ran past the transcript column in
the desktop app, where columns don't match its
width.

colors come from the [palette](../palette.md):
`blue` fill for you, `pink` for claude. dark text
on a fill reads on a light theme too, unlike the
palette's colors as plain text.
**Unconfirmed:** that a claude code theme key
(`suggestion`, `claude`, …) also works as a fill
and follows the theme; it hasn't been tried.

[^code]: code: the symbols named in this doc's
    `code` source.

[^tests]: tests: the origins listed in the prompt
    tests.

[^owner]: owner, confirmed when asked.
