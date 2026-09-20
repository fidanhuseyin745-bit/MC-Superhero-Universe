/**
 * Cooldown tracking keyed by `playerId:abilityId`.
 *
 * Cooldowns are stored as absolute ready-ticks rather than countdowns, so they
 * cost one subtraction to query and survive being checked on any interval.
 */

const readyAt = new Map();
const durations = new Map();

function key(ownerId, abilityId) {
  return `${ownerId}:${abilityId}`;
}

/** Registers the ability's base cooldown, used when starting one. */
export function declare(abilityId, ticks) {
  durations.set(abilityId, Math.max(0, Math.round(ticks)));
}

export function start(ownerId, abilityId, tick, ticksOverride) {
  const length = ticksOverride ?? durations.get(abilityId) ?? 0;
  if (length <= 0) return 0;
  readyAt.set(key(ownerId, abilityId), tick + length);
  return length;
}

export function remaining(ownerId, abilityId, tick) {
  const target = readyAt.get(key(ownerId, abilityId));
  if (target === undefined) return 0;
  const left = target - tick;
  if (left <= 0) {
    readyAt.delete(key(ownerId, abilityId));
    return 0;
  }
  return left;
}

export function isReady(ownerId, abilityId, tick) {
  return remaining(ownerId, abilityId, tick) === 0;
}

/** Shortens an active cooldown, optionally by a ratio (haste effects). */
export function reduce(ownerId, abilityId, tick, ticks, ratio = 1) {
  const current = readyAt.get(key(ownerId, abilityId));
  if (current === undefined) return 0;
  const next = Math.max(tick, current - Math.round(ticks * ratio));
  readyAt.set(key(ownerId, abilityId), next);
  const left = next - tick;
  if (left <= 0) readyAt.delete(key(ownerId, abilityId));
  return Math.max(0, left);
}

export function clear(ownerId, abilityId) {
  if (abilityId) return readyAt.delete(key(ownerId, abilityId));
  return clearOwner(ownerId);
}

/** Called on player leave - otherwise this map leaks one entry per ability. */
export function clearOwner(ownerId) {
  if (!ownerId) return 0;
  const prefix = `${ownerId}:`;
  let removed = 0;
  for (const stored of [...readyAt.keys()]) {
    if (stored.startsWith(prefix)) {
      readyAt.delete(stored);
      removed += 1;
    }
  }
  return removed;
}

export function size() {
  return readyAt.size;
}

export function describe(ownerId, tick) {
  const prefix = `${ownerId}:`;
  const result = {};
  for (const [stored, target] of readyAt) {
    if (!stored.startsWith(prefix)) continue;
    const left = target - tick;
    if (left > 0) result[stored.slice(prefix.length)] = left;
  }
  return result;
}

/** Drops finished entries. Called on the slow maintenance tick, never per tick. */
export function prune(tick) {
  let removed = 0;
  for (const [stored, target] of readyAt) {
    if (target <= tick) {
      readyAt.delete(stored);
      removed += 1;
    }
  }
  return removed;
}

export function reset() {
  readyAt.clear();
  durations.clear();
}