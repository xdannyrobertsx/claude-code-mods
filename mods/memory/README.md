# memory

claude keeps memories for each project in
`~/.claude/projects/<project>/memory/`, where u
never see them.
this mod adds a button above the prompt that opens
a sidebar listing them, each with its description,
so u can see what claude remembers.

```
🧠 Memory                        ┌ Memory ──────────────────────┐
                                 │ MEMORY.md                    │
                                 │   the index                  │
                                 │ preferred-name               │
                                 │   call the user "danny"      │
                                 └──────────────────────────────┘
```

## what it does

- press the button to open or close the sidebar
- `MEMORY.md` goes first, then each memory by its
  frontmatter `name` (or its file name), with its
  `description` dim underneath
- press a memory to copy its file's full path
- while the sidebar's open, the list refreshes
  every two seconds, so a memory claude writes
  shows up right away

no memories for the project yet? the sidebar says
`No memories for this project yet.`

## install

at the prompt of a claude code session:

```
/plugin install memory --marketplace xdannyrobertsx/claude-code-mods
```

## customize

it's all constants at the top of
`hooks/register.tsx`:

- `ICON`: the button's icon
- `WIDTH_SHARE`: how much of the terminal's width
  the sidebar takes, `0.25` by default
- `REFRESH_MS`: how often the open sidebar rereads
  the folder

## how it finds the memory folder

once `MEMORY.md` exists, claude code loads it into
the session's context, and the mod asks the
session's context breakdown where it came from.
that's the exact folder, even a custom one.

before that, the mod rebuilds the default path
from `CLAUDE_CONFIG_DIR` (or `~/.claude`) and the
repository's main checkout (or the project folder,
outside git), so a subfolder or a worktree finds
the same memories:

```
<config dir>/projects/<main checkout path, non-alphanumerics as dashes>/memory
```

## develop

`claude plugin test mods/memory` runs the tests in
`tests/` ✩
