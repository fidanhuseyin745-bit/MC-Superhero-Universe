/**
 * Minecraft script API compatibility layer.
 *
 * Nothing outside this file imports `@minecraft/server` directly. That gives
 * the engine exactly one place to absorb API drift: a method that is missing,
 * renamed or permission-limited in the player's Minecraft build is detected
 * here, reported once, and the calling system degrades instead of crashing.
 *
 * The target is the stable API track with no experiments required
 * (`@minecraft/server` 2.0.0, shipped in Minecraft 1.21.90).
 */
import * as mc from '@minecraft/server';
import { CAPABILITIES } from './constants.js';
import { MsuError, guard } from './errors.js';
import { logDebug, logWarn, warnThrottled } from './log.js';

const capabilityState = Object.fromEntries(CAPABILITIES.map((name) => [name, false]));
let probeUptime = 0;
const missingReported = new Set();

/** Every engine system reads live state from here; never cache `mc.*` itself. */
export const api = {
  server: mc,
  ready: false,
  version: mc.version ?? 'unknown',
  firstTick: undefined,
  supports: (capability) => capabilityState[capability] === true,
  capabilityState,
};

function methodOf(target, name) {
  return typeof target?.[name] === 'function' ? target[name].bind(target) : null;
}

function capability(target, name, key) {
  const known = typeof target?.[name] !== 'undefined';
  capabilityState[key ?? name] = known;
  if (!known) missingReported.add(key ?? name);
  return known;
}

function exploreCapabilities() {
  const { system, world } = mc;
  api.firstTick = system.currentTick;

  capability(mc, 'TicksPerSecond');
  capability(mc, 'world');
  capability(mc, 'system');
  capability(system, 'runInterval');
  capability(system, 'clearRun');
  capability(system, 'runJob');
  capability(system, 'waitTicks');
  capability(system, 'afterEvents');
  capability(system, 'beforeEvents');

  capability(world, 'afterEvents');
  capability(world.afterEvents, 'worldLoad', 'worldLoad');
  capability(world.afterEvents, 'playerSpawn', 'playerSpawn');
  capability(world.afterEvents, 'playerLeave', 'playerLeave');
  capability(world.afterEvents, 'entityHurt', 'entityHurt');
  capability(world.afterEvents, 'entityDie', 'entityDie');
  capability(world.afterEvents, 'scriptEventReceive', 'scriptEvents');
  capability(world.afterEvents, 'itemUse', 'itemUse');
  capability(world.afterEvents, 'worldInitialize', 'worldLoad');
  // Shutdown lives on the system channel in this API generation.
  capability(system.afterEvents, 'shutdown', 'shutdown');

  capability(world, 'getDynamicProperty');
  capability(world, 'setDynamicProperty');
  capability(world, 'sendMessage');
  capability(world, 'getPlayers');
  capability(world, 'getAllPlayers');

  const probePlayer = mc.Player?.prototype;
  if (probePlayer) {
    capabilityState.dynamicProperties =
      typeof probePlayer.getDynamicProperty === 'function' &&
      typeof probePlayer.setDynamicProperty === 'function';
    capabilityState.screenDisplay = typeof probePlayer.onScreenDisplay === 'object';
    capabilityState.inputPermissions = typeof probePlayer.inputPermissions === 'object';
    capabilityState.itemCooldown = typeof probePlayer.startItemCooldown === 'function';
    for (const key of ['dynamicProperties', 'screenDisplay', 'inputPermissions', 'itemCooldown']) {
      if (!capabilityState[key]) missingReported.add(key);
    }
  }

  api.ready = true;
}

/**
 * Runs the one-time capability probe. `worldLoad` is the earliest point at
 * which the world object is usable in both API generations.
 */
export function initialiseApi() {
  if (api.ready) return api;
  exploreCapabilities();
  logDebug('api', `@minecraft/server ${api.version}; missing: ${[...missingReported].join(', ') || 'none'}`);
  return api;
}

export function reportMissingCapabilities(scope, uptime = 0) {
  probeUptime = uptime || probeUptime;
  for (const key of missingReported) {
    warnThrottled(`cap:${key}`, scope, `"${key}" is unavailable in this Minecraft build; related features are disabled`, probeUptime, 1e9);
  }
}

/** Names of capabilities the running build does not provide. */
export function missingCapabilities() {
  return [...missingReported];
}

/**
 * Subscribes to a world or system event by dotted name, e.g.
 * `afterEvents.playerJoin` or `system.afterEvents.shutdown`. Returns a dispose
 * function, or undefined when the channel is unavailable in this build - callers
 * treat an absent channel as "feature off" rather than a crash.
 */
