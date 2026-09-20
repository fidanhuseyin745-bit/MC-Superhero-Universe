/**
 * Suit and hero definitions.
 *
 * A hero is a list of suits ordered by tier. A suit is a list of ability ids
 * plus tuning values. Nothing here touches the Minecraft API - a hero file is
 * pure data, validated at load, so adding a hero can never compromise the
 * engine.
 *
 * This is the file to read before adding a hero, together with
 * docs/adding-a-hero.md.
 */
import { ABILITY_SLOTS } from '../core/constants.js';
import { assert } from '../core/errors.js';
import { requireAbility } from '../abilities/registry.js';

/**
 * @param {object} definition
 * @param {string} definition.id Suit id, unique inside the hero (mark1, mk2...).
 * @param {string} definition.name Localization key or plain string.
 * @param {string[]} definition.abilities Ability ids, in display order.
 * @param {object} [definition.energy] { max, regen, regenDelay, start }
 * @param {object} [definition.unlock] { level, xp }; omitted means open from the start of the tier.
 * @param {number} [definition.damage] Damage multiplier applied to ability damage.
 * @param {object} [definition.passive] Effects applied while the suit is worn.
 * @param {string} [definition.accent] Hex colour used by the HUD.
 */
export function defineSuit(definition) {
  assert(definition?.id, 'defineSuit requires an id');
  assert(definition.name, `suit "${definition.id}" requires a name`);
  assert(Array.isArray(definition.abilities) && definition.abilities.length > 0, `suit "${definition.id}" needs at least one ability`);

  const abilities = definition.abilities.map((entry) => (typeof entry === 'string' ? entry : entry.id));

  const suit = {
    energy: { max: 100, regen: 1, regenDelay: 1.5, start: 1, ...(definition.energy ?? {}) },
    damage: definition.damage ?? 1,
    unlock: definition.unlock,
    passive: definition.passive ?? {},
    accent: definition.accent,
    ...definition,
    abilities,
  };

  const slots = resolveSlots(suit);
  const duplicates = findDuplicateSlots(slots);
  assert(
    duplicates.length === 0,
    `suit "${definition.id}" has more than one ability in slot(s) ${duplicates.join(', ')}; a player can only trigger one ability per slot`,
  );

  return suit;
}

/** Maps ability ids onto their declared slot. Throws for unknown abilities. */
export function resolveSlots(suit) {
  return suit.abilities.map((id) => ({ id, slot: requireAbility(id, `suit "${suit.id}"`).slot }));
}

function findDuplicateSlots(slots) {
  const seen = new Set();
  const duplicates = new Set();
  for (const { slot } of slots) {
    if (seen.has(slot)) duplicates.add(slot);
    seen.add(slot);
  }
  return [...duplicates];
}

/**
 * @param {object} definition
 * @param {string} definition.id Unique, lower snake case (tech_hero).
 * @param {string} definition.name Display name or localization key.
 * @param {string} [definition.description]
 * @param {string} [definition.accent] Brand colour.
 * @param {object[]} definition.suits Ordered from lowest to highest tier.
 * @param {object[]} [definition.passives] Hero-wide effects, always active.
 */
export function defineHero(definition) {
  assert(definition?.id, 'defineHero requires an id');
  assert(Array.isArray(definition.suits) && definition.suits.length > 0, `hero "${definition.id}" needs at least one suit`);
  assert(/^[a-z][a-z0-9_]*$/.test(definition.id), `hero id "${definition.id}" must be lower_snake_case`);

  return {
    description: '',
    accent: '#5aaaff',
    passives: [],
    powerItem: 'msu:hero_core',
    ...definition,
  };
}

/** Every problem that would make this hero unusable at runtime. */
export function validateHero(hero) {
  const problems = [];
  const suitIds = new Set();
  for (const suit of hero.suits) {
    if (suitIds.has(suit.id)) problems.push(`${hero.id}: duplicate suit id "${suit.id}"`);
    suitIds.add(suit.id);
    try {
      resolveSlots(suit);
    } catch (error) {
      problems.push(error.message);
    }
    const duplicates = findDuplicateSlots(resolveSlotsSafe(suit));
    if (duplicates.length > 0) {
      problems.push(`${hero.id}/${suit.id}: conflicting slots ${duplicates.join(', ')}`);
    }
    if (suit.damage <= 0) problems.push(`${hero.id}/${suit.id}: damage multiplier must be positive`);
  }
  if (!hero.suits.some((suit) => !suit.unlock)) {
    problems.push(`${hero.id}: the lowest suit must be unlocked by default, otherwise a new player has nothing to wear`);
  }
  return problems;
}

function resolveSlotsSafe(suit) {
  const slots = [];
  for (const id of suit.abilities) {
    try {
      slots.push({ id, slot: requireAbility(id, suit.id).slot });
    } catch {
      // Reported by resolveSlots above; skip so duplicate detection still runs.
    }
  }
  return slots;
}

/** The suit a fresh player gets. */
export function starterSuit(hero) {
  return hero.suits.find((suit) => !suit.unlock) ?? hero.suits[0];
}

export function findSuit(hero, suitId) {
  return hero.suits.find((suit) => suit.id === suitId);
}

/** Slot order is fixed so the HUD never reshuffles between suits. */
export function orderedSlots(suit) {
  const bySlot = new Map(resolveSlots(suit).map((entry) => [entry.slot, entry.id]));
  return ABILITY_SLOTS.filter((slot) => bySlot.has(slot)).map((slot) => ({
    slot,
    abilityId: bySlot.get(slot),
    ability: requireAbility(bySlot.get(slot), suit.id),
  }));
}