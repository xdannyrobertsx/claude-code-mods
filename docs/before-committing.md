---
type: Playbook
title: before committing
description: the checks to run before committing a change to a mod or to shared code.
tags: [checks, ci, testing]
sources:
  - id: run
    resource: the commands below, run on both mods
    title: pre-commit checks
    last_modified: 2026-11-13T00:00:00Z
---

# before committing

run these from the repo root. every one passed on
both mods when this was written.[^run]

1. `node scripts/sync-shared.ts --check`: every
   mod's copy of `shared/` is current. ci runs
   this one too ([shared code](shared-code.md)).
2. `claude plugin validate .` for the marketplace,
   and `claude plugin validate mods/<name>` for
   each mod you touched. type errors show up here
   as warnings; fix them anyway.
3. `claude plugin test mods/<name>` for each mod
   you touched. after a change to `shared/`,
   that's every mod with a `hooks/shared/` folder.
4. check the version against the policy in
   [versions and publishing](versions-and-publishing.md).

`claude plugin validate` also reports the plugin
directory's own checks (license, icon). they don't
fail validation, but each mod should pass them
clean.

[^run]: run: all four steps run on scratchpad and
    turn-markers, all green.
