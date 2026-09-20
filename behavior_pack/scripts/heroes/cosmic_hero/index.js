/**
 * Cosmic hero: gravity and energy projection, the highest tier of the roster.
 *
 * Tier path: Cosmic Shell -> Nova Shell. The upgraded shell keeps the nova but
 * gains cosmic armour and reality step, making it the most survivable hero in
 * exchange for the slowest recovery.
 */
import { defineHero, defineSuit } from '../../suits/define.js';

export const cosmicHero = defineHero({
  id: 'cosmic_hero',
  name: 'msu.hero.cosmic',
  description: 'Gravity and stellar energy: wells, flight, armour and novas.',
  accent: '#7dffb0',
  powerItem: 'msu:hero_core',
  suits: [
    defineSuit({
      id: 'mk1',
      name: 'msu.suit.cosmic.mk1',
      accent: '#7dffb0',
      energy: { max: 140, regen: 1.6, regenDelay: 1.3 },
      damage: 1.1,
      abilities: ['msu_ability:cosmic_ray', 'msu_ability:gravity_well', 'msu_ability:gravity_flight', 'msu_ability:nova_burst'],
    }),
    defineSuit({
      id: 'mk2',
      name: 'msu.suit.cosmic.mk2',
      accent: '#ffffff',
      energy: { max: 180, regen: 2.1, regenDelay: 1 },
      damage: 1.5,
      unlock: { level: 10 },
      abilities: ['msu_ability:cosmic_ray_ii', 'msu_ability:cosmic_armour', 'msu_ability:reality_step', 'msu_ability:nova_burst'],
    }),
  ],
});

export const heroes = [cosmicHero];
export default heroes;