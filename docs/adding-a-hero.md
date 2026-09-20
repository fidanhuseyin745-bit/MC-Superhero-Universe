# Adding a hero

A hero is a data file. You will not touch the engine.

## 1. Create the hero directory

```
behavior_pack/scripts/heroes/my_hero/index.js
```

## 2. Write the definition

```js
import { defineHero, defineSuit } from '../../suits/define.js';

export const myHero = defineHero({
  id: 'my_hero',                       // lower_snake_case, must match the folder
  name: 'msu.hero.mine',               // localization key
  description: 'What this hero is about.',
  accent: '#5aaaff',
  suits: [
    defineSuit({
      id: 'mk1',
      name: 'msu.suit.mine.mk1',
      energy: { max: 110, regen: 1.8, regenDelay: 1.2, start: 1 },
      damage: 1,
      abilities: [
        'msu_ability:repulsor_beam',    // primary
        'msu_ability:shield_barrier',   // defense
        'msu_ability:flight_boost',     // utility
        'msu_ability:arc_reactor',      // ultimate
      ],
    }),
  ],
});

export const heroes = [myHero];
export default heroes;
```

### Rules the validator enforces

- **Exactly one ability per slot.** A suit may not list two `primary`
  abilities - the player only has one button per slot.
- **The lowest suit must have no `unlock`.** Otherwise a new player has nothing
  to wear.
- **Ability ids must exist** in the ability registry.
- **Energy ceilings must not shrink** as tiers increase.
- **Suit ids must be unique** within the hero.

Anything that breaks these is reported by `npm test` and by
`node tools/validate.mjs`, with the offending hero named.

## 3. Register it

Add an entry to the `sources` array in `behavior_pack/scripts/heroes/registry.js`:

```js
['mine', () => import('./my_hero/index.js')],
```

Registration is isolated: if your hero throws or references an unknown ability,
it is skipped and logged while the rest of the roster keeps working.

## 4. Add the names to the language file

Edit `resource_pack/texts/en_US.lang`:

```
msu.hero.mine=My Hero
msu.suit.mine.mk1=Mark 1
```

Then regenerate the script-side mirror:

```bash
node tools/gen-strings.mjs
```

Skipping that step fails validation on purpose - a missing translation should not
be discovered by a player reading `msu.hero.mine` in a menu.

## 5. Verify

```bash
npm run check
```

## Adding a new ability

If the shared library does not have what you need, add it to
`behavior_pack/scripts/abilities/library.js`:

```js
'msu_ability:my_blast': {
  name: 'My Blast',
  slot: 'primary',
  cooldown: 3,
  cost: 15,
  tags: ['ranged'],
  execute: (ctx) => {
    const target = resolveTarget(ctx.player, { strategy: 'look-then-nearest', range: 12 });
    if (target.kind !== TargetKind.ENTITY) {
      ctx.announce(t('msu.message.no_target'));
      return { hit: false };
    }
    applyDamage(target.entity, ctx.damage(6));
    burst(ctx.dimension, Particles.SPARK, target.entity.location, { count: 10, radius: 0.6 });
    return { hit: true };
  },
},
```

### What `execute` receives

| Field | Meaning |
|---|---|
| `ctx.player`, `ctx.dimension` | the caster |
| `ctx.session` | live session: profile, suit, energy pool |
| `ctx.ability`, `ctx.slot` | what fired |
| `ctx.tick` | engine tick at activation |
| `ctx.energy` | the energy pool (`spend`, `refund`, `restore`) |
| `ctx.damage(base)` | scales by suit tier and ability multiplier |
| `ctx.announce(message)` | localized chat message to the caster |
| `ctx.afterTicks(delay, fn)` | one-shot delayed work, player-safe |
| `ctx.repeat({times, interval, fn})` | channelled work, player-safe |

Return `{ hit: true }` when the ability connected, so the engine can log and
reward it. Return `false` from a `repeat` callback to stop early.

### Two things to get right

- **Never hold a player reference across ticks.** Use `afterTicks` / `repeat`;
  they re-validate before each call.
- **Scale particle counts.** Go through the vfx helpers that apply the adaptive
  quality tier rather than hard-coding a count, or the ability will cost frames
  on the phone it was designed for.

## Reusing an ability at a higher tier

Use `spec()` to derive a tuned copy rather than duplicating the body:

```js
register(spec('msu_ability:my_blast', {
  id: 'msu_ability:my_blast_ii',
  cooldown: 2,      // seconds
  cost: 20,
  effect: 1.6,      // multiplies ctx.damage()
  name: 'My Blast II',
}));
```

Then reference `msu_ability:my_blast_ii` from the upgraded suit.