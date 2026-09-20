/**
 * Fake Minecraft script API.
 *
 * This module *is* the stub package: `tools/test/gen-stubs.mjs` points
 * `node_modules/@minecraft/server` at it, so the engine imports real files from
 * disk and exercises its own code paths. Nothing here simulates engine
 * behaviour - it only provides the surface the engine calls, and records calls so
 * a test can assert on them.
 *
 * The engine reads `world` and `system` at import time, so `configure()` must run
 * before the engine is imported. Everything a test needs to change later (the
 * player list, spawned entities) is resolved through live state, not a copy.
 */
export const calls = {
  particles: [],
  sounds: [],
  effects: [],
  damage: [],
  messages: [],
  spawned: [],
  knockbacks: [],
  teleports: [],
};

export function resetCalls() {
  for (const key of Object.keys(calls)) calls[key].length = 0;
}

const state = {
  players: [],
  tick: 0,
  props: new Map(),
  subscribed: [],
  intervals: [],
};

export function configure(options = {}) {
  if (options.players) state.players = options.players;
  if (options.tick !== undefined) state.tick = options.tick;
  if (options.props) state.props = options.props;
  return state;
}

export function players() {
  return state.players;
}

export function props() {
  return state.props;
}

export function subscribed() {
  return state.subscribed;
}

/** Fires subscribed handlers for an event name. Returns how many ran. */
export function emitEvent(eventName, payload = {}) {
  let fired = 0;
  for (const entry of state.subscribed) {
    if (entry.event !== eventName) continue;
    entry.handler(payload);
    fired += 1;
  }
  return fired;
}

export function makeEntity(overrides = {}) {
  return {
    id: `e${Math.random().toString(36).slice(2, 8)}`,
    typeId: 'minecraft:zombie',
    name: 'zombie',
    isValid: true,
    location: { x: 0, y: 64, z: 0 },
    isSneaking: false,
    applyDamage(amount, source) {
      calls.damage.push({ entity: this.id, amount, source });
    },
    applyEffect(effect) {
      calls.effects.push({ entity: this.id, ...effect });
    },
    addEffect(effect) {
      calls.effects.push({ entity: this.id, ...effect });
    },
    getEffect() {
      return undefined;
    },
    removeEffect() {
      return true;
    },
    applyKnockback(x, y, z) {
      calls.knockbacks.push({ entity: this.id, x, y, z });
    },
    applyImpulse() {},
    teleport(location) {
      this.location = location;
      calls.teleports.push({ entity: this.id, location });
    },
    getRotation() {
      return { x: 0, y: 0 };
    },
    getViewDirection() {
      return { x: 0, y: 0, z: 1 };
    },
    getVelocity() {
      return { x: 0, y: 0, z: 0 };
    },
    sendMessage(message) {
      calls.messages.push({ entity: this.id, message });
    },
    getComponent() {
      return undefined;
    },
    matches() {
      return false;
    },
    getDynamicProperty(key) {
      return state.props.get(`${this.id}:${key}`);
    },
    setDynamicProperty(key, value) {
      state.props.set(`${this.id}:${key}`, value);
      return true;
    },
    getDynamicPropertyIds() {
      return [...state.props.keys()];
    },
    ...overrides,
  };
}

export function makeDimension(entities = []) {
  return {
    id: 'minecraft:overworld',
    /**
     * Honours the `{ location, maxDistance }` options the engine passes, so a
     * scan-radius assertion is meaningful rather than always returning everything.
     */
    getEntities(options = {}) {
      const { location, maxDistance } = options;
      if (!location || typeof maxDistance !== 'number') return entities;
      return entities.filter((entity) => {
        const at = entity.location;
        if (!at) return false;
        return Math.hypot(at.x - location.x, at.y - location.y, at.z - location.z) <= maxDistance;
      });
    },
    getEntitiesFromViewDirection() {
      return entities;
    },
    getEntitiesAtBlockLocation() {
      return entities;
    },
    spawnEntity(typeId, location) {
      calls.spawned.push({ typeId, location });
      return makeEntity({ location, dimension: this });
    },
    spawnParticle(particleId, location) {
      calls.particles.push({ particleId, location });
      return true;
    },
    playSound(soundId, location, options) {
      calls.sounds.push({ soundId, location, options });
      return true;
    },
    getBlock() {
      return undefined;
    },
    getBlockFromViewDirection() {
      return undefined;
    },
  };
}

