---
type: Reference
title: mod api traps
description: things about claude code's mod api that the docs don't say and that cost time to find out.
tags: [mod-api, hooks, testing]
sources:
  - id: live
    resource: claude --plugin-dir mods/scratchpad, claude code 2.1.325
    title: live session transcript
    last_modified: 2026-11-13T00:00:00Z
  - id: kit
    resource: claude plugin test and claude plugin validate, claude code 2.1.325
    title: test kit and validator output
    last_modified: 2026-11-13T00:00:00Z
  - id: types
    resource: plugin-authoring skill · types/claude-code.d.ts (2.1.323, 2.1.325)
    title: the mod api's type declarations
    last_modified: 2026-11-13T00:00:00Z
  - id: hooks-docs
    resource: https://code.claude.com/docs/en/hooks.md · common input fields
    title: claude code docs, hooks
    last_modified: 2026-11-13T00:00:00Z
---

# mod api traps

each was seen on the claude code version in its source. an update can change any of them, so re-check one before relying on it.

## a mod's classic hooks don't run

claude code's built-in guard, `cc-plugin-sec-default`, runs first on classic hook events (`classic.*`) and sends them on past user-installed mods. seen for `SessionStart`, `UserPromptSubmit`, `Stop` and `SubagentStop`. each skip prints a transcript line:[^live]

```
<mod>: its classic.<Event> hook was skipped. "cc-plugin-sec-default" runs first and sent the event on past it.
```

so anything that only arrives in a classic hook's input never reaches a mod. that includes `scratchpad_dir`, which the hooks docs list as a common input field for command hooks in settings.[^hooks-docs] it's why [scratchpad](mods/scratchpad.md) rebuilds its path instead.

`claude plugin test` doesn't run the guard: a mod's classic hooks pass in tests.[^kit] check any new event in a live session (see [installing and trying mods](installing-and-trying-mods.md)), not only in tests.

## `on()` needs a literal event name

the engine reads event names from the source. `on(eventName, …)` with a variable, e.g. in a loop over names, stops the whole module loading: "the event name passed to on() is not a string literal". write one `on('<event>', …)` per event and share a helper between them.[^kit]

## the test kit answers nothing by itself

every `$` call a mod makes in a test, and every event a test raises, needs a hook in the test standing in for the engine (`on('fs.list', …)`, `on('classic.UserPromptSubmit', () => ({}))`). without one the test fails with "no implementation for <event>".[^kit]

- type a test helper's `$` as `Engine` from `claude-code/testing`, not `EngineInterface`.
- a helper that only searches a mounted tree takes `Pick<Mounted, 'find'>`: a mounted Pane and a mounted AbovePrompt aren't assignable to plain `Mounted`.
- a `Button` with children: a found element's `text` is all of its children's text, icons included. read `props.label` for the button's name.

## the generated types can lag behind claude code

the types written for 2.1.323 didn't declare `scratchpad_dir` though the hooks docs did.[^types] treat a field missing from the types as unknown, not absent.

## a streaming hook may return nothing

a `turn.step` hook that consumes `next(e)` with `for await` and returns nothing keeps the result from beneath; it doesn't drop it.[^types]

[^live]: live: the transcript lines from a session with scratchpad loaded.
[^hooks-docs]: hooks-docs: the `scratchpad_dir` row of the common input fields table.
[^kit]: kit, from the failures and messages seen while writing these mods' tests.
[^types]: types; the `StreamHookBody` doc comment for the streaming return.
