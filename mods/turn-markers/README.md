# turn-markers

busy claude code sessions bury the actual convo
under tool calls and all their output. this mod
puts a colored label above each prompt u type and
above the start of each claude reply, so u can
scroll back and spot where u asked something and
where claude answered ⋆｡°✩

```
 ▶ you      (dark text on blue, #a6dbff)
> your prompt

 ✻ claude   (dark text on pink, #ed8796)
● claude's reply
```

each label is a filled pill as wide as its text,
so it looks the same in a terminal of any width
and in the desktop app, on a light or dark theme.

when a reply opens with a tool call instead of
text, the claude label goes above that tool call,
so every reply's start gets marked either way hehe
tool calls, their output and thinking are
otherwise left untouched.

only ur own prompts get a label: typed at the
terminal, sent over remote control or the sdk,
pinged from slack, or sent by a plugin as ur own
words (like voice input). background task
notifications, scheduled prompts and messages from
other agents stay as they were.

## install

at the prompt of a claude code session:

```
/plugin install turn-markers --marketplace xdannyrobertsx/claude-code-mods
```

## customize

the glyphs, names and fill colors are the `YOU`
and `CLAUDE` constants at the top of
`hooks/register.tsx`, and `LABEL_TEXT_COLOR` is
the text drawn on the fill. the colors come from
the repo's palette in `shared/colors.ts` (copied
into `hooks/shared/`). a claude code theme key
(`suggestion`, `claude`, `success`, …) should work
too and follow ur light or dark theme, but that
hasn't been tried yet ^_^

## develop

`claude plugin test mods/turn-markers` runs the
tests in `tests/` ✦
