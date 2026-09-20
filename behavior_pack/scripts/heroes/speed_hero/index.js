/**
 * Speed hero: momentum, dashing and time control.
 *
 * Tier path: Trail Suit -> Blur Suit. The base suit charges in with a flurry;
 * the upgraded suit trades the area flurry for a single devastating
 * speed-force punch and gains phase step for survivability.
 */
import { defineHero, defineSuit } from '../../suits/define.js';

export const speedHero = defineHero({
  id: 'speed_hero',
  name: 'msu.hero.speed',
  description: 'Acceleration specialist: dash, flurry and time dilation.',
  accent: '#ffd24d',
  powerItem: 'msu:hero_core',
  suits: [
    defineSuit({
      id: 'mk1',
      name: 'msu.suit.speed.mk1',
      accent: '#ffd24d',
      energy: { max: 120, regen: 2, regenDelay: 1 },
      damage: 1,
      abilities: ['msu_ability:speed_dash', 'msu_ability:speed_combat', 'msu_ability:speed_aura', 'msu_ability:time_dilation'],
    }),
    defineSuit({
      id: 'mk2',
      name: 'msu.suit.speed.mk2',
      accent: '#ff9a3d',
      energy: { max: 150, regen: 2.4, regenDelay: 0.8 },
      damage: 1.35,
      unlock: { level: 5 },
      abilities: ['msu_ability:speed_dash_ii', 'msu_ability:speed_force_punch', 'msu_ability:phase_step', 'msu_ability:time_dilation'],
    }),
  ],
});

export const heroes = [speedHero];
export default heroes;