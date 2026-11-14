# Claude Code Mods

A marketplace of Claude Code mods: plugins with a hooks module that change Claude Code's interface or behaviour.
Use the `plugin-authoring` skill for the mod API itself; this file is how this repo is laid out.

## Layout

Everything is TypeScript, scripts included. `scripts/*.ts` run directly on Node 23.6+ (`node scripts/<name>.ts`), with no package.json or build step.

- `mods/<name>/`: one mod, a self-contained plugin folder. Installing a mod copies only this folder.
  - `.claude-plugin/plugin.json`: name, version, description, author, and `types` if the mod keeps state.
  - `hooks/hooks.json` names the hooks module, `hooks/register.tsx`.
  - `types/index.d.ts`: the mod's `$.state` contract. It may export types and nothing else.
  - `tests/*.test.ts(x)`: run with `claude plugin test mods/<name>`.
  - `README.md`: what it does, install line, how to customize.
- `.claude-plugin/marketplace.json`: lists every mod (`"source": "./mods/<name>"`).
- `README.md`: the table of mods and the install line.
- `shared/`: code more than one mod can use, starting with the palette in `shared/colors.ts`. See below.

## A mod can't import outside its own folder

Claude Code refuses an import that leaves the mod's folder, and a symlink to a folder outside it doesn't resolve either.
So never `import` from `../../shared` or another mod.

## Shared code: edit `shared/`, then copy it in

- `shared/` is the only place to edit shared code.
- A mod opts in by having a `hooks/shared/` folder; `node scripts/sync-shared.ts` copies all of `shared/` into it. The mod imports it as `./shared/<file>`.
- Never edit a file under `mods/*/hooks/shared/`, even though nothing in it says so: the next sync overwrites it.
- After changing `shared/`, run `node scripts/sync-shared.ts`, then validate and test every mod that has a `hooks/shared/` folder.
- `node scripts/sync-shared.ts --check` exits 1 if any copy is stale or orphaned; CI runs it on every PR.
- Move code into `shared/` once a second mod needs it, not before.

## Colors

Draw with the palette in `shared/colors.ts` (`colors.gold`, `colors.sky`, …): opt the mod in to `hooks/shared/` and import `./shared/colors`.
The palette is fixed hex built for a dark background (`colors.background`), so it doesn't follow a light or dark theme and most of it reads poorly on a light one.
Use a Claude Code theme key (`suggestion`, `claude`, …) instead where a color must follow the theme.

## Claude Code's types are generated, never edited

Each mod's `.claude-plugin/types/` holds Claude Code's API types, written by Claude Code whenever it loads the mod and rewritten after an update.
They are gitignored: never commit or edit them. Each mod's `tsconfig.json` extends `./.claude-plugin/types/tsconfig.json`.
A mod that hasn't been loaded yet has no types folder; type-check it with the `tsconfig.json` in the header of the `plugin-authoring` skill's `types/claude-code.d.ts`, kept outside the repo.

## Before committing a change to a mod

1. `node scripts/sync-shared.ts --check`
2. `claude plugin validate .` (the marketplace) and `claude plugin validate mods/<name>`
3. `claude plugin test mods/<name>`
4. Bump `version` in the mod's `plugin.json` when its behaviour changes.

## Adding a mod

1. Create `mods/<name>/` as above; add `hooks/shared/` only if it uses shared code, then run the sync.
2. Add it to `.claude-plugin/marketplace.json` and to the table in `README.md`.

## Trying a mod locally

- `claude --plugin-dir mods/<name>` starts a session with the mod loaded; it reloads when its files change.
- Or install from this checkout: `/plugin install <name> --marketplace /path/to/this/repo`.

In `.claude/`, this file is committed; `settings.local.json` and `memory/` are this machine's and gitignored.
