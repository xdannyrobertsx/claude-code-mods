---
type: Reference
title: turn-markers
description: how turn-markers decides which prompts and replies get a rule, and how it finds a reply's first row.
tags: [mods, turn-markers]
sources:
  - id: code
    resource: mods/turn-markers/hooks/register.tsx · isPerson, watchForOpener, rule, withRule
    title: the hooks module
    last_modified: 2026-11-13T00:00:00Z
  - id: tests
    resource: mods/turn-markers/tests/turn-markers.test.tsx
    title: the tests (22 pass)
    last_modified: 2026-11-13T00:00:00Z
  - id: owner
    resource: the repo owner
    title: subagent replies left unmarked on purpose
    last_modified: 2026-11-13T00:00:00Z
---

# turn-markers

draws a colored rule above each of the person's
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
   claude rule. this covers replies that open with
   text.
4. `ToolUse` render: a call whose `tool_use_id` is
   in `openers` gets the claude rule.

subagents' replies are never marked, by design.[^owner]
`openers` keeps the newest 500 ids, so a very old
opening tool call loses its rule.

## state

per session, in `$.state`: `awaitingReply` (a
boolean) and `openers` (tool call ids, newest
last).

## the rule

`<glyph> <label>` and then `─` out toward the
right edge: the viewport's columns (80 if unknown,
at most 160), less the label and 2, never under 4.[^code]
the viewport can be wider than the transcript
column (a docked pane, a row gutter), so the rule
truncates instead of wrapping onto a second line.

colors come from the [palette](../palette.md):
`blue` for you, `pink` for claude.
**Unconfirmed:** that a claude code theme key
(`suggestion`, `claude`, …) also works as a marker
color and follows the theme; the README says so,
but it hasn't been tried.

[^code]: code: the symbols named in this doc's
    `code` source.

[^tests]: tests: the origins listed in the prompt
    tests.

[^owner]: owner, confirmed when asked.