export function subscribe(path, handler) {
  const parts = String(path).split('.');
  const eventName = parts.pop();
  let node = mc;
  for (const part of parts) node = node?.[part];
  const signal = node?.[eventName] ?? node?.afterEvents?.[eventName];
  if (!signal || typeof signal.subscribe !== 'function') {
    warnThrottled(`sub:${path}`, 'api', `event "${path}" is unavailable; related features are disabled`, probeUptime, 1e9);
    return undefined;
  }
  try {
    return signal.subscribe(guard(`event:${path}`, handler));
  } catch (error) {
    logWarn('api', `could not subscribe to ${path}: ${error.message}`);
    return undefined;
  }
}

/* ------------------------------------------------------------------ *
 * Safe wrappers. Each returns `undefined`/`false` when unavailable so
 * callers branch on a value instead of wrapping everything in try/catch.
 * ------------------------------------------------------------------ */

export function isEntityUsable(entity) {
  if (!entity) return false;
  try {
    if (typeof entity.isValid === 'boolean' && !entity.isValid) return false;
    return typeof entity.id === 'string';
  } catch {
    return false;
  }
}

export function isPlayerUsable(player) {
  return isEntityUsable(player) && typeof player.onScreenDisplay === 'object';
}

export function requireEntity(entity, scope) {
  if (!isEntityUsable(entity)) throw new MsuError('STALE_ENTITY', `${scope}: entity is no longer valid`);
  return entity;
}

export function getGameMode(player) {
  try {
    return player.getGameMode?.();
  } catch {
    return undefined;
  }
}

export function isCreativeOrSpectator(player) {
  const mode = getGameMode(player);
  return mode === 'creative' || mode === 'spectator' || mode === 'Creative' || mode === 'Spectator';
}

export function sendMessage(player, message) {
  try {
    player.sendMessage(message);
    return true;
  } catch {
    return false;
  }
}

export function broadcast(message) {
  if (typeof mc.world.sendMessage !== 'function') return false;
  mc.world.sendMessage(message);
  return true;
}

export function getPlayers() {
  try {
    if (typeof mc.world.getAllPlayers === 'function') return mc.world.getAllPlayers();
    return mc.world.getPlayers();
  } catch {
    return [];
  }
}

export function playSound(location, dimension, soundId, options = {}) {
  try {
    dimension.playSound(soundId, location, options);
    return true;
  } catch {
    return false;
  }
}

export function spawnParticle(dimension, particleId, location, molang = undefined) {
  try {
    dimension.spawnParticle(particleId, location, molang);
    return true;
  } catch {
    return false;
  }
}

export function applyEffect(entity, effectType, duration, amplifier, showParticles = false) {
  try {
    entity.addEffect({ type: effectType, duration, amplifier, showParticles });
    return true;
  } catch {
    return false;
  }
}

export function applyDamage(entity, amount, source) {
  try {
    entity.applyDamage(amount, source ? { cause: source } : undefined);
    return true;
  } catch {
    return false;
  }
}

export function getRotation(entity) {
  try {
    const rotation = entity.getRotation?.();
    return rotation ? { x: rotation.x, y: rotation.y } : { x: 0, y: 0 };
  } catch {
    return { x: 0, y: 0 };
  }
}

export function getViewDirection(entity) {
  try {
    const direction = entity.getViewDirection?.() ?? entity.getDirection?.();
    return direction ? { x: direction.x, y: direction.y, z: direction.z } : { x: 0, y: 0, z: 1 };
  } catch {
    return { x: 0, y: 0, z: 1 };
  }
}

export function getVelocity(entity) {
  try {
    const velocity = entity.getVelocity?.();
    return velocity ? { x: velocity.x, y: velocity.y, z: velocity.z } : { x: 0, y: 0, z: 0 };
  } catch {
    return { x: 0, y: 0, z: 0 };
  }
}

export function setOnGround(entity, isOnGround) {
  if (typeof entity.setOnGround !== 'function') return false;
  try {
    entity.setOnGround(isOnGround);
    return true;
  } catch {
    return false;
  }
}

/**
 * Applies knockback along a horizontal direction.
 *
 * @param {object} entity
 * @param {{x:number,z:number}} directionXZ Normalised horizontal direction.
 * @param {number} strength Horizontal magnitude, blocks per tick.
 * @param {number} verticalStrength
 */
export function applyKnockback(entity, directionXZ, strength, verticalStrength) {
  if (typeof entity?.applyKnockback !== 'function') return false;
  try {
    entity.applyKnockback(
      { x: directionXZ.x * strength, z: directionXZ.z * strength },
      verticalStrength,
    );
    return true;
  } catch {
    try {
      // API 1.x signature, kept as a fallback for older engines.
      entity.applyKnockback(directionXZ.x, directionXZ.z, strength, verticalStrength);
      return true;
    } catch {
      return false;
    }
  }
}

