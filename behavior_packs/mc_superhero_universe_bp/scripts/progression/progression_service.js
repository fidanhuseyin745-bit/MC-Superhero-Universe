import { getHero, getCostume } from '../../data/registry.js';
import { getState, saveState, notify } from './player_state.js';

export function addXp(player, amount) {
  const state = getState(player);
  state.xp += amount;
  const target = state.level * 100;
  if (state.xp >= target) {
    state.xp -= target;
    state.level += 1;
    notify(player, `Seviye ${state.level} oldun.`);
  }
  saveState(player, state);
}

export function recordAbilityUse(player, abilityId) {
  addXp(player, 10);
  const ability = getAbility(abilityId);
  if (ability) notify(player, `${ability.displayName} kullanıldı.`);
}

export function recordCombat(player, amount = 5) {
  addXp(player, amount);
}

export function describeProgression(player) {
  const state = getState(player);
  const hero = getHero(state.heroId);
  const costume = getCostume(state.costumeId);
  return `Hero: ${hero.displayName} | Kostüm: ${costume.displayName} | Level: ${state.level} | XP: ${state.xp}/${state.level * 100} | Energy: ${Math.floor(state.energy)}/${hero.maxEnergy}`;
}
