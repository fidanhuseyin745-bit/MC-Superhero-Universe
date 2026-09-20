/**
 * Translation lookup.
 *
 * The script runtime on a phone has no filesystem, so the language table is
 * bundled here as data and mirrored in `resource_pack/texts/en_US.lang`. Both
 * are generated from the same source and `npm run validate` fails if they drift,
 * which is what stops a raw `msu.message.foo` from ever appearing in chat.
 *
 * Lookup is a plain object access with no allocation on the hot path.
 */
import { STRINGS } from './strings.js';

const overrides = new Map();

/** Replaces `%1%`, `%2%`... with the supplied arguments. */
export function format(template, args = []) {
  let result = template;
  for (let i = 0; i < args.length; i += 1) {
    result = result.split(`%${i + 1}%`).join(String(args[i]));
  }
  return result;
}

/**
 * Resolves a localization key.
 * A missing key returns the key itself rather than throwing: a missing string
 * must never take down an ability mid-fight.
 */
export function t(key, ...args) {
  const value = overrides.get(key) ?? STRINGS[key] ?? key;
  return args.length > 0 ? format(value, args) : value;
}

export function hasTranslation(key) {
  return overrides.has(key) || Object.hasOwn(STRINGS, key);
}

export function translationCount() {
  return Object.keys(STRINGS).length;
}

/** Test and hot-reload hook. */
export function setTranslation(key, value) {
  overrides.set(key, value);
}

/** Every key the engine knows about; used by the validator. */
export function declaredKeys() {
  return Object.keys(STRINGS);
}

/**
 * Keys actually referenced by this module itself. Kept as a literal list so the
 * mirror check in `en_US.lang` is exact rather than a loose regex over the
 * source.
 */
export const USED_KEYS = [
  'msu.message.no_hero',
  'msu.message.energy',
  'msu.message.ability_locked',
  'msu.message.ability_used',
  'msu.message.energy_empty',
  'msu.message.suit_equipped',
  'msu.message.suit_locked',
  'msu.message.level_up',
  'msu.status.cooldown',
  'msu.status.ready',
  'msu.ui.stats.body',
];