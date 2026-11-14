---
type: Playbook
title: installing and trying mods
description: install a mod from github or a local checkout, or run one live while you work on it.
tags: [install, setup]
sources:
  - id: github
    resource: /plugin install <mod> --marketplace xdannyrobertsx/claude-code-mods
    title: install from github, run by the repo owner
    last_modified: 2026-11-13T00:00:00Z
  - id: checkout
    resource: /plugin install <name> --marketplace /path/to/repo
    title: install from a checkout, run by the repo owner (date not given)
  - id: plugin-dir
    resource: claude --plugin-dir mods/scratchpad
    title: live session with hot reload, run by the repo owner
    last_modified: 2026-11-13T00:00:00Z
---

# installing and trying mods

## from github

at the prompt of a claude code session:

```
/plugin install <mod> --marketplace xdannyrobertsx/claude-code-mods
```

answer `y` to add the marketplace, then pick a
scope.[^github]

## from a local checkout

```
/plugin install <name> --marketplace /path/to/this/repo
```

the repo owner has installed this way and it
works.[^checkout]

## live, while working on a mod

```
claude --plugin-dir mods/<name>
```

starts a session with the mod loaded. it reloads
whenever the mod's files change, so edits show up
without a restart.[^plugin-dir] loading a mod this
way also writes its claude code types into
`mods/<name>/.claude-plugin/types/`.

if a hook seems not to fire, check
[mod api traps](mod-api-traps.md) first: some
events never reach a mod.

[^github]: github: the repo owner installed a mod
    this way on 2026-11-13.

[^checkout]: checkout: the repo owner says it
    works; they didn't say when they checked.

[^plugin-dir]: plugin-dir: the repo owner ran
    scratchpad this way and saw edits reload.
