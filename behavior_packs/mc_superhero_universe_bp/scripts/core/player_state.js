import { getHero, getCostume, getAbility } from '../data/registry.js';

const defaults = { heroId: 'iron_guard', costumeId: 'iron_guard.mark_1', energy: 100, level: 1, xp: 0, lastRegen: 0 };

function read(player, key, fallback) {
  const value = player.getDynamicProperty(`msu:${key}`);
  return value === undefined ? fallback : value;
}

export function getState(player) {
  const state = {
    heroId: String(read(player, 'hero', defaults.heroId)),
    costumeId: String(read(player, 'costume', defaults.costumeId)),
    energy: Number(read(player, 'energy', defaults.energy)),
    level: Number(read(player, 'level', defaults.level)),
    xp: Number(read(player, 'xp', defaults.xp)),
    lastRegen: Number(read(player, 'last_regen', defaults.lastRegen))
  };
  return state;
}

export function saveState(player, state) {
  const hero = getHero(state.heroId) || getHero(defaults.heroId);
  player.setDynamicProperty('msu:hero', state.heroId ?? hero.id);
  player.setDynamicProperty('msu:costume', state.costumeId ?? hero.costumeIds[0]);
  player.setDynamicProperty('msu:energy', Math.max(0, Number(state.energy ?? hero.maxEnergy)));
  player.setDynamicProperty('msu:level', Number(state.level ?? 1));
  player.setDynamicProperty('msu:xp', Number(state.xp ?? 0));
  player.setDynamicProperty('msu:last_regen', Number(state.lastRegen ?? 0));
}

export function ensureState(player) {
  const state = getState(player);
  const hero = getHero(state.heroId) || getHero(defaults.heroId);
  if (!getHero(state.heroId)) state.heroId = hero.id;
  if (!getCostume(state.costumeId) || getCostume(state.costumeId).heroId !== state.heroId) {
    state.costumeId = hero.costumeIds[0];
  }
  state.energy = Math.min(Math.max(0, state.energy), hero.maxEnergy);
  saveState(player, state);
  return state;
}

export function setHero(player, heroId) {
  const hero = getHero(heroId);
  if (!hero) return false;
  const state = ensureState(player);
  state.heroId = hero.id;
  state.costumeId = hero.costumeIds[0];
  state.energy = hero.maxEnergy;
  saveState(player, state);
  return true;
}

export function setCostume(player, costumeId) {
  const state = ensureState(player);
  const costume = getCostume(costumeId);
  if (!costume || costume.heroId !== state.heroId) return false;
  state.costumeId = costume.id;
  saveState(player, state);
  return true;
}

export function notify(player, message) {
  player.sendMessage(`§b[MSU]§r ${message}`);
}
