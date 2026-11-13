# turn-markers

Verbose Claude Code sessions bury the conversation under tool calls and their output.
This mod draws a colored, full-width rule above each prompt you type and above the start of each Claude reply,
so you can scroll back and spot where you asked something and where Claude answered.

```
▶ you ────────────────────────────────────   (blue, follows your theme)
> your prompt

✻ claude ─────────────────────────────────   (Claude orange)
● Claude's reply
```

When a reply opens with a tool call instead of text, the claude rule goes above that tool call,
so the start of every reply is marked either way.
Tool calls, their output and thinking are otherwise untouched.

Only your own prompts are marked: typed at the terminal, sent over Remote Control or the SDK,
pinged from Slack, or submitted by a plugin as your own words (voice input, say).
Background task notifications, scheduled prompts and messages from other agents are left as they were.

## Install

At the prompt of a Claude Code session:

```
/plugin install turn-markers --marketplace xdannyrobertsx/claude-code-mods
```

## Customize

The glyphs, labels and colors are the `YOU` and `CLAUDE` constants at the top of `hooks/register.tsx`.
Colors take a Claude Code theme key (`suggestion`, `claude`, `success`, …) or a hex value like `#5fd7ff`.

## Develop

`claude plugin test mods/turn-markers` runs the tests in `tests/`.
