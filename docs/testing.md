# Testing

```bash
npm test
```

That is the whole setup. There is no install step, no network access and no game
required.

## Why the stub is a real module on disk

The engine imports `@minecraft/server` as a bare specifier. Node's ESM loader
resolves those through `node_modules` and does not offer the hook that CommonJS'
`Module._load` does, so a test cannot simply intercept the import.

The suite therefore *writes* the fake packages to disk:

- `tools/test/gen-stubs.mjs` creates `node_modules/@minecraft/server` and
  `node_modules/@minecraft/server-ui` as tiny shims.
- `tools/test/mc-stub.mjs` is what those shims re-export.
- `tools/test/run.mjs` runs the generator first, so `npm test` works on a fresh
  clone.

`node_modules/` is gitignored. Generation is idempotent, which matters because
Termux users will run `npm test` far more often than they will reinstall
anything.

## The harness

`tools/test/harness.mjs` is a ~60-line runner: `describe`, `test`, `assert`,
`assertEqual`, `assertThrows`, `run`. It prints a per-suite result and a summary
line, and returns the failure count.

It is not a framework on purpose. Adding a dependency to a repo whose headline
feature is "works on a phone with nothing installed" would defeat the point.

## Driving the engine

`freshEngine()` in `unit.test.mjs` builds a complete, playable engine: a store,
a session manager, and one player with a hero equipped. From there a test can
call `activate()` and assert on what actually happened.

The controls you will reach for most:

| Need | How |
|---|---|
| advance the clock | `engine.tick += n`, or `engineModule.tick(engine)` for a full pass |
| run scheduled work | `engine.scheduler.advance({ tick, now })` |
| give a player a hero/suit | `session.selectHero(id)`, `session.equipSuit(id)` |
| bypass the double-press guard | set `session.lastAbilityTick = -1` |
| make a player leave | `player.isValid = false` then `engine.sessions.reap()` |
| see recorded effects | the exported `calls` object: particles, sounds, damage, effects |

`calls` records *that* the engine called the API, which is what
`core/api.js`'s test covers. Behavioural assertions are made against real engine
state - energy pools, cooldowns, profiles - not against the stub.

## What is covered

- ability registry integrity and rejection of malformed definitions
- every hero and suit validating, with no duplicate slots
- progression curves, level boundaries and unlock gating
- energy pooling: spend, refund, regen delay, clamping at both ends
- targeting: view-direction first, proximity fallback, self-exclusion, scan caps
- activation: cost deduction, cooldowns, unaffordable, unknown slot, throwing
  ability refunding its cost, and all four slots of every starting suit
- session lifecycle: cache reuse, leave-teardown, the session cap, suit locking
- the engine tick loop, reaping, and bounded regen after a long stall
- the scheduler's intervals, repeat counts and survival of a throwing task
- profile persistence, corrupt-profile fallback and oversized-profile trimming
- localization parity
- UI forms: cancellation, busy-retry, and the no-hero fallback

## Adding a test file

Create `tools/test/<name>.test.mjs`. `run.mjs` discovers it automatically and
runs it in its own process, so one suite's stub state cannot leak into another's
module cache.

Because `behavior_pack/scripts/package.json` marks the script tree as ESM, the
engine's own files load as ES modules under Node exactly as they do in Bedrock.
That file is tooling-only and is filtered out of the packaged packs.

## A note on the failing-looking output

`[msu][scheduler] tick work took ... (>12ms budget)` and similar lines during a
test run are the engine logging correctly, not failures. The suite deliberately
exercises paths that log warnings - a throwing ability, an unreachable spawn -
to prove they are contained rather than fatal.