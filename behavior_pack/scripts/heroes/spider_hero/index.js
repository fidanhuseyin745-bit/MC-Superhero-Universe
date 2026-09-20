/**
 * Spider hero: mobility and crowd control. Web, climb, swing, sense.
 *
 * Tier path: Web Suit -> Neon Suit. The Web Suit climbs walls and senses
 * incoming danger; the Neon Suit trades wall climbing for the web zip, which is
 * the traversal upgrade the tier is meant to feel like.
 */
import { defineHero, defineSuit } from '../../suits/define.js';

export const spiderHero = defineHero({
  id: 'spider_hero',
  name: 'msu.hero.spider',
  description: 'Web-slinging brawler built around traversal and crowd control.',
  accent: '#ff4d4d',
  powerItem: 'msu:hero_core',
  suits: [
    defineSuit({
      id: 'mk1',
      name: 'msu.suit.spider.mk1',
      accent: '#d94f4f',
      energy: { max: 110, regen: 1.6, regenDelay: 1.2 },
      damage: 1,
      abilities: ['msu_ability:web_shot', 'msu_ability:spider_sense', 'msu_ability:wall_climb', 'msu_ability:web_storm'],
    }),
    defineSuit({
      id: 'mk2',
      name: 'msu.suit.spider.mk2',
      accent: '#4dffd2',
      energy: { max: 140, regen: 2, regenDelay: 1 },
      damage: 1.3,
      unlock: { level: 4 },
      abilities: ['msu_ability:web_shot_ii', 'msu_ability:spider_sense', 'msu_ability:web_zip', 'msu_ability:web_storm'],
    }),
  ],
});

export const heroes = [spiderHero];
export default heroes;