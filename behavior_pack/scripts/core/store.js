/**
 * Persistence built on Bedrock dynamic properties.
 *
 * Dynamic properties are string/boolean/number only and are capped per entity,
 * so player progress is written as one compact blob. Two details are
 * deliberate:
 *
 *   - progress is cached in memory and flushed on a dirty flag, because writing
 *     a dynamic property every time an ability fires is a measurable cost on a
 *     phone;
 *   - the blob carries a schema version and `migrate` upgrades older saves
 *     instead of discarding them. A player's progress must survive an addon
 *     update.
 */
import { LIMITS, SCHEMA_VERSION, STORE_KEYS } from './constants.js';
import { getDynamicProperty, replaceDynamicProperties, setDynamicProperty } from './api.js';
import { logDebug, logWarn } from './log.js';

/** Shape written by migrations for a fresh profile. */
export function emptyProfile() {
  return {
    v: SCHEMA_VERSION,
    hero: undefined,
    suit: undefined,
    energy: 0,
    level: 1,
    xp: 0,
    unlocks: {},
    settings: {},
    stats: { abilities: 0, defeated: 0, damageTaken: 0 },
  };
}

/** Reading a profile field that predates the current schema must not break. */
function normalise(raw) {
  if (raw === undefined || raw === null) return emptyProfile();
  if (typeof raw === 'string') {
    try {
      raw = JSON.parse(raw);
    } catch {
      logWarn('store', 'stored profile was not valid JSON; starting a fresh profile');
      return emptyProfile();
    }
  }
  if (typeof raw !== 'object') return emptyProfile();
  const base = emptyProfile();
  return {
    ...base,
    ...raw,
    v: SCHEMA_VERSION,
    unlocks: { ...(raw.unlocks ?? {}) },
    settings: { ...(raw.settings ?? {}) },
    stats: { ...base.stats, ...(raw.stats ?? {}) },
  };
}

/**
 * Version upgrades. Each entry takes a profile at version N and returns one at
 * version N+1. Adding a schema change means adding an entry here, never
 * breaking existing saves.
 */
const MIGRATIONS = [
  // v0 -> v1: the pre-schema prototype stored hero/suit under different names.
  (profile) => ({
    ...profile,
    hero: profile.hero ?? profile.heroId,
    suit: profile.suit ?? profile.suitId,
    energy: profile.energy ?? 0,
    v: 1,
  }),
];

export function migrate(profile) {
  let current = profile;
  let version = Number(current.v ?? 0);
  while (version < SCHEMA_VERSION) {
    const step = MIGRATIONS[version];
    if (!step) {
      logWarn('store', `no migration from schema ${version}; using defaults`);
      return emptyProfile();
    }
    current = step(current);
    version = Number(current.v ?? version + 1);
  }
  return current;
}

export class Profile {
  constructor(holder, key, profile) {
    this.holder = holder;
    this.key = key;
    this.data = profile;
    this.dirty = false;
  }

  static load(holder, key) {
    const stored = getDynamicProperty(holder, key);
    const profile = migrate(normalise(stored));
    return new Profile(holder, key, profile);
  }

  get(path, fallback = undefined) {
    const value = path.split('.').reduce((node, part) => (node == null ? undefined : node[part]), this.data);
    return value === undefined ? fallback : value;
  }

  set(path, value) {
    const parts = path.split('.');
    let node = this.data;
    for (const part of parts.slice(0, -1)) {
      if (typeof node[part] !== 'object' || node[part] === null) node[part] = {};
      node = node[part];
    }
    node[parts.at(-1)] = value;
    this.dirty = true;
    return this;
  }

  update(path, updater, fallback = undefined) {
    return this.set(path, updater(this.get(path, fallback)));
  }

  add(path, amount, fallback = 0) {
    return this.set(path, this.get(path, fallback) + amount);
  }

  /** Flush only when something changed. Returns true when bytes were written. */
  flush(force = false) {
    if (!this.dirty && !force) return false;
    let payload;
    try {
      payload = JSON.stringify(this.data);
    } catch (error) {
      logWarn('store', `profile could not be serialised: ${error.message}`);
      return false;
    }
    if (payload.length > LIMITS.maxPersistedBytes) {
      // Drop the optional stat block before giving up on persistence entirely.
      this.data.stats = { abilities: this.data.stats?.abilities ?? 0, defeated: 0, damageTaken: 0 };
      payload = JSON.stringify(this.data);
      if (payload.length > LIMITS.maxPersistedBytes) {
        logWarn('store', `profile exceeds ${LIMITS.maxPersistedBytes} bytes; not persisted`);
        return false;
      }
    }
    const written = setDynamicProperty(this.holder, this.key, payload);
    if (written) this.dirty = false;
    return written;
  }

  reset() {
    this.data = emptyProfile();
    this.dirty = true;
    return this.flush(true);
  }

  byteSize() {
    return JSON.stringify(this.data).length;
  }
}

export class Store {
  /** @param worldHolder Usually `world` from the server module; injectable for tests. */
  constructor(worldHolder) {
    this.worldHolder = worldHolder;
    this.worldProfile = undefined;
    this.flushedAt = 0;
    /** Live profiles, keyed by player id. See `profileFor`. */
    this.profiles = new Map();
  }

  loadWorld() {
    this.worldProfile = this.worldHolder
      ? Profile.load(this.worldHolder, STORE_KEYS.world)
      : undefined;
    return this.worldProfile;
  }

  player(player) {
    if (!player) return undefined;
    return Profile.load(player, STORE_KEYS.player);
  }

  /**
   * Cached profile for a player.
   *
   * Reading a dynamic property is a serialisation of the whole blob, so calling
   * `player()` once per ability activation or per HUD frame would decode the
   * profile dozens of times a second. One profile per player per session, flushed
   * on a slow interval, is the whole point of the store.
   */
  profileFor(player) {
    if (!player?.id) return undefined;
    const cached = this.profiles.get(player.id);
    if (cached) return cached;
    if (this.profiles.size >= LIMITS.maxActiveSessions * 2) {
      // Bound the map even if a leave event is missed for some player.
      const oldest = this.profiles.keys().next().value;
      this.profiles.delete(oldest);
    }
    const profile = Profile.load(player, STORE_KEYS.player);
    this.profiles.set(player.id, profile);
    return profile;
  }

  /** Called on player leave once the profile has been flushed. */
  forget(playerId) {
    return this.profiles.delete(playerId);
  }

  flushProfiles() {
    let written = 0;
    for (const profile of this.profiles.values()) {
      if (profile.flush()) written += 1;
    }
    return written;
  }

  /** Called on a slow interval; keeps per-tick writes out of the hot path. */
  flushWorld(uptime) {
    if (!this.worldProfile) return false;
    this.flushedAt = uptime;
    return this.worldProfile.flush();
  }
}

/** Writes the schema marker so future releases can detect old worlds. */
export function stampSchema(holder) {
  setDynamicProperty(holder, STORE_KEYS.schema, SCHEMA_VERSION);
  return SCHEMA_VERSION;
}

/** Removes every key this addon owns from a holder. Used by the reset command. */
export function wipeHolder(holder) {
  replaceDynamicProperties(holder, []);
  logDebug('store', 'holder wiped');
}