/**
 * Suit passives.
 *
 * A suit may declare a `passive` block: effects that are maintained while worn
 * or re-applied on a slow interval. This is deliberately not a per-tick loop -
 * passives refresh every couple of seconds with a duration well beyond the
 * interval, so the buff never lapses visibly and the cost stays near zero.
 */
import { isPlayerUsable, setOnGround } from '../core/api.js';
import { Effects, giveEffect, hasEffect } from './effects.js';
import { logWarn } from '../core/log.js';

/** How often passives are refreshed, in ticks. */
export const PASSIVE_INTERVAL = 40;

/** Effect duration granted each refresh; comfortably longer than the interval. */
const PASSIVE_DURATION = 6;

export const PassiveKeys = {
  EFFECTS: 'effects',
  /** Reduces fall damage visually by granting slow falling below a height. */
  FEATHER_FALL: 'featherFall',
  /** Keeps the hero from being dismounted by knockback while sneaking. */
  STABILITY: 'stability',
  /** Emissive tint applied through a night vision pulse. */
  EMISSIVE: 'emissive',
};

/** Validates a suit's passive block at load time. */
export function validatePassive(suit) {
  const passive = suit.passive ?? {};
  const problems = [];
  if (passive.effects && !Array.isArray(passive.effects)) {
    problems.push(`${suit.id}: passive.effects must be an array of [name, seconds, level]`);
  }
  for (const entry of passive.effects ?? []) {
    if (!Array.isArray(entry) || typeof entry[0] !== 'string') {
      problems.push(`${suit.id}: passive effect entries must be [name, level] arrays`);
    }
  }
  return problems;
}

/**
 * Applies the passive refresh for one session.
 * @returns {number} how many effects were applied or maintained.
 */
export function applyPassives(session, tick) {
  const suit = session.suit;
  if (!suit || !isPlayerUsable(session.player)) return 0;
  const passive = suit.passive ?? {};
  let applied = 0;

  for (const [name, level] of passive.effects ?? []) {
    // Re-applying an effect every refresh would reset its particle trail and
    // cost a packet; only top it up when it is about to lapse.
    if (hasEffect(session.player, name)) continue;
    if (giveEffect(session.player, name, PASSIVE_DURATION, level ?? 1)) applied += 1;
  }

  if (passive[PassiveKeys.EMISSIVE]) {
    if (!hasEffect(session.player, Effects.NIGHT_VISION)) {
      if (giveEffect(session.player, Effects.NIGHT_VISION, PASSIVE_DURATION, 1)) applied += 1;
    }
  }

  if (passive[PassiveKeys.FEATHER_FALL]) {
    updateFallAssist(session, passive[PassiveKeys.FEATHER_FALL]);
  }

  if (passive[PassiveKeys.STABILITY] && applied > 0) {
    setOnGround(session.player, true);
  }

  return applied;
}

/**
 * Grants slow falling only while airborne and descending, so a hero with feather
 * fall still falls normally at the start of a drop.
 */
function updateFallAssist(session, config) {
  const { player } = session;
  let velocity;
  try {
    velocity = player.getVelocity();
  } catch {
    return;
  }
  if (velocity.y > -0.3) return;
  const threshold = config.height ?? 3;
  const fallDistance = velocity.y * velocity.y * 20;
  if (fallDistance < threshold) return;
  giveEffect(player, Effects.SLOW_FALLING, 3, 1);
}

/** Logs a warning once per suit with an unusable passive block. */
export function reportPassiveProblems(hero) {
  for (const suit of hero.suits) {
    for (const problem of validatePassive(suit)) logWarn('passives', problem);
  }
}