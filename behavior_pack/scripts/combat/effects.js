/**
 * Status effect helpers.
 *
 * Ability definitions describe effects in level/seconds terms; Bedrock wants a
 * zero-based amplifier and a tick duration, and rejects effect ids the running
 * build does not registered. All three translations happen here so a typo in a
 * hero file degrades that one ability instead of throwing every tick.
 */
import { applyEffect, hasIdentifier, identifiers, isEntityUsable } from '../core/api.js';
import { amplifierFromLevel, ticksFromSeconds } from '../core/units.js';
import { logWarn } from '../core/log.js';

export const Effects = {
  SPEED: 'speed',
  SLOWNESS: 'slowness',
  HASTE: 'haste',
  MINING_FATIGUE: 'mining_fatigue',
  STRENGTH: 'strength',
  INSTANT_HEALTH: 'instant_health',
  INSTANT_DAMAGE: 'instant_damage',
  JUMP_BOOST: 'jump_boost',
  NAUSEA: 'nausea',
  REGENERATION: 'regeneration',
  RESISTANCE: 'resistance',
  FIRE_RESISTANCE: 'fire_resistance',
  WATER_BREATHING: 'water_breathing',
  INVISIBILITY: 'invisibility',
  BLINDNESS: 'blindness',
  NIGHT_VISION: 'night_vision',
  HUNGER: 'hunger',
  WEAKNESS: 'weakness',
  POISON: 'poison',
  WITHER: 'wither',
  HEALTH_BOOST: 'health_boost',
  ABSORPTION: 'absorption',
  SATURATION: 'saturation',
  LEVITATION: 'levitation',
  SLOW_FALLING: 'slow_falling',
  CONDUIT_POWER: 'conduit_power',
  DOLPHINS_GRACE: 'dolphins_grace',
  BAD_OMEN: 'bad_omen',
  HERO_OF_THE_VILLAGE: 'hero_of_the_village',
  DARKNESS: 'darkness',
};

const KNOWN = new Set(Object.values(Effects));

/**
 * @param {object} entity
 * @param {string} name Short name from `Effects`, or a full `minecraft:` id.
 * @param {number} seconds
 * @param {number} [level] 1 = level I.
 * @param {boolean} [showParticles]
 */
export function giveEffect(entity, name, seconds, level = 1, showParticles = false) {
  if (!isEntityUsable(entity)) return false;
  if (!KNOWN.has(name)) {
    logWarn('status', `unknown effect "${name}"`);
    return false;
  }
  const typeId = name.includes(':') ? name : `minecraft:${name}`;
  const registry = identifiers.effects();
  if (registry && !hasIdentifier(registry, typeId)) {
    logWarn('status', `effect ${typeId} is not available in this Minecraft build`);
    return false;
  }
  return applyEffect(entity, typeId, ticksFromSeconds(seconds), amplifierFromLevel(level), showParticles);
}

export function giveEffects(entity, definitions) {
  let applied = 0;
  for (const definition of definitions ?? []) {
    const [name, seconds, level] = definition;
    if (giveEffect(entity, name, seconds, level ?? 1)) applied += 1;
    if (applied >= 8) break; // keep status bursts bounded
  }
  return applied;
}

/** Removes an effect by short name. Returns false if it was not active. */
export function clearEffect(entity, name) {
  if (!isEntityUsable(entity) || typeof entity.removeEffect !== 'function') return false;
  const typeId = name.includes(':') ? name : `minecraft:${name}`;
  try {
    return entity.removeEffect(typeId);
  } catch {
    return false;
  }
}

/** Cheap "is this hero already buffed" check used to avoid re-applying. */
export function hasEffect(entity, name) {
  if (!isEntityUsable(entity) || typeof entity.getEffect !== 'function') return false;
  const typeId = name.includes(':') ? name : `minecraft:${name}`;
  try {
    return Boolean(entity.getEffect(typeId));
  } catch {
    return false;
  }
}