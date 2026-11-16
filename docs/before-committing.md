---
type: Playbook
title: before committing
description: the checks to run before committing a change to a mod or to shared code, and how a change gets onto main.
tags: [checks, ci, testing]
sources:
  - id: run
    resource: the commands below, run on both mods
    title: pre-commit checks
    last_modified: 2026-11-13T00:00:00Z
  - id: ruleset
    resource: github · repo rulesets (`main`) and actions fork pr approval policy
    title: the main branch ruleset
    last_modified: 2026-11-16T00:00:00Z
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

## getting a change onto main

a github ruleset named `main` guards the default
branch:[^ruleset]

- every change lands through a pull request, the
  owner's included; nobody pushes to `main`
  directly.
- the `check` ci job (the shared-code check) must
  pass.
- a pr needs one approval from a code owner
  (`.github/CODEOWNERS`: the repo owner), with
  every review thread resolved. a push after the
  approval dismisses it.
- the owner can merge their own prs without an
  approval, since github doesn't let an author
  approve their own pr.
- `main` can't be force-pushed or deleted.

ci on a pr from a fork waits for the owner's
approval before it runs.[^ruleset]

[^ruleset]: ruleset: the repo's rulesets and
    actions settings, read with `gh api` on
    2026-11-16.

[^run]: run: all four steps run on scratchpad and
    turn-markers, all green.
