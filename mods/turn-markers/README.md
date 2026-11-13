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

Tool calls, their output and thinking are untouched.
Only prompts you typed (terminal, Remote Control, SDK) are marked;
background task notifications and messages from subagents are left as they were.

## Install

At the prompt of a Claude Code session:

```
/plugin install turn-markers --marketplace xdannyrobertsx/claude-code-mods
```

## Customize

The glyphs, labels and colors are the `YOU` and `CLAUDE` constants at the top of `hooks/register.tsx`.
Colors take a Claude Code theme key (`suggestion`, `claude`, `success`, …) or a hex value like `#5fd7ff`.
