/**
 * Unit conversion and small numeric helpers.
 *
 * Hero and ability definitions are authored in human units (seconds, metres,
 * whole hearts) and converted here, so designers never hand-write ticks.
 */
import { TICKS_PER_SECOND } from './constants.js';

export function ticksFromSeconds(seconds) {
  return Math.max(1, Math.round(seconds * TICKS_PER_SECOND));
}

export function secondsFromTicks(ticks) {
  return ticks / TICKS_PER_SECOND;
}

/** Bedrock impulses and `applyKnockback` strengths are "blocks per tick"-ish. */
export function impulseFromMetersPerSecond(metresPerSecond) {
  return metresPerSecond / TICKS_PER_SECOND;
}

export function clamp(value, min, max) {
  if (Number.isNaN(value)) return min;
  return value < min ? min : value > max ? max : value;
}

export function lerpNumber(a, b, t) {
  return a + (b - a) * clamp(t, 0, 1);
}

export function round(value, decimals = 1) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/** Formats ticks as a short, chat-friendly "3.5s" string. */
export function formatDuration(ticks) {
  return `${round(secondsFromTicks(ticks), 1)}s`;
}

export function formatEnergy(current, max) {
  return `${Math.round(current)}/${Math.round(max)}`;
}

/** Whole-heart damage values are easier to read in ability definitions. */
export function damageFromHearts(hearts) {
  return hearts * 2;
}

/** Bedrock effect amplifiers are zero-based: level 1 -> amplifier 0. */
export function amplifierFromLevel(level) {
  return Math.max(0, Math.round(level) - 1);
}

export function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  return `${round(bytes / 1024, 1)} KiB`;
}