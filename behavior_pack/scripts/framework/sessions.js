/**
 * Per-player sessions.
 *
 * A session is the live state behind one player's hero: which hero and suit are
 * equipped, the energy pool, the resolved ability slots and the persisted
 * profile. Sessions are created on join, cached for the whole session, and torn
 * down on leave so nothing leaks between players or across a world reload.
 */
import { LIMITS } from '../core/constants.js';
import { createPool } from '../systems/energy.js';
import { clearOwner as clearCooldowns } from '../systems/cooldowns.js';
import { getHero } from '../heroes/registry.js';
import { findSuit, orderedSlots, starterSuit } from '../suits/define.js';
import { isSuitUnlocked, markSuitUnlocked } from '../progression/index.js';
import { getOption } from '../core/config.js';
import { logInfo, logWarn } from '../core/log.js';
import { isCreativeOrSpectator, isPlayerUsable, sendMessage } from '../core/api.js';
import { t } from './i18n.js';

/** Reads the live tick without importing the engine, avoiding a cycle. */
let tickSource = () => 0;

export function setTickSource(source) {
  tickSource = source;
}

function engineTickNow() {
  return tickSource();
}

export class Session {
  constructor(player, profile) {
    this.player = player;
    this.profile = profile;
    this.heroId = profile.get('hero');
    this.suitId = profile.get('suit');
    this.pool = undefined;
    this.slots = [];
    this.hudCache = '';
    this.equippedAtTick = 0;
    this.lastAbilityTick = -1;
    this.dirty = false;
    this.resolve();
  }

  get id() {
    return this.player.id;
  }

  get hero() {
    return this.heroId ? getHero(this.heroId) : undefined;
  }

  get suit() {
    return this.hero && this.suitId ? findSuit(this.hero, this.suitId) : undefined;
  }

  /** Recomputes suit, slots and energy pool from the profile. */
  resolve() {
    const hero = this.hero;
    if (!hero) {
      this.heroId = undefined;
      this.suitId = undefined;
      this.slots = [];
      this.pool = undefined;
      return false;
    }
    const suit = (this.suitId && findSuit(hero, this.suitId)) || starterSuit(hero);
    const changed = suit.id !== this.suitId;
    this.suitId = suit.id;
    this.slots = orderedSlots(suit);

    // Changing suit changes the pool size, so carry the charge ratio across
    // instead of silently resetting the player to full or empty.
    const previous = this.pool;
    this.pool = createPool(suit);
    const stored = this.profile.get('energy');
    if (previous) {
      this.pool.current = this.pool.max * previous.ratio;
    } else if (typeof stored === 'number' && stored > 0) {
      this.pool.current = Math.min(this.pool.max, stored);
    }
    this.lastRegenTick = engineTickNow();

    if (changed) this.equippedAtTick = 0;
    return true;
  }

  /** Assigns a hero, unlocks and equips its first suit. */
  selectHero(heroId) {
    const hero = getHero(heroId);
    if (!hero) return false;
    this.heroId = hero.id;
    this.profile.set('hero', hero.id);
    const starter = starterSuit(hero);
    markSuitUnlocked(this.profile, hero.id, starter.id);
    this.suitId = starter.id;
    this.profile.set('suit', starter.id);
    this.pool = undefined;
    this.resolve();
    this.dirty = true;
    return true;
  }

  equipSuit(suitId) {
    const hero = this.hero;
    if (!hero) return { ok: false, reason: 'no-hero' };
    const suit = findSuit(hero, suitId);
    if (!suit) return { ok: false, reason: 'unknown-suit' };
    const isFirst = starterSuit(hero).id === suit.id;
    if (!isSuitUnlocked(this.profile, hero.id, suit, { firstOfHero: isFirst })) {
      return { ok: false, reason: 'locked', suit };
    }
    markSuitUnlocked(this.profile, hero.id, suit.id);
    this.suitId = suit.id;
    this.profile.set('suit', suit.id);
    this.resolve();
    this.dirty = true;
    return { ok: true, suit };
  }

