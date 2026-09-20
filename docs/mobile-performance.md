# Mobile performance

The target device is an Android phone running Minecraft Bedrock. The engine is
shaped by that, not by what would be convenient on a desktop.

## The frame budget

Bedrock runs the script API on the main thread with a per-tick budget around
**12 ms** at 20 ticks/second. Miss it and the player feels it as stutter, not as
a dropped counter.

Rules that follow from this:

- **Energy regen is the only per-tick work per player.** One multiply-add. On a
  full server that is still single-digit microseconds.
- **Everything else runs on a divisor.** HUD text, passive effects, cooldown
  pruning, session reaping and profile flushing are all on named cadences in
  `core/engine.js` (`CADENCE`).
- **Entity scans are capped.** `LIMITS.maxScanRadius` and
  `LIMITS.maxTrackedEntities` bound every `entitiesAround` call.
- **Storage writes are batched.** Profiles are dirty-tracked and flushed on a
  cadence. Dynamic-property writes are the dominant cost when they happen.

## Adaptive quality

`core/config.js` samples how long each tick took and picks a tier. The tier is
read by `combat/vfx.js#density()`, which every particle burst is expected to go
through.

A tier below 1 means the engine is behind. The `SLOW_TICK` event fires so the
HUD or logs can surface it. If you are adding effects, scale them through
`density()` and the ability degrades gracefully on a weak device instead of
crashing the frame rate.

## Growing particle counts

The cheapest way to ruin mobile performance is a new ultimate that spawns 200
particles in a loop. If an ability needs a sustained effect:

- prefer `ctx.repeat` with a modest count per tick over one huge burst
- reuse an existing particle texture rather than adding a new one
- test on the `mobile` preset, which is the default for a reason

## Session growth

Long-running worlds accumulate sessions for players who have left. Two
mechanisms prevent a leak:

- `SessionManager.reap()` drops sessions whose player entity has gone invalid,
  on the maintenance cadence.
- On leave, the owner's cooldowns are cleared and the cached profile is
  forgotten.

`maxActiveSessions` is a hard cap so a misbehaving client cannot push the engine
past its memory budget.

## What the presets change

`core/config.js` `PRESETS` bundle the settings that actually differ on a phone:
particle scale, HUD cadence, whether abilities are announced in chat, and log
level. `mobile` is the default. A desktop or a private test world can opt into a
richer preset, but shipping defaults should always assume the phone.