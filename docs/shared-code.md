---
type: Reference
title: shared code
description: why mods can't import each other's code, and how shared/ is copied into the mods that use it.
tags: [shared, sync, ci]
sources:
  - id: owner
    resource: checked by the repo owner
    title: import and symlink test (date not given)
  - id: sync
    resource: scripts/sync-shared.ts · optedIn loop
    title: the shared-code sync script
    last_modified: 2026-11-13T00:00:00Z
  - id: ci
    resource: .github/workflows/check-shared.yml
    title: shared code in sync workflow
    last_modified: 2026-11-13T00:00:00Z
---

# shared code

## the constraint

claude code refuses an import that leaves a mod's
folder, and a symlink to a folder outside it
doesn't resolve either.[^owner] so a mod never
imports from `../../shared` or from another mod.
code more than one mod needs is copied in instead.

## how it works

- `shared/` is the only place to edit shared code.
- a mod opts in by having a `hooks/shared/`
  folder. `node scripts/sync-shared.ts` copies
  every file under `shared/` into each opted-in
  mod's `hooks/shared/`, and deletes files there
  that have no source in `shared/`.[^sync]
- the mod imports a copy as `./shared/<file>`.
- never edit a file under `mods/*/hooks/shared/`:
  the next sync overwrites it, and nothing in the
  file says so.
- a mod that stops using shared code deletes its
  `hooks/shared/` folder.

## the check

`node scripts/sync-shared.ts --check` writes
nothing. it lists every copy that's missing or
different (`stale:`) and every file with no source
(`orphaned:`), and exits 1 if there are any.[^sync]
ci runs it on every pull request and every push to
`main`.[^ci]

after changing `shared/`: run the sync, then
validate and test every mod that has a
`hooks/shared/` folder (see
[before committing](before-committing.md)).

## what belongs in shared/

move code into `shared/` once a second mod needs
it, not before. today it holds the
[palette](palette.md).

[^owner]: owner, who tested both the import and
    the symlink.

[^sync]: sync: the loop over opted-in mods, and
    the `stale:` and `orphaned:` messages.

[^ci]: ci, the `on:` triggers; it ran green on
    pull request #1.