  /** Next unlocked suit, wrapping. Used by the sneak + power item shortcut. */
  cycleSuit(direction = 1) {
    const hero = this.hero;
    if (!hero) return undefined;
    const available = hero.suits.filter((suit, index) =>
      isSuitUnlocked(this.profile, hero.id, suit, { firstOfHero: index === 0 }),
    );
    if (available.length <= 1) return undefined;
    const current = available.findIndex((suit) => suit.id === this.suitId);
    const next = available[(current + direction + available.length) % available.length];
    this.equipSuit(next.id);
    return next;
  }

  abilityFor(slot) {
    return this.slots.find((entry) => entry.slot === slot);
  }

  /** Abilities in slot order, used by the HUD and the locker form. */
  abilityList() {
    return this.slots;
  }

  describe() {
    const hero = this.hero;
    const suit = this.suit;
    return {
      hero: hero?.id,
      heroName: hero ? t(hero.name) : undefined,
      suit: suit?.id,
      suitName: suit ? t(suit.name) : undefined,
      level: this.profile.get('level', 1),
      xp: this.profile.get('xp', 0),
      energy: this.pool?.describe(),
      slots: this.slots.map((entry) => ({ slot: entry.slot, ability: entry.ability.name })),
      creative: isCreativeOrSpectator(this.player),
    };
  }

  flush(force = false) {
    if (this.pool) this.profile.set('energy', this.pool.serialise());
    const written = this.profile.flush(force);
    if (written) this.dirty = false;
    return written;
  }

  /**
   * Advances this session's time-based state.
   *
   * Called from the per-tick pass rather than a HUD/passive callback so energy
   * regeneration stays smooth at 20Hz while the cost is a single multiply-add.
   */
  tick(engineTick) {
    if (!this.pool) return 0;
    let elapsed = engineTick - (this.lastRegenTick ?? engineTick);
    if (elapsed <= 0) {
      this.lastRegenTick = engineTick;
      return 0;
    }
    // A long stall (world load, dimension transfer) must not regenerate a full
    // pool in one step; 40 ticks is two seconds of grace.
    if (elapsed > 40) elapsed = 40;
    this.lastRegenTick = engineTick;
    return this.pool.tick(engineTick, elapsed);
  }
}

export class SessionManager {
  constructor(bus, store) {
    this.sessions = new Map();
    this.bus = bus;
    this.store = store;
  }

  get size() {
    return this.sessions.size;
  }

  get(player) {
    return player ? this.sessions.get(player.id) : undefined;
  }

  /** Creates the session on join, restoring the saved hero and suit. */
  join(player, profile) {
    if (!isPlayerUsable(player)) return undefined;
    if (this.sessions.size >= (getOption('maxActiveSessions') ?? LIMITS.maxActiveSessions)) {
      logWarn('sessions', 'session cap reached; not creating a new session');
      return undefined;
    }
    const existing = this.sessions.get(player.id);
    if (existing) {
      // Re-joining without a leave event (dimension transfer) reuses the session.
      existing.player = player;
      existing.resolve();
      return existing;
    }
    const session = new Session(player, profile);
    this.sessions.set(player.id, session);
    logInfo('sessions', `${player.name} joined with hero=${session.heroId ?? 'none'} suit=${session.suitId ?? 'none'}`);
    return session;
  }

  leave(playerId) {
    const session = this.sessions.get(playerId);
    if (!session) return false;
    try {
      session.flush(true);
    } catch (error) {
      logWarn('sessions', `could not flush profile for ${playerId}: ${error.message}`);
    }
    clearCooldowns(playerId);
    this.sessions.delete(playerId);
    // Drop the cached profile too, or a long-running server keeps one per player
    // that ever joined.
    this.store?.forget(playerId);
    return true;
  }

  *all() {
    yield* this.sessions.values();
  }

  /** Removes sessions whose player is no longer valid. */
  reap() {
    let removed = 0;
    for (const [id, session] of this.sessions) {
      if (!isPlayerUsable(session.player)) {
        this.leave(id);
        removed += 1;
      }
    }
    return removed;
  }

  flushAll(force = false) {
    let written = 0;
    for (const session of this.sessions.values()) {
      if (session.flush(force)) written += 1;
    }
    return written;
  }

  clear() {
    this.sessions.clear();
  }
}

export function notify(session, message) {
  if (session?.player) sendMessage(session.player, message);
}