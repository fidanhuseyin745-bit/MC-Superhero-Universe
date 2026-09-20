/**
 * Target resolution shared by every offensive and utility ability.
 *
 * Abilities never call the raw API to find targets; they describe what they
 * want and the selector applies the mobile safety rails (a hard scan radius and
 * a hard candidate ceiling) in one place.
 */
import { LIMITS } from '../core/constants.js';
import {
  blockFromViewDirection,
  entitiesFromViewDirection,
  getEntitiesInRange,
  isEntityUsable,
  isPlayerUsable,
} from '../core/api.js';
import { distance, fromRotation, offsetAlong } from '../core/vectors.js';

export const TargetKind = {
  ENTITY: 'entity',
  BLOCK: 'block',
  SELF: 'self',
  LOCATION: 'location',
  NONE: 'none',
};

const HOSTILE_FAMILIES = new Set(['monster', 'mob']);

function isCandidate(entity, player, options) {
  if (!isEntityUsable(entity)) return false;
  if (entity.id === player.id) return false;
  if (options.allowPlayers !== true && isPlayerUsable(entity)) return false;
  if (options.allowSelf && entity.id === player.id) return true;

  const typeId = entity.typeId ?? '';
  if (options.excludeFamilies?.some((family) => entity.matches?.({ families: [family] }))) return false;
  if (options.hostileOnly) {
    const family = entity.getComponent?.('minecraft:type_family');
    const families = family?.getTypeFamilies?.() ?? [];
    if (!families.some((name) => HOSTILE_FAMILIES.has(name))) return false;
  }
  if (options.excludeTypePrefix && typeId.startsWith(options.excludeTypePrefix)) return false;
  return true;
}

function scoreFor(entity, player, forward) {
  // Prefer what the player is facing over what is merely closest.
  const toTarget = {
    x: entity.location.x - player.location.x,
    y: entity.location.y - player.location.y,
    z: entity.location.z - player.location.z,
  };
  const range = Math.max(0.001, Math.hypot(toTarget.x, toTarget.y, toTarget.z));
  const facing = (forward.x * toTarget.x + forward.y * toTarget.y + forward.z * toTarget.z) / range;
  return facing * 2 - range / Math.max(1, LIMITS.maxScanRadius);
}

/**
 * @param {object} player
 * @param {object} [options]
 * @param {'look'|'nearest'|'self'|'none'} [options.strategy]
 * @param {number} [options.range] Search radius in blocks.
 * @param {boolean} [options.allowPlayers]
 * @param {boolean} [options.hostileOnly]
 * @returns {{kind: string, entity?: object, block?: object, location: object, distance: number}}
 */
export function resolveTarget(player, options = {}) {
  const strategy = options.strategy ?? 'look';
  const range = Math.min(options.range ?? 6, LIMITS.maxScanRadius);
  const forward = fromRotation(player.getRotation?.() ?? { x: 0, y: 0 });
  const self = { kind: TargetKind.SELF, entity: player, location: player.location, distance: 0 };

  if (strategy === 'none') return { kind: TargetKind.NONE, location: player.location, distance: Infinity };
  if (strategy === 'self') return self;

  if (strategy === 'look' || strategy === 'look-then-nearest') {
    // Ask the engine what is under the crosshair. Entities come back nearest
    // first, so the first candidate that passes the filters is the target.
    const looked = entitiesFromViewDirection(player, range);
    for (const candidate of looked) {
      if (!isCandidate(candidate, player, options)) continue;
      return {
        kind: TargetKind.ENTITY,
        entity: candidate,
        location: candidate.location,
        distance: distance(player.location, candidate.location),
      };
    }

    const block = blockFromViewDirection(player, range);
    if (block) {
      return {
        kind: TargetKind.BLOCK,
        block,
        location: block.location,
        distance: distance(player.location, block.location),
      };
    }

    if (strategy === 'look') return { kind: TargetKind.NONE, location: player.location, distance: Infinity };
  }

  const candidates = getEntitiesInRange(player.dimension, {
    location: player.location,
    maxDistance: range,
    closest: LIMITS.maxTrackedEntities,
  });

  let best;
  let bestScore = Number.NEGATIVE_INFINITY;
  for (const candidate of candidates) {
    if (!isCandidate(candidate, player, options)) continue;
    const score = scoreFor(candidate, player, forward);
    if (score > bestScore) {
      bestScore = score;
      best = candidate;
    }
  }

  if (!best) return { kind: TargetKind.NONE, location: player.location, distance: Infinity };
  return {
    kind: TargetKind.ENTITY,
    entity: best,
    location: best.location,
    distance: distance(player.location, best.location),
  };
}

/** Point a fixed distance in front of the player, used by travel and zones. */
export function forwardPoint(player, metres, verticalBias = 0) {
  const forward = fromRotation(player.getRotation?.() ?? { x: 0, y: 0 });
  return offsetAlong(player.location, forward, Math.min(metres, LIMITS.maxScanRadius), verticalBias);
}

/** Every valid entity around a point, capped for mobile safety. */
export function entitiesAround(source, radius, options = {}) {
  const capped = Math.min(radius, LIMITS.maxScanRadius);
  const dimension = source.dimension;
  const location = source.location;
  let candidates;
  try {
    candidates = getEntitiesInRange(dimension, {
      location,
      maxDistance: capped,
      excludeTypes: options.excludeTypes,
    });
  } catch {
    return [];
  }
  const results = [];
  for (const entity of candidates) {
    if (!isEntityUsable(entity)) continue;
    if (entity.id === source.id) continue;
    if (options.ignorePlayers !== false && isPlayerUsable(entity) && !options.includePlayers) continue;
    if (options.exclude?.includes(entity.id)) continue;
    if (options.filter && !options.filter(entity)) continue;
    results.push(entity);
    if (results.length >= (options.limit ?? LIMITS.maxTrackedEntities)) break;
  }
  return results;
}

/**
 * Applies damage to at most `LIMITS.maxTrackedEntities` targets in a radius and
 * returns how many took damage, so callers can report a hit count.
 */
export function damageAround(source, radius, amount, options = {}) {
  let hits = 0;
  for (const entity of entitiesAround(source, radius, options)) {
    try {
      entity.applyDamage(amount, options.source ? { cause: options.source } : undefined);
      hits += 1;
    } catch {
      // A target that died mid-loop is not an error.
    }
  }
  return hits;
}