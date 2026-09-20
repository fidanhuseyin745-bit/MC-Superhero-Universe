import { world } from '@minecraft/server';
import { getHero, getCostume } from '../../data/registry.js';
import { getState, saveState } from '../core/player_state.js';

const cooldowns = new Map();

export function tickEnergy() {
  const now = Date.now();
  for (const player of world.getPlayers()) {
    const state = getState(player);
    const hero = getHero(state.heroId);
    const costume = getCostume(state.costumeId);
    const regenRate = costume?.passive?.energyRegen ?? 1;
    const elapsed = state.lastRegen ? (now - state.lastRegen) / 1000 : 0;
    if (elapsed >= 1) {
      state.energy = Math.min(hero.maxEnergy, state.energy + elapsed * regenRate);
      state.lastRegen = now;
      saveState(player, state);
    }
  }
}

export function isCooling(player, abilityId) {
  return (cooldowns.get(`${player.id}:${abilityId}`) ?? 0) > Date.now();
}

export function startCooldown(player, abilityId, seconds) {
  cooldowns.set(`${player.id}:${abilityId}`, Date.now() + seconds * 1000);
}
