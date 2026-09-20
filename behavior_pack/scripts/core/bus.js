/**
 * Typed event bus, used for events the engine raises itself and for subscribing
 * to Minecraft events uniformly.
 *
 * Two guarantees matter here:
 *   - a failing handler is isolated and logged, never propagated into the tick
 *   - snapshots are never mutated while a dispatch is in progress, because a
 *     handler may subscribe or unsubscribe during the same event
 */
import { guard } from './errors.js';
import { logDebug } from './log.js';

const listeners = new Map();
const stats = { emitted: 0, handled: 0, failed: 0 };

export const Events = {
  READY: 'engine:ready',
  HERO_SELECTED: 'hero:selected',
  HERO_EQUIPPED: 'hero:equipped',
  SUIT_EQUIPPED: 'suit:equipped',
  ABILITY_USED: 'ability:used',
  ABILITY_READY: 'ability:ready',
  ENERGY_CHANGED: 'energy:changed',
  ENERGY_EMPTY: 'energy:empty',
  XP_GAINED: 'progress:xp',
  LEVEL_UP: 'progress:level',
  DAMAGE_TAKEN: 'combat:damage',
  ENTITY_DEFEATED: 'combat:defeat',
  TICK: 'engine:tick',
  SLOW_TICK: 'engine:slowTick',
  RELOADED: 'engine:reloaded',
};

/** DI token a hero's `install` receives so it can subscribe without importing. */
export class EventBus {
  on(event, handler, options = {}) {
    if (typeof handler !== 'function') throw new TypeError('bus.on expects a function');
    if (!listeners.has(event)) listeners.set(event, new Set());
    const wrapped = options.label ? guard(options.label, handler) : guard(`bus:${event}`, handler);
    listeners.get(event).add(wrapped);
    return () => this.off(event, wrapped);
  }

  off(event, handler) {
    const set = listeners.get(event);
    if (!set) return false;
    const removed = set.delete(handler);
    if (set.size === 0) listeners.delete(event);
    return removed;
  }

  once(event, handler, options) {
    const dispose = this.on(
      event,
      (...args) => {
        dispose();
        return handler(...args);
      },
      options,
    );
    return dispose;
  }

  emit(event, payload) {
    stats.emitted += 1;
    const set = listeners.get(event);
    if (!set || set.size === 0) return 0;
    let handled = 0;
    for (const handler of [...set]) {
      try {
        handler(payload);
        handled += 1;
      } catch (error) {
        stats.failed += 1;
        logDebug('bus', `${event} handler failed: ${error.message}`);
      }
    }
    stats.handled += handled;
    return handled;
  }

  listenerCount(event) {
    if (!event) {
      let total = 0;
      for (const set of listeners.values()) total += set.size;
      return total;
    }
    return listeners.get(event)?.size ?? 0;
  }

  clear(event) {
    if (event) listeners.delete(event);
    else listeners.clear();
  }

  describe() {
    const channels = [...listeners.entries()]
      .map(([event, set]) => ({ event, count: set.size }))
      .sort((a, b) => b.count - a.count);
    return { channels, ...stats };
  }
}

export function createBus() {
  return new EventBus();
}