export function setDynamicProperty(holder, key, value) {
  if (typeof holder?.setDynamicProperty !== 'function') return false;
  try {
    holder.setDynamicProperty(key, value);
    return true;
  } catch {
    return false;
  }
}

export function getDynamicProperty(holder, key) {
  if (typeof holder?.getDynamicProperty !== 'function') return undefined;
  try {
    return holder.getDynamicProperty(key);
  } catch {
    return undefined;
  }
}

export function replaceDynamicProperties(holder, entries) {
  const before = typeof holder?.getDynamicPropertyIds === 'function' ? holder.getDynamicPropertyIds() : [];
  for (const id of before) setDynamicProperty(holder, id, undefined);
  for (const [key, value] of entries) setDynamicProperty(holder, key, value);
}

export function getEntitiesInRange(dimension, location, options = {}) {
  try {
    if (typeof dimension.getEntities === 'function') return dimension.getEntities(options);
    return dimension.getEntities({ location, maxDistance: options.maxDistance ?? 8, ...options });
  } catch {
    return [];
  }
}

export function raycast(dimension, options) {
  if (methodOf(dimension, 'getBlockFromViewDirection') === null) return undefined;
  try {
    return dimension.getBlockFromViewDirection(options);
  } catch {
    return undefined;
  }
}

/**
 * Raycasts from an entity's eyes. Returns the hit block and entity when the
 * build supports it, otherwise `undefined` so targeting abilities can fall back
 * to a proximity search.
 */
export function raycastFromEntity(entity, maxDistance) {
  try {
    if (typeof entity.getBlockFromViewDirection !== 'function') return undefined;
    return entity.getBlockFromViewDirection({ maxDistance, includeLiquidBlocks: false });
  } catch {
    return undefined;
  }
}

/**
 * Entities along an entity's view direction, nearest first.
 *
 * This is the correct primitive for "what is the player looking at" - a
 * dimension-level raycast is cast from a fixed location and would report whatever
 * is nearest to the world origin rather than to the player's eyes.
 */
export function entitiesFromViewDirection(entity, maxDistance) {
  const dimension = entity?.dimension;
  if (!dimension || typeof dimension.getEntitiesFromViewDirection !== 'function') return [];
  const from = entity.location;
  try {
    // API 2.0.0 takes an options object; older builds took (location, distance).
    return dimension.getEntitiesFromViewDirection({ location: from, maxDistance }) ?? [];
  } catch {
    try {
      return dimension.getEntitiesFromViewDirection(from, maxDistance) ?? [];
    } catch {
      return [];
    }
  }
}

/** Block along an entity's view direction, or undefined. */
export function blockFromViewDirection(entity, maxDistance) {
  const hit = raycastFromEntity(entity, maxDistance);
  return hit?.block ?? undefined;
}

/** Nearest entity matching `options`, from `location`. Never throws. */
export function findNearestEntity(dimension, location, options = {}) {
  const searchOptions = { location, ...options };
  let candidates;
  try {
    candidates = dimension.getEntities(searchOptions);
  } catch {
    return undefined;
  }
  let best;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const candidate of candidates ?? []) {
    if (!isEntityUsable(candidate)) continue;
    if (options.exclude?.includes(candidate.id)) continue;
    const distance = Math.hypot(
      candidate.location.x - location.x,
      candidate.location.y - location.y,
      candidate.location.z - location.z,
    );
    if (distance < bestDistance) {
      bestDistance = distance;
      best = candidate;
    }
  }
  return best;
}

export function getBlock(dimension, location) {
  try {
    return dimension.getBlock(location);
  } catch {
    return undefined;
  }
}

export function spawnEntity(dimension, typeId, location, options = {}) {
  try {
    return dimension.spawnEntity(typeId, location, options);
  } catch (error) {
    logWarn('api', `spawnEntity(${typeId}) failed: ${error.message}`);
    return undefined;
  }
}

export function runInterval(handler, ticks) {
  if (typeof mc.system.runInterval !== 'function') return undefined;
  return mc.system.runInterval(handler, ticks);
}

export function clearInterval(handle) {
  if (handle === undefined || typeof mc.system.clearRun !== 'function') return false;
  try {
    mc.system.clearRun(handle);
    return true;
  } catch {
    return false;
  }
}

export function currentTick() {
  try {
    return mc.system.currentTick;
  } catch {
    return 0;
  }
}

/** Effect/particle/sound ids that a given build actually knows about. */
export function hasIdentifier(registry, value) {
  if (!registry?.get) return false;
  try {
    return Boolean(registry.get(value));
  } catch {
    return false;
  }
}

export const identifiers = {
  effects: () => mc.EffectTypes,
  particles: () => mc.ParticleTypes,
  sounds: () => mc.SoundTypes,
  items: () => mc.ItemTypes,
  camera: () => mc.CameraPresets,
};