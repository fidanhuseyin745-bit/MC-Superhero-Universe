# AGENTS.md

Repository-specific guidance for AI agents and contributors.

## What this project is

A modular Minecraft Bedrock superhero addon (behavior pack + resource pack),
designed to be developed from a phone via Termux. The headline constraint is
**modularity**: new heroes are added as content files, never by editing the
engine.

## Invariants - do not break these

1. **No experiments.** Only the stable script API. `@minecraft/server` and
   `@minecraft/server-ui` are pinned to `2.0.0`; `min_engine_version` is
   `1.21.90`.
2. **Content never imports the engine.** Hero and ability files receive an
   execution context (`ctx`). They do not import core modules.
3. **One ability per slot per suit.** Slots are `primary`, `defense`, `utility`,
   `ultimate`.
4. **The lowest suit of a hero must have no `unlock` requirement.**
5. **VFX counts go through the adaptive quality tier**, never hard-coded.
6. **No runtime dependencies.** Tooling uses Node built-ins only, so it runs on
   Termux with nothing installed.
7. **Never hold a player reference across ticks.** Use `ctx.afterTicks` /
   `ctx.repeat`, which re-validate the player.

## Commands

```bash
npm run validate   # manifests, UUIDs, script syntax, i18n parity
npm test           # unit tests against a fake Minecraft API
npm run build      # dist/*.mcpack and *.mcaddon
npm run check      # all three; run this before proposing any change
```

Always run `npm run check` after a change. Treat a failing check as work
unfinished, not as a warning.

## Map of the code

- `core/` - engine primitives. `engine.js` owns the tick loop; `config.js` owns
  quality tiers; `store.js` owns persistence; `api.js` wraps every Minecraft API
  call so failures return `undefined` instead of throwing.
- `framework/` - sessions, ability activation, commands, input, HUD, i18n.
  `abilities.js#activate` is the **single** path an ability is triggered from.
- `systems/` - energy pools, cooldowns.
- `combat/` - targeting, passives, rewards, vfx.
- `abilities/library.js` - the shared ability library (`DEFINITIONS`).
- `suits/define.js` - `defineHero` / `defineSuit` and `validateHero`.
- `heroes/registry.js` - loads the roster; `ensureContentReady()` guarantees
  abilities are registered before heroes validate.
- `progression/` - levels, XP, suit unlocks.
- `tools/` - validate, build, generators, test harness.

## Gotchas learned the hard way

- **Hero loading requires abilities first.** `loadBuiltinHeroes()` awaits
  `ensureContentReady()`. If you reorder content registration, keep that.
- **Hero modules export the same array as both `heroes` and `default`.** The
  loader dedupes by id; do not reintroduce double collection.
- **`en_US.lang` and `framework/strings.js` must stay in sync.** Edit the lang
  file, then run `node tools/gen-strings.mjs`. Validation fails otherwise.
- **`behavior_pack/scripts/package.json` is tooling-only.** It marks the script
  tree as ESM so Node can load the engine's files during tests. It is filtered
  out of packaged packs by `TOOLING_ONLY` in `tools/lib/repo.mjs`.
- **`npm test` generates `node_modules/@minecraft/server` itself.** The engine
  imports a bare specifier, so the fake package must exist on disk. Do not add a
  test hook that assumes otherwise.
- **The 5-tick double-trigger guard** in `activate` means a test firing an
  ability twice in a row is hitting the guard, not the cooldown. Set
  `session.lastAbilityTick = -1` to cross it.
- **Log lines during tests** (e.g. `tick work took ...ms`) are expected; the
  suite exercises contained-failure paths on purpose.

## Style

- ESM only. Named exports. Files are `lower_snake_case`.
- Comments explain *why*, never *what*. Do not narrate a diff.
- Keep the engine free of hero-specific knowledge.