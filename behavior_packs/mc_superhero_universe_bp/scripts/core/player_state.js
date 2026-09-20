import { world } from '@minecraft/server';
import { getHero, getCostume } from '../data/registry.js';

const defaults = { heroId: 'skyforge', costumeId: 'skyforge.standard', energy: 100, level: 1, xp: 0, lastRegen: 0 };
function read(player, key, fallback) { const value = player.getDynamicProperty(`msu:${key}`); return value === undefined ? fallback : value; }
export function getState(player) { return { heroId: String(read(player, 'hero', defaults.heroId)), costumeId: String(read(player, 'costume', defaults.costumeId)), energy: Number(read(player, 'energy', defaults.energy)), level: Number(read(player, 'level', 1)), xp: Number(read(player, 'xp', 0)), lastRegen: Number(read(player, 'last_regen', 0)) }; }
export function saveState(player, state) { player.setDynamicProperty('msu:hero', state.heroId); player.setDynamicProperty('msu:costume', state.costumeId); player.setDynamicProperty('msu:energy', Math.max(0, state.energy)); player.setDynamicProperty('msu:level', state.level); player.setDynamicProperty('msu:xp', state.xp); player.setDynamicProperty('msu:last_regen', state.lastRegen); }
export function ensureState(player) { const state = getState(player); const hero = getHero(state.heroId) || getHero(defaults.heroId); if (!getHero(state.heroId)) state.heroId = hero.id; if (!getCostume(state.costumeId) || getCostume(state.costumeId).heroId !== state.heroId) state.costumeId = hero.costumeIds[0]; state.energy = Math.min(Math.max(0, state.energy), hero.maxEnergy); saveState(player, state); return state; }
export function setHero(player, heroId) { const hero = getHero(heroId); if (!hero) return false; const state = ensureState(player); state.heroId = hero.id; state.costumeId = hero.costumeIds[0]; state.energy = hero.maxEnergy; saveState(player, state); return true; }
export function setCostume(player, costumeId) { const costume = getCostume(costumeId); const state = ensureState(player); if (!costume || costume.heroId !== state.heroId) return false; state.costumeId = costume.id; saveState(player, state); return true; }
export function notify(player, message) { player.sendMessage(`§b[MSU]§r ${message}`); }