export function makePlayer(overrides = {}) {
  const dimension = overrides.dimension ?? makeDimension();
  const player = makeEntity({ name: 'Tester', dimension, ...overrides });
  player.typeId = 'minecraft:player';
  player.dimension = dimension;
  player.permissionLevel = 'Member';
  // `isPlayerUsable` keys off the on-screen display surface, so only players get one.
  player.onScreenDisplay = { setActionBar() {} };
  return player;
}

/** Shared dynamic-property store so a test can read what the engine wrote. */
export function makePropertyStore() {
  const data = new Map();
  return {
    map: data,
    get: (key) => data.get(key),
    set: (key, value) => {
      data.set(key, value);
    },
    snapshot: () => Object.fromEntries(data),
    getDynamicProperty: (key) => data.get(key),
    setDynamicProperty: (key, value) => {
      if (value === undefined) data.delete(key);
      else data.set(key, value);
      return true;
    },
    getDynamicPropertyIds: () => [...data.keys()],
  };
}

export const system = {
  /**
   * `currentTick` must stay a getter: the engine caches the module namespace, so
   * a test that advances the clock has to be visible through the same binding.
   */
  get currentTick() {
    return state.tick;
  },
  advance(ticks = 1) {
    state.tick += ticks;
    return state.tick;
  },
  runInterval(callback, ticks) {
    const id = state.intervals.length + 1;
    state.intervals.push({ id, callback, ticks });
    return id;
  },
  runTimeout() {
    return 1;
  },
  clearRun() {
    return true;
  },
  runJob() {
    return 1;
  },
  waitTicks() {
    return Promise.resolve();
  },
  afterEvents: { shutdown: { subscribe: (handler) => subscribe('shutdown', handler) } },
  beforeEvents: {},
};

export const world = {
  getPlayers: () => state.players,
  getAllPlayers: () => state.players,
  sendMessage: () => true,
  getDynamicProperty: (key) => state.props.get(key),
  setDynamicProperty: (key, value) => {
    if (value === undefined) state.props.delete(key);
    else state.props.set(key, value);
    return true;
  },
  getDynamicPropertyIds: () => [...state.props.keys()],
  afterEvents: {
    worldLoad: { subscribe: (handler) => subscribe('worldLoad', handler) },
    worldInitialize: { subscribe: (handler) => subscribe('worldInitialize', handler) },
    playerJoin: { subscribe: (handler) => subscribe('playerJoin', handler) },
    playerLeave: { subscribe: (handler) => subscribe('playerLeave', handler) },
    playerSpawn: { subscribe: (handler) => subscribe('playerSpawn', handler) },
    entityHurt: { subscribe: (handler) => subscribe('entityHurt', handler) },
    entityDie: { subscribe: (handler) => subscribe('entityDie', handler) },
    entitySpawn: { subscribe: (handler) => subscribe('entitySpawn', handler) },
    itemUse: { subscribe: (handler) => subscribe('itemUse', handler) },
    scriptEventReceive: { subscribe: (handler) => subscribe('scriptEventReceive', handler) },
  },
  beforeEvents: {
    entityHurt: { subscribe: (handler) => subscribe('beforeEntityHurt', handler) },
    playerBreakBlock: { subscribe: (handler) => subscribe('beforePlayerBreakBlock', handler) },
  },
};

function subscribe(event, handler) {
  const entry = { event, handler };
  state.subscribed.push(entry);
  return () => {
    const index = state.subscribed.indexOf(entry);
    if (index >= 0) state.subscribed.splice(index, 1);
  };
}

export const version = '2.0.0-test';
export const TicksPerSecond = 20;
export const EffectTypes = { get: (id) => ({ id }) };
export const ParticleTypes = { get: (id) => ({ id }) };
export const SoundTypes = { get: (id) => ({ id }) };
export const ItemTypes = { get: (id) => ({ id }) };
export const CameraPresets = { get: (id) => ({ id }) };
export const EntityComponentTypes = { Health: 'minecraft:health' };
export const GameMode = { survival: 'survival', creative: 'creative' };
export const EntityDamageCause = { entityAttack: 'entityAttack', none: 'none' };
export const EquipmentSlot = { Mainhand: 'Mainhand', Head: 'Head' };
export class Player {}
export class Entity {}
export class ItemStack {}