# Roadmap

The engine is the foundation. Heroes are built on top of it, which is why the
ordering below puts engine work first.

## Done - v0.1.0 foundation

- [x] Registry-driven ability system (40 abilities, shared and reusable)
- [x] Suit/hero definitions with validation that names the offender
- [x] Tick loop with named cadences and an adaptive quality tier
- [x] Session lifecycle: join, cache, suit switching, leave, reaping, cap
- [x] Energy pools, cooldowns, XP, levels and suit unlocks
- [x] Targeting: view-direction raycast with proximity fallback
- [x] Persistence with corrupt- and oversized-profile recovery
- [x] Localization with a generated script-side mirror
- [x] server-ui forms: hero locker, suit selection, stats, settings
- [x] Five heroes: tech, spider, speed, thunder, cosmic
- [x] Dependency-free toolchain (validate, test, build) for Termux
- [x] 64 unit tests against a fake Minecraft API

## Next - content depth

- [ ] Custom hero models and animations in the resource pack
- [ ] Per-hero particle definitions instead of shared textures
- [ ] Sound set for ability activation and impacts
- [ ] More tiers per hero, extending the existing unlock curve
- [ ] Boss encounters that reward hero-specific progression

## Then - breadth

- [ ] Additional heroes (target: ten) proving the roster scales
- [ ] Team abilities: two heroes near each other unlock a combined effect
- [ ] PvP balance pass, with per-ability tuning separated from the library
- [ ] A shared suit beauty/wardrobe station block

## Deliberately not planned

- Beta or experimental script APIs. The addon must keep working in a world with
  experiments off; that constraint is worth more than any individual feature.
- A dependency-based build. Termux compatibility is a feature, not a limitation.
- A monolithic hero file. The moment a hero needs engine access, the answer is
  to extend the execution context, not to import the engine.

## How to pick up work

Every item above is additive: it should not require changing `core/`. If a task
appears to need an engine change, that is a signal the capability belongs in the
execution context (`framework/abilities.js#createContext`) instead, and the
change should be made once for all abilities rather than in one hero.