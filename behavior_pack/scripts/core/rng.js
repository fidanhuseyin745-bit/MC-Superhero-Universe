/**
 * Small deterministic PRNG.
 *
 * Abilities that scatter particles or roll a chance use a seeded generator so
 * that behaviour is reproducible in tests and identical across players with the
 * same seed, instead of depending on `Math.random`.
 */

const MASK = 0xffffffff;

export function hashString(value) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function createRng(seed = 1) {
  let state = (typeof seed === 'string' ? hashString(seed) : seed >>> 0) || 1;
  const next = () => {
    state = (state + 0x6d2b79f5) & MASK;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    /** Inclusive on both ends. */
    int(min, max) {
      if (max <= min) return min;
      return min + Math.floor(next() * (max - min + 1));
    },
    float(min, max) {
      return min + next() * (max - min);
    },
    pick(list) {
      if (!list || list.length === 0) return undefined;
      return list[Math.floor(next() * list.length)];
    },
    chance(probability) {
      return next() < probability;
    },
    signed() {
      return next() * 2 - 1;
    },
  };
}

/**
 * Stable per-entity generator. Seeding from the entity id plus the current
 * segment of time keeps visuals varied but reproducible within a tick.
 */
export function rngFor(entityId, salt = '') {
  return createRng(hashString(`${entityId}|${salt}`));
}