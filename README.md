# MC Superhero Universe

A modular superhero framework for **Minecraft Bedrock**, built to be developed
from a phone. Adding a hero means adding one file - never touching the engine.

## What this is

Most addons are one giant file per hero, which works until the second hero. This
repo instead separates *engine* from *content*:

- **Engine** (`scripts/core`, `scripts/framework`) - ticking, energy, cooldowns,
  persistence, targeting, UI. Written once, tested, and then left alone.
- **Content** (`scripts/abilities`, `scripts/heroes`, `scripts/suits`) - pure
  data. A hero file declares suits and ability ids. It contains no engine logic,
  which is why a bad hero can never break the roster.

The engine currently ships five heroes and 40 abilities, and the tests treat
"add a hero" as a supported operation rather than a code change.

## Requirements

| | |
|---|---|
| Minecraft Bedrock | 1.21.90 or newer |
| Experiments | **none** - this targets the stable script API |
| `@minecraft/server` | 2.0.0 (stable) |
| `@minecraft/server-ui` | 2.0.0 (stable) |
| Node.js (for tooling) | 18 or newer |

No `zip`, no ImageMagick, no npm dependencies. Everything in `tools/` uses Node
built-ins so it runs unchanged on Termux.

## Install on a phone

```bash
pkg install nodejs-lts git
git clone <your-fork-url> ~/MC-Superhero-Universe
cd ~/MC-Superhero-Universe
npm run check     # validate + test + build
```

Then copy `dist/*.mcaddon` into Minecraft, or open it directly from a file
manager. In-game, craft the **Hero Core** and use it to pick a hero.

## Commands

| Command | What it does |
|---|---|
| `npm run validate` | Structural check: manifests, UUIDs, script syntax, localization parity. |
| `npm test` | Unit tests against a fake Minecraft API. No game required. |
| `npm run build` | Packages `dist/*.mcpack` and `dist/*.mcaddon`. |
| `npm run check` | All three, in order. This is what CI runs. |

`npm test` generates fake `@minecraft/server` packages into `node_modules/` on
the fly, so the suite works on a fresh clone with nothing installed.

## Using it in game

1. Craft a **Hero Core** (see `behavior_pack/recipes/hero_core.json`).
2. Hold it and **use** it to open the hero locker and choose a hero.
3. Abilities bind to four slots: `primary`, `defense`, `utility`, `ultimate`.
4. **Sneak + use** the core cycles to your next unlocked suit.
5. Suits unlock through play; XP comes from using abilities and defeating mobs.

Difficulty, particle density, HUD cadence and log level are configurable. The
`mobile` preset is the default because the target device is a phone.

## Repository layout

```
behavior_pack/scripts/
├── core/         engine primitives: bus, scheduler, store, config, api wrappers
├── framework/    sessions, ability activation, commands, input, HUD, i18n
├── systems/      energy pools, cooldowns
├── combat/       targeting, passives, rewards, vfx
├── abilities/    the ability registry and the core library
├── suits/        suit/hero definitions and validation
├── heroes/       one directory per hero
├── progression/  levels, xp, suit unlocks
├── ui/           server-ui forms
└── main.js       entry point

resource_pack/    models, textures, particles, sounds, ui, texts
tools/            validate, build, test, generators
docs/             developer documentation
```

## A hero in one file

```js
import { defineHero, defineSuit } from '../../suits/define.js';

export const myHero = defineHero({
  id: 'my_hero',
  name: 'msu.hero.mine',
  suits: [
    defineSuit({
      id: 'mk1',
      name: 'msu.suit.mine.mk1',
      energy: { max: 110, regen: 1.8 },
      abilities: ['msu_ability:repulsor_beam', 'msu_ability:shield_barrier', 'msu_ability:flight_boost', 'msu_ability:arc_reactor'],
    }),
  ],
});

export const heroes = [myHero];
export default heroes;
```

Then register it in `behavior_pack/scripts/heroes/registry.js` and run
`npm run check`. A suit may only hold **one ability per slot** - the validator
enforces this, because a player can only trigger one ability per slot.

See `docs/adding-a-hero.md` for the full walkthrough, including adding a new
ability to the shared library.

## Documentation

- [`docs/architecture.md`](docs/architecture.md) - how the engine is put together
- [`docs/adding-a-hero.md`](docs/adding-a-hero.md) - add a hero end to end
- [`docs/testing.md`](docs/testing.md) - the test harness and how to extend it
- [`docs/mobile-performance.md`](docs/mobile-performance.md) - the phone frame budget
- [`docs/termux.md`](docs/termux.md) - the phone-only development workflow
- [`docs/roadmap.md`](docs/roadmap.md) - what is done and what is next

## License

MIT - see [`LICENSE`](LICENSE).