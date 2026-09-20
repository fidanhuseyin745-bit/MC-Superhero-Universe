/**
 * Thunder hero: storm damage and area control.
 *
 * Tier path: Storm Suit -> Thunder Lord. The upgraded suit swaps the single
 * bolt for the chain lightning variant, which is the visible power spike of the
 * tier rather than a flat damage bump alone.
 */
import { defineHero, defineSuit } from '../../suits/define.js';

export const thunderHero = defineHero({
  id: 'thunder_hero',
  name: 'msu.hero.thunder',
  description: 'Storm caller: bolts, claps and a chained lightning ultimate.',
  accent: '#9a7dff',
  powerItem: 'msu:hero_core',
  suits: [
    defineSuit({
      id: 'mk1',
      name: 'msu.suit.thunder.mk1',
      accent: '#9a7dff',
      energy: { max: 120, regen: 1.5, regenDelay: 1.4 },
      damage: 1,
      abilities: ['msu_ability:lightning_bolt', 'msu_ability:thunder_clap', 'msu_ability:storm_aura', 'msu_ability:thunder_god'],
    }),
    defineSuit({
      id: 'mk2',
      name: 'msu.suit.thunder.mk2',
      accent: '#ffd1ff',
      energy: { max: 155, regen: 1.9, regenDelay: 1.1 },
      damage: 1.4,
      unlock: { level: 6 },
      abilities: ['msu_ability:chain_lightning', 'msu_ability:thunder_clap', 'msu_ability:storm_aura', 'msu_ability:thunder_god'],
    }),
  ],
});

export const heroes = [thunderHero];
export default heroes;