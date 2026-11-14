# scratchpad

hai! ✦ claude keeps a lil scratchpad folder for
each session, tucked away in `/tmp` where u never
see it. this mod adds a button above the prompt
that opens a sidebar showing that folder as a live
tree, so u can peek anytime hehe

```
📁 Scratchpad                    ┌ Scratchpad ──────────┐
                                 │ ▾ out/               │
                                 │     a.txt            │
                                 │   .env               │
                                 │   notes.md           │
                                 └──────────────────────┘
```

## what it does

- press the button to open or close the sidebar.
  its folder opens too (`📂`) while the sidebar's
  up
- folders go first and are bold, dotfiles are dim
- press a folder to collapse or expand it
- press a file to copy its full path ^_^
- while the sidebar's open, the tree refreshes
  every two seconds

no scratchpad in ur session, like in a `claude -p`
run? the sidebar just says
`Couldn't find this session's scratchpad.` and
that's okie

## install

at the prompt of a claude code session:

```
/plugin install scratchpad --marketplace xdannyrobertsx/claude-code-mods
```

## customize

it's all constants at the top of
`hooks/register.tsx`:

- `FOLDER_CLOSED` and `FOLDER_OPEN`: the button's
  icons
- `WIDTH_SHARE`: how much of the terminal's width
  the sidebar takes, `0.2` by default
- `REFRESH_MS`: how often the open sidebar rereads
  the folder
- `MAX_ENTRIES`: the most files and folders the
  tree will list

## how it finds the scratchpad

ok so, claude code tells its own hooks where the
scratchpad lives (`scratchpad_dir`), but a mod
can't read it ;_; the mod api doesn't hand over
the path, and claude code's security guard skips a
mod's classic hooks, which are the only events
that carry it. so the mod rebuilds the path from
claude code's folder layout and looks for it under
`/private/tmp` and `/tmp`:

```
<tmp>/claude-<uid>/<project path, non-alphanumerics as dashes>/<session id>/scratchpad
```

the project folder in that path is the one the
session *started* in, which can differ from the
current folder (say u changed directory, or a
spare folder got deleted). if the guess misses,
the mod looks for the session id under every
project folder instead.

if a claude code update ever moves the scratchpad,
the sidebar will say it couldn't find one. lmk if
that happens plz, tysm!

## develop

`claude plugin test mods/scratchpad` runs the
tests in `tests/` ✩
