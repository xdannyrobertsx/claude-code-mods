---
okf_version: "0.2"
---

# claude code mods

how this repo works and how to do things in it.
each mod's own `README.md` covers what the mod
does for whoever installs it; these docs cover the
rest.

## working on the repo

- [repo layout](repo-layout.md) — where everything
  in the repo lives, what's committed, and what's
  generated or machine-local.
- [shared code](shared-code.md) — why mods can't
  import each other's code, and how shared/ is
  copied into the mods that use it.
- [palette](palette.md) — the shared colors, their
  roles, and when to use a claude code theme key
  instead.
- [adding a mod](adding-a-mod.md) — the steps to
  create a new mod and list it in the marketplace.
- [installing and trying mods](installing-and-trying-mods.md)
  — install a mod from github or a local checkout,
  or run one live while you work on it.
- [before committing](before-committing.md) — the
  checks to run before committing a change to a
  mod or to shared code.
- [versions and publishing](versions-and-publishing.md)
  — the version policy, the license, and what a
  mod's listing icon must be.

## the mod api

- [mod api traps](mod-api-traps.md) — things about
  claude code's mod api that the docs don't say
  and that cost time to find out.

## mods

- [mods](mods/index.md) — what each mod is made of
  and how it works inside.
