---
type: Reference
title: versions and publishing
description: the version policy, the license, and what a mod's listing icon must be.
tags: [versions, license, publishing]
sources:
  - id: owner
    resource: the repo owner's decision; github repo visibility
    title: version policy
    last_modified: 2026-11-16T00:00:00Z
  - id: license
    resource: LICENSE; mods/*/.claude-plugin/plugin.json · license
    title: the license
    last_modified: 2026-11-13T00:00:00Z
  - id: validate
    resource: claude plugin validate, plugin directory checks (claude code 2.1.325)
    title: plugin directory checks
    last_modified: 2026-11-14T00:00:00Z
---

# versions and publishing

## versions

a mod stays at `0.1.0` until it's first published,
whatever changes. after that, bump `version` in
its `plugin.json` whenever its behaviour changes.[^owner]

"published" means other people can install the mod
from this repo's own marketplace
(`.claude-plugin/marketplace.json`). the repo is
public, so every mod listed there is published,
and every behaviour change gets a bump.[^owner] listing a
mod in anthropic's plugin directory is a separate,
later step, and isn't what starts the version
bumps.

## license

every mod is under 0bsd, copyright xdannyrobertsx:
anyone may use, change and share it for any
purpose, with no attribution required.[^license]
the text is in the root `LICENSE`. each mod's
`plugin.json` also names it (`"license": "0BSD"`),
because installing a mod copies only its folder
and a root `LICENSE` doesn't go with it.

## listing icon

the plugin directory wants an icon for each mod:[^validate]

- a square png, or a jpeg named by `icon` in
  `plugin.json`. svg and webp aren't accepted.
- 512 to 2048 px on each side, under 2 mb.
- at `.claude-plugin/icon.png`, where it's found
  without any `plugin.json` entry.
- the directory takes the icon only the first time
  a mod is saved or submitted in the developer
  portal; changing it later doesn't change the
  listing.

each mod has its own 512 px icon: flat shapes in
[palette](palette.md) colors on its `background`,
about 9 kb, to keep installs small.

[^owner]: owner: the repo owner set this policy on
    2026-11-13, said what "published" means on
    2026-11-14, and confirmed the repo officially
    public on 2026-11-16, when `gh repo view`
    showed it public.

[^license]: license: the root `LICENSE` text and
    the `license` field in both mods'
    `plugin.json`.

[^validate]: validate, as the validator described
    it.
