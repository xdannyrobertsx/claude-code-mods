---
type: Reference
title: repo layout
description: where everything in the repo lives, what's committed, and what's generated or machine-local.
tags: [layout, setup]
sources:
  - id: tree
    resource: repo root · git ls-files
    title: the tracked files
    last_modified: 2026-11-13T00:00:00Z
  - id: gitignore
    resource: .gitignore
    title: ignore rules
    last_modified: 2026-11-13T00:00:00Z
  - id: sync
    resource: scripts/sync-shared.ts · header
    title: the shared-code sync script
    last_modified: 2026-11-13T00:00:00Z
---

# repo layout

this repo is a claude code marketplace of mods: plugins with a hooks module that change claude code's interface or behaviour.[^tree]

```text
.claude-plugin/marketplace.json   the marketplace; lists every mod
mods/<name>/                      one mod, a self-contained plugin folder
shared/                           code more than one mod uses
scripts/sync-shared.ts            copies shared/ into the mods that use it
.github/workflows/                ci: the shared-code check
docs/                             this bundle
AGENTS.md, CLAUDE.md              instructions for agents working here
LICENSE                           0bsd
```

## a mod's folder

installing a mod copies only its folder, so the folder holds everything the mod needs. it can't import anything outside itself: see [shared code](shared-code.md).

- `.claude-plugin/plugin.json`: `name`, `version`, `description`, `author` (`{ "name": "danny roberts" }`), `license`, and `types` (`"./types/index.d.ts"`) when the mod keeps state.
- `.claude-plugin/icon.png`: the listing icon, see [versions and publishing](versions-and-publishing.md).
- `hooks/hooks.json`: names the hooks module: `{ "modules": ["./register.tsx"] }`.
- `hooks/register.tsx`: the hooks module.
- `hooks/shared/`: a synced copy of `shared/`, only in mods that use shared code. never edit it.
- `types/index.d.ts`: the mod's `$.state` contract. it may export types and nothing else.
- `tests/*.test.ts(x)`: run with `claude plugin test mods/<name>`.
- `tsconfig.json`: extends `./.claude-plugin/types/tsconfig.json`.
- `README.md`: what the mod does, its install line, how to customize it. it ships with the mod.

## typescript with no build step

everything is typescript, scripts included. `scripts/*.ts` run directly on node 23.6 or newer (`node scripts/<name>.ts`); there's no `package.json` and no build.[^sync] ci runs node 24.

## generated and machine-local files

- `mods/*/.claude-plugin/types/`: claude code's api types, written by claude code whenever it loads the mod and rewritten after an update. gitignored: never edit or commit them.[^gitignore]
- a mod that hasn't been loaded yet has no types folder. type-check it with the `tsconfig.json` in the header of the `plugin-authoring` skill's `types/claude-code.d.ts` (the skill prints that file's path when it loads). put that `tsconfig.json` in a folder outside the repo, with its `include` naming the types file and the mod's `hooks/`. or load the mod once with `--plugin-dir`, which writes the types folder.
- `.claude/settings.local.json` and `.claude/memory/` belong to one machine and are gitignored.[^gitignore]

[^tree]: tree: the files in the repo, listed with `git ls-files`, plus this bundle and the agent instructions.
[^sync]: sync: the script's header comment says node 23.6; there's no `package.json`.
[^gitignore]: gitignore: both rules are in `.gitignore`.
