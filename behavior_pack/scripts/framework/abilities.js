/**
 * Ability execution.
 *
 * This is the seam between a declarative ability and the engine. It builds the
 * execution context once per activation, enforces cost/cooldown/gating in one
 * place, and re-enters every asynchronous continuation through `afterTicks` and
 * `repeat` so that a stale player reference can never throw.
 *
 * The context object is the entire contract offered to ability authors:
 *   player, session, dimension, ability, slot, tick, energy, damage(multiplier),
 *   afterTicks(delay, fn), repeat({times, interval, fn}), announce(message)
 */
import { Events } from '../core/bus.js';
import { isCreativeOrSpectator, isEntityUsable, isPlayerUsable, sendMessage } from '../core/api.js';
import { formatDuration } from '../core/units.js';
import { isReady, remaining, start as startCooldown } from '../systems/cooldowns.js';
import { clamp } from '../core/units.js';
import { describeRequirement } from '../progression/index.js';
import { logDebug, logWarn } from '../core/log.js';
import { t } from './i18n.js';

export const AbilityResult = {
  OK: 'ok',
  NO_SESSION: 'no-session',
  NO_HERO: 'no-hero',
  UNKNOWN_SLOT: 'unknown-slot',
  LOCKED: 'locked',
  COOLDOWN: 'cooldown',
  NO_ENERGY: 'no-energy',
  INVALID: 'invalid',
  FAILED: 'failed',
};

/**
 * Builds the context handed to an ability's `execute`.
 * Returning the context from one function keeps every activation identical and
 * makes the async helpers testable without the Minecraft runtime.
 */
export function createContext(options) {
  const { engine, session, slot, ability } = options;
  const { player } = session;
  const effect = ability.effect ?? 1;

  const context = {
    player,
    session,
    ability,
    slot,
    dimension: player.dimension,
    tick: engine.tick,
    energy: session.pool,
    /** Scales a base damage number by the suit's tier and the ability's multiplier. */
    damage: (base) => base * (session.suit?.damage ?? 1) * effect,
    announce: (message) => sendMessage(player, message),
    /**
     * Runs `fn` after `delay` ticks, skipping the call if the player has since
     * left or died. This is the only sanctioned way to do delayed work.
     */
    afterTicks: (delay, fn, label = `${ability.id}:delayed`) =>
      engine.scheduler.every({
        label,
        interval: Math.max(1, delay),
        repeats: 1,
        run: () => {
          if (!isPlayerUsable(player)) return false;
          fn();
          return false;
        },
      }),
    /**
     * Runs `fn` every `interval` ticks, at most `times` times.
     * Used for channelled abilities; the callback returns false to stop early.
     */
    repeat: (repeatOptions) =>
      engine.scheduler.every({
        label: repeatOptions.label ?? `${ability.id}:repeat`,
        interval: Math.max(1, repeatOptions.interval ?? 1),
        repeats: repeatOptions.times ?? 1,
        run: () => {
          if (!isPlayerUsable(player)) return false;
          return repeatOptions.fn() !== false;
        },
      }),
  };

  return context;
}

/**
 * Activates an ability for a player.
 *
 * Order matters: gating, then cooldown, then energy, then execute. Energy is
 * refunded if execute throws, so a bug cannot silently drain a player's pool.
 *
 * @returns {{status: string, result?: object, cooldown?: number}}
 */
export function activate(engine, session, slot) {
  if (!session) return { status: AbilityResult.NO_SESSION };
  if (!session.hero) {
    if (sendMessage(session.player, t('msu.message.no_hero'))) {
      return { status: AbilityResult.NO_HERO };
    }
    return { status: AbilityResult.NO_HERO };
  }

  const entry = session.abilityFor(slot);
  if (!entry) return { status: AbilityResult.UNKNOWN_SLOT };

  const { ability } = entry;
  const tick = engine.tick;

  // One button press can surface as several events; 5 ticks is the window in
  // which a repeated trigger is treated as the same press.
  if (session.lastAbilityTick >= 0 && tick - session.lastAbilityTick < 5) {
    return { status: AbilityResult.COOLDOWN, cooldown: 5 };
  }

  if (ability.unlock) {
    const level = session.profile.get('level', 1);
    if (ability.unlock.level && level < ability.unlock.level) {
      sendMessage(session.player, t('msu.message.ability_locked'));
      return { status: AbilityResult.LOCKED, requirement: describeRequirement({ unlock: ability.unlock }) };
    }
  }

  if (!engine.allowCooldownBypass && !isReady(session.id, ability.id, tick)) {
    return { status: AbilityResult.COOLDOWN, cooldown: remaining(session.id, ability.id, tick) };
  }

  const freeCost = engine.allowEnergyBypass || isCreativeOrSpectator(session.player);
  const cost = freeCost ? 0 : ability.cost;
  if (cost > 0 && !session.pool.spend(cost, tick)) {
    sendMessage(session.player, t('msu.message.energy_empty'));
    return { status: AbilityResult.NO_ENERGY };
  }

  const context = createContext({ engine, session, slot, ability });
  let result;
  try {
    result = ability.execute(context);
  } catch (error) {
    logWarn('abilities', `${ability.id} threw: ${error.message}`);
    if (cost > 0) session.pool.refund(cost);
    return { status: AbilityResult.FAILED };
  }

  const cooldownTicks = startCooldown(session.id, ability.id, tick);
  session.lastAbilityTick = tick;
  session.dirty = true;
  session.profile.set('stats.abilities', session.profile.get('stats.abilities', 0) + 1);

  engine.bus.emit(Events.ABILITY_USED, {
    session,
    ability,
    slot,
    result,
    cooldownTicks,
  });

  if (result?.hit) {
    logDebug('abilities', `${ability.id} connected (hits=${result.hits ?? 1})`);
  }

  if (engine.config?.announceAbilitiesInChat) {
    sendMessage(
      session.player,
      t('msu.message.ability_used', ability.name, (cooldownTicks / 20).toFixed(1)),
    );
  }

  return { status: AbilityResult.OK, result, cooldown: cooldownTicks };
}

/** Blocks activation entirely; used by the free-play and test commands. */
export function setBypass(engine, options = {}) {
  engine.allowCooldownBypass = options.cooldowns === true;
  engine.allowEnergyBypass = options.energy === true;
  return { ...options };
}

/** Guard used by every entry point that acts on a live entity. */
export function ensureUsable(player) {
  if (!isPlayerUsable(player)) return false;
  return isEntityUsable(player);
}

export { formatDuration };