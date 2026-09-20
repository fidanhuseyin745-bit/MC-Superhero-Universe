/**
 * Tech hero: powered armour built around repulsor technology.
 *
 * Tier path: Mark I -> Mark II -> Mark III. Later marks upgrade the primary
 * (twin repulsor blast), swap the defensive slot for micro-missiles and
 * replace the utility with nanite repair, so progression changes how the hero
 * plays rather than only its numbers.
 */
import { defineHero, defineSuit } from '../../suits/define.js';

export const techHero = defineHero({
  id: 'tech_hero',
  name: 'msu.hero.tech',
  description: 'Powered armour with repulsors, micro-missiles and a reactor overload.',
  accent: '#5ac8ff',
  powerItem: 'msu:hero_core',
  suits: [
    defineSuit({
      id: 'mark1',
      name: 'msu.suit.tech.mark1',
      accent: '#7a9bd4',
      energy: { max: 100, regen: 1.4, regenDelay: 1.5 },
      damage: 1,
      abilities: ['msu_ability:repulsor_beam', 'msu_ability:shield_barrier', 'msu_ability:flight_boost', 'msu_ability:arc_reactor'],
    }),
    defineSuit({
      id: 'mark2',
      name: 'msu.suit.tech.mark2',
      accent: '#5ac8ff',
      energy: { max: 130, regen: 1.7, regenDelay: 1.2 },
      damage: 1.25,
      unlock: { level: 3 },
      abilities: ['msu_ability:pulse_blast_ii', 'msu_ability:mark_ii_strike', 'msu_ability:flight_boost', 'msu_ability:arc_reactor'],
    }),
    defineSuit({
      id: 'mark3',
      name: 'msu.suit.tech.mark3',
      accent: '#ffd45a',
      energy: { max: 160, regen: 2, regenDelay: 1 },
      damage: 1.5,
      unlock: { level: 8 },
      abilities: ['msu_ability:pulse_blast_ii', 'msu_ability:mark_ii_strike', 'msu_ability:nanite_repair', 'msu_ability:arc_reactor'],
    }),
  ],
});

export const heroes = [techHero];
export default heroes;