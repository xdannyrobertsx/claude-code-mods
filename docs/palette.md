---
type: Reference
title: palette
description: the shared colors, their roles, and when to use a claude code theme key instead.
tags: [colors, shared]
sources:
  - id: colors
    resource: shared/colors.ts · colors
    title: the palette
    last_modified: 2026-11-13T00:00:00Z
  - id: markers
    resource: mods/turn-markers/hooks/register.tsx · YOU, CLAUDE
    title: turn-markers' marker colors
    last_modified: 2026-11-13T00:00:00Z
---

# palette

`shared/colors.ts` exports `colors`: fixed hex values built for a dark background.[^colors] pass one anywhere a `color`, `borderColor` or `backgroundColor` prop takes a value, e.g. `<Text color={colors.gold}>`. to use it, opt the mod in to [shared code](shared-code.md) and import `./shared/colors`.

| key | hex | role |
| --- | --- | --- |
| `background` | `#14161b` | background |
| `foreground` | `#e0e2ea` | foreground |
| `foregroundDim` | `#eef1f8` | foreground (dim) |
| `gold` | `#ffcc00` | success, highlight, cursor |
| `red` | `#f54e5c` | error, critical, accent |
| `pink` | `#ed8796` | soft warning, git branch |
| `green` | `#a6da95` | ok, runtimes, git status |
| `sky` | `#91d7e3` | paths, navigation |
| `sapphire` | `#7dc4e4` | secondary accent, info |
| `blue` | `#a6dbff` | tertiary info |
| `selection` | `#4f5258` | selection, bright black |
| `nearBlack` | `#07080d` | near black |

## dark backgrounds only

the values don't change with claude code's light or dark theme, and most of them read poorly on a light one. where a color must follow the theme, use a claude code theme key (`suggestion`, `claude`, …) instead.

**Unconfirmed:** `foregroundDim` is brighter than `foreground`, the reverse of what its name says. it's copied as given; the owner hasn't said whether the two are swapped.

## who uses it

- turn-markers: `blue` for your prompts, `pink` for claude's replies.[^markers]
- scratchpad doesn't use it: its button icon is an emoji, which draws in its own colors.

[^colors]: colors: every key and value in the table is in `colors`.
[^markers]: markers: `YOU` uses `colors.blue`, `CLAUDE` uses `colors.pink`.
