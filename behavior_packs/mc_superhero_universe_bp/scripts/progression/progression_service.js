import { world } from '@minecraft/server';
import { getHero, getAbility } from '../../data/registry.js';
import { getState, saveState, notify } from './player_state.js';

export function addXp(player, amount) { const state = getState(player); state.xp += amount; const needed = state.level * 100; if (state.xp >= needed) { state.xp -= needed; state.level += 1; notify(player, `Seviye ${state.level} oldun.`); } saveState(player, state); }
export function recordAbilityUse(player, abilityId) { addXp(player, 10); }
export function recordCombat(player, amount = 5) { addXp(player, amount); }
export function describeProgression(player) { const state = getState(player); const hero = getHero(state.heroId); return `Hero: ${hero.displayName} | Level: ${state.level} | XP: ${state.xp}/${state.level * 100} | Energy: ${Math.floor(state.energy)}/${hero.maxEnergy}`; }
