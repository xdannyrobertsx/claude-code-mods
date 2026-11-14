# working in claude-code-mods

this repo is a marketplace of claude code mods.
what's true about it lives in
[docs/](docs/index.md): read the index before
planning a change, and link to a doc instead of
restating it.

## how to work here

- use the `plugin-authoring` skill for the mod api
  itself. read
  [mod api traps](docs/mod-api-traps.md) before
  relying on an event: some never reach a mod.
- never edit `mods/*/hooks/shared/` (synced
  copies) or `mods/*/.claude-plugin/types/`
  (generated). edit `shared/`, then sync:
  [shared code](docs/shared-code.md).
- a mod can't import anything outside its own
  folder.
- run [the checks](docs/before-committing.md)
  before committing a change to a mod or to
  `shared/`, and follow the
  [version policy](docs/versions-and-publishing.md).
- check new hooks live with
  `claude --plugin-dir mods/<name>`
  ([installing and trying mods](docs/installing-and-trying-mods.md)).
  `claude plugin test` doesn't run everything a
  session does.
- when a change makes a doc wrong, fix the doc in
  the same change.

## code

code is clean when someone other than its author
can read and extend it.

- **general:** follow standard conventions. keep
  it simple. leave code cleaner than you found it.
  fix the root cause, not the symptom.
- **design:** configurable data at high levels.
  polymorphism over if/else or switch. separate
  multi-threading code. no over-configurability.
  dependency injection. law of demeter: know only
  direct dependencies.
- **understandability:** be consistent.
  explanatory variables. boundary conditions in
  one place. value objects over primitives. no
  logical dependency between methods. no negative
  conditionals.
- **names:** descriptive, unambiguous,
  meaningfully distinct, pronounceable,
  searchable. named constants, not magic numbers.
  no encodings.
- **functions:** small, one thing, descriptive
  names, few arguments, no side effects, no flag
  arguments.
- **structure:** related code vertically dense,
  concepts separated vertically. variables near
  their use. dependent and similar functions
  close, callers above callees. short lines, no
  horizontal alignment, unbroken indentation.
- **objects and data:** hide internal structure.
  prefer data structures; no half-object,
  half-data hybrids. small, one job, few instance
  variables. a base class knows nothing of its
  derivatives. many functions over passing code in
  to pick a behavior. non-static over static
  methods.
- **smells to avoid:** rigidity, fragility,
  immobility, needless complexity, needless
  repetition, opacity.

### comments

in `mods/` (code, types and tests), write a
comment only where the code is complex enough to
need one: intent a name can't carry, a non-obvious
coupling between hooks, a warning of consequences.
try a better name or an extracted function first.
never redundant, never noise, no closing-brace
comments, no commented-out code. `shared/` may
keep its comments.

### tests

- one assert per test; readable, fast,
  independent, repeatable.
- a test must fail when the code is wrong: break
  the code once on purpose, and if the test stays
  green it proves nothing.
- no trivial passes: no asserts on values a mock
  returns, no asserts in loops that can run zero
  times, not only `0`, `[]` or `null` as inputs.
- test outside the valid inputs: bad input should
  fail loudly, not return a filler.
- assert intent, not current behavior: the asserts
  read as a spec.
- agree on test names and asserts before the
  implementation.

