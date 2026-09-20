/**
 * Ability registry.
 *
 * An ability is pure data plus one `execute` function. Heroes reference
 * abilities by id, which means the same ability can be shared by several heroes
 * with different tuning, and a hero file never contains engine logic.
 *
 * The execution context handed to `execute` is the whole contract between
 * content and engine; adding engine reach means extending this object, not
 * importing more modules from a hero file.
 */
import { ABILITY_SLOTS } from '../core/constants.js';
import { ticksFromSeconds } from '../core/units.js';
import { assert } from '../core/errors.js';
import { declare as declareCooldown } from '../systems/cooldowns.js';
import { logWarn } from '../core/log.js';

const abilities = new Map();

/**
 * @param {object} definition
 * @param {string} definition.id Unique, namespaced (msu_ability:web_shot).
 * @param {string} definition.name Player-facing name.
 * @param {string} definition.slot One of ABILITY_SLOTS.
 * @param {number} [definition.cooldown] Seconds.
 * @param {number} [definition.cost] Energy cost.
 * @param {Function} definition.execute (context) => result
 * @param {object} [definition.unlock] { level, xp }
 * @param {object} [definition.tags]
 */
export function register(definition) {
  assert(definition?.id, 'ability.register requires an id');
  assert(typeof definition.execute === 'function', `ability "${definition.id}" needs an execute function`);
  if (!ABILITY_SLOTS.includes(definition.slot)) {
    throw new Error(`ability "${definition.id}" has invalid slot "${definition.slot}" (expected ${ABILITY_SLOTS.join(', ')})`);
  }

  const normalised = {
    cooldownTicks: ticksFromSeconds(definition.cooldown ?? 1),
    cost: definition.cost ?? 0,
    name: definition.id,
    ...definition,
    tags: definition.tags ?? [],
  };

  // Cooldowns live in one global table keyed by ability id; registering twice
  // (a hot reload) must not stack a second duration.
  declareCooldown(normalised.id, normalised.cooldownTicks);

  if (abilities.has(normalised.id)) logWarn('abilities', `"${normalised.id}" re-registered`);
  abilities.set(normalised.id, normalised);
  return normalised;
}

export function get(id) {
  return abilities.get(id);
}

export function has(id) {
  return abilities.has(id);
}

export function list() {
  return [...abilities.values()];
}

export function listBySlot(slot) {
  return list().filter((ability) => ability.slot === slot);
}

export function count() {
  return abilities.size;
}

export function clear() {
  abilities.clear();
}

/**
 * Resolves an ability by id and throws a readable error when a hero references
 * something that was never registered. Called at load time so a typo in a hero
 * file is a startup warning, not a crash the first time a player presses sneak.
 */
export function requireAbility(id, ownerLabel = 'unknown') {
  const ability = abilities.get(id);
  if (!ability) throw new Error(`${ownerLabel} references unregistered ability "${id}"`);
  return ability;
}

/** Validates every ability a hero declares. Returns the list of problems. */
export function validateReferences(hero) {
  const problems = [];
  const seen = new Set();
  for (const ability of hero.abilities ?? []) {
    const id = typeof ability === 'string' ? ability : ability.id;
    if (!id) {
      problems.push(`${hero.id}: a suit ability entry has no id`);
      continue;
    }
    if (!abilities.has(id)) problems.push(`${hero.id}: unknown ability "${id}"`);
    if (seen.has(id)) problems.push(`${hero.id}: duplicate ability "${id}"`);
    seen.add(id);
  }
  return problems;
}

