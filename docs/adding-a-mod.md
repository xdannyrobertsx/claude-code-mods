---
type: Playbook
title: adding a mod
description: the steps to create a new mod and list it in the marketplace.
tags: [mods, setup]
sources:
  - id: layout
    resource: mods/memory, mods/scratchpad, mods/turn-markers
    title: the existing mods
    last_modified: 2026-11-13T00:00:00Z
  - id: marketplace
    resource: .claude-plugin/marketplace.json · plugins
    title: the marketplace file
    last_modified: 2026-11-13T00:00:00Z
---

# adding a mod

use the `plugin-authoring` skill for the mod api
itself; this is how a mod fits into this repo. the
existing mods are worked examples:

- a row or button above the prompt, and a sidebar
  pane: [scratchpad](mods/scratchpad.md)
  (`ui.render` on `AbovePrompt` and `Pane`);
  [memory](mods/memory.md) is built the same way.
- marks on transcript rows, and reacting to
  prompts and the streamed reply:
  [turn-markers](mods/turn-markers.md)
  (`ui.render` on `UserMessage`,
  `AssistantMessage`, `ToolUse`; `prompt.submit`;
  `turn.step`).

1. create `mods/<name>/` with the files in
   [repo layout](repo-layout.md#a-mods-folder):
   `plugin.json` (with `license: "0BSD"` and
   `version: "0.1.0"`), `hooks/hooks.json`,
   `hooks/register.tsx`, `tests/`,
   `tsconfig.json`, `README.md`, and
   `types/index.d.ts` if the mod keeps state.[^layout]
2. if it uses shared code, create an empty
   `hooks/shared/` folder and run
   `node scripts/sync-shared.ts` (see
   [shared code](shared-code.md)). if it draws
   with the [palette](palette.md), add it to that
   doc's "who uses it".
3. add
   `{ "name": "<name>", "source": "./mods/<name>" }`
   to `plugins` in
   `.claude-plugin/marketplace.json`.[^marketplace]
4. add the mod to [the mods list](mods/index.md),
   with a doc for how it works inside.
5. copy an existing mod's
   `.claude-plugin/icon.png` (every mod uses the
   same one), before the mod is first published
   (see
   [versions and publishing](versions-and-publishing.md)).
6. run [the checks](before-committing.md).

[^layout]: layout: every existing mod has these
    files.

[^marketplace]: marketplace: each mod's entry in
    `plugins` has this shape.
