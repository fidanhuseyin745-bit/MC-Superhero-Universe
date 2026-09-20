/**
 * Engine-wide constants.
 *
 * Everything numeric that other modules need to agree on lives here so that
 * heroes stay declarative and never hard-code engine behaviour.
 */

export const PREFIX = 'msu';

/** Human-facing ability slots, in the order they appear in the suit locker. */
export const ABILITY_SLOTS = ['primary', 'defense', 'utility', 'ultimate'];

/** Tick budget. Bedrock runs the script runtime at a fixed 20 ticks per second. */
export const TICKS_PER_SECOND = 20;
export const TICKS_PER_MINUTE = TICKS_PER_SECOND * 60;
export const MS_PER_TICK = 1000 / TICKS_PER_SECOND;

/** The item that acts as the player's power trigger. */
export const POWER_ITEM = 'msu:hero_core';

/** Dynamic property keys. Keep the namespace so other addons cannot collide. */
export const STORE_KEYS = {
  player: 'msu:p',
  world: 'msu:w',
  schema: 'msu:schema',
};

/**
 * Current on-disk (dynamic property) schema. Bump this and add a migration in
 * `core/store.js` whenever the persisted shape changes.
 */
export const SCHEMA_VERSION = 1;

/**
 * Mobile safety rails. A Bedrock phone client shares one thread between the
 * script runtime and rendering, so every per-tick loop is capped and every
 * "scan the world" helper has a hard ceiling.
 */
export const LIMITS = {
  maxActiveSessions: 40,
  maxAbilitiesPerTick: 8,
  maxEffectsPerTick: 12,
  maxTrackedEntities: 48,
  maxScanRadius: 24,
  maxProjectileBatch: 16,
  maxSchedulerTasks: 96,
  maxPersistedBytes: 12 * 1024,
  /** Rolling average tick cost (ms) above which adaptive quality steps down. */
  tickBudgetMs: 6,
};

/** Default ability colours, used until a hero overrides them. */
export const DEFAULT_ACCENT = '#5aaaff';

export const CAPABILITIES = [
  'worldLoad',
  'shutdown',
  'scriptEvents',
  'itemUse',
  'entityHurt',
  'entityDie',
  'playerSpawn',
  'playerLeave',
  'dynamicProperties',
  'screenDisplay',
  'inputPermissions',
  'itemCooldown',
  'forms',
];