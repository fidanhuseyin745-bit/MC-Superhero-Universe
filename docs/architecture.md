# Architecture

The engine is built around one rule: **content declares, the engine executes.**
Everything below follows from taking that seriously.

## Layers

```
main.js                 entry point; wires listeners and starts the tick loop
  └── framework/        sessions, commands, input, HUD, i18n, activation
        └── systems/    energy, cooldowns
        └── combat/     targeting, passives, rewards, vfx
        └── core/       bus, scheduler, store, config, api wrappers, units
  └── abilities/, suits/, heroes/, progression/   <- pure content
```

Imports only ever point downward. Content never imports the engine; it receives
an execution context and uses that. This is what makes a hero file safe to edit
over GitHub on a phone with no debugger.

## The tick

`core/engine.js` exposes `start()`, `stop()` and `tick()`. The driver is a
`system.runInterval` at one tick, and `tick()` is exported separately so tests
can drive the clock without the game running.

Work is split by cadence rather than run flat every tick:

| Cadence | Work | Why |
|---|---|---|
| every tick | session energy regen | needs to be smooth at 20 Hz |
| `CADENCE.hud` | action-bar refresh | text updates are expensive |
| `CADENCE.passives` | suit passive effects | effects last seconds, not ticks |
| `CADENCE.maintenance` | prune cooldowns, reap stale sessions | housekeeping |
| `CADENCE.flush` | write profiles to dynamic properties | storage I/O is the real cost |

Energy regen is one multiply-add per player per tick. Everything else is on a
divisor. On a phone, that difference is the frame budget.

A throwing tick is caught and logged rather than allowed to kill the interval -
an addon that silently stops looks identical to a crash, and is harder to debug.

## Quality tiers

`core/config.js` holds a quality controller that samples how long a tick takes
and picks an adaptive tier. The tier scales particle density (`combat/vfx.js`
`density()`) and can disable non-essential effects. This is why every burst of
particles goes through `density()` instead of using a raw count.

## Sessions

A `Session` binds a live player to a persisted profile. It is created on join,
cached for the session's lifetime, and torn down on leave, which clears that
owner's cooldowns and drops the cached profile.

The session owns: the resolved suit, its ordered ability slots, and the energy
pool. Suit changes carry the *energy ratio* across rather than the raw value, so
upgrading to a bigger pool does not feel like a downgrade.

`SessionManager` caps concurrent sessions and reaps sessions whose player entity
has gone invalid.

## Ability activation

`framework/abilities.js` `activate(engine, session, slot)` is the single path an
ability is ever triggered through. Order matters:

1. session exists, hero equipped
2. slot resolves to an ability
3. 5-tick double-trigger guard (one button press can surface as several events)
4. unlock requirement satisfied
5. cooldown ready
6. energy available - and **spent**
7. execute, bounded by try/catch

If `execute` throws, the cost is refunded and the cooldown is not started. A bug
in one ability can therefore never drain a player's pool or lock them out.

Delayed and repeated work must go through the context's `afterTicks` and
`repeat`, which re-check that the player is still valid before every call. A raw
`setTimeout` holding a player reference is how addons crash after a player logs
out.

## Targeting

`combat/targeting.js` resolves targets through `resolveTarget(player, options)`
with a named strategy. Raycasts come from the player's view direction and eyes,
not the dimension origin. When a raycast finds nothing, strategies like
`look-then-nearest` fall back to a proximity scan.

Scans are capped by `LIMITS.maxScanRadius` and `LIMITS.maxTrackedEntities` so a
crowded area cannot stall a mobile client.

## Persistence

`core/store.js` writes profiles into entity dynamic properties as compressed
JSON. Design constraints:

- A corrupt profile falls back to defaults instead of throwing.
- An over-large profile **drops optional stats** rather than losing the hero and
  suit. Losing a cosmetic counter is recoverable; losing a player's hero is not.
- Writes are dirty-tracked and flushed on a cadence, not on every change.

## Localization

`resource_pack/texts/en_US.lang` is the source of truth.
`tools/gen-strings.mjs` mirrors it into `behavior_pack/scripts/framework/strings.js`
for script-side lookups, and `tools/validate.mjs` fails if the two drift apart.
Editing one without regenerating the other is a build error, not a surprise in
game.

## Adding capability without adding risk

To give abilities new power, extend the **context object** built in
`createContext`, not the imports available to hero files. Every ability then gets
the new capability with the same guarantees, and content stays declarative.