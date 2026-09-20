/**
 * Logging with a level gate and per-key throttling.
 *
 * The script runtime writes to the same log the game server uses, so a noisy
 * per-tick warning is a real performance problem on a phone. `warnOnce` exists
 * so diagnostics stay available without flooding.
 */
import { PREFIX } from './constants.js';

export const LogLevel = { OFF: 0, ERROR: 1, WARN: 2, INFO: 3, DEBUG: 4 };

const NAMES = { off: 0, error: 1, warn: 2, info: 3, debug: 4 };

let level = LogLevel.WARN;
const seen = new Set();

export function setLogLevel(name) {
  const next = NAMES[String(name).toLowerCase()];
  if (next === undefined) return false;
  level = next;
  return true;
}

export function getLogLevel() {
  return level;
}

export function logError(scope, error) {
  if (level < LogLevel.ERROR) return;
  const detail = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error && error.stack ? `\n${error.stack}` : '';
  console.warn(`[${PREFIX}][${scope}] ${detail}${level >= LogLevel.DEBUG ? stack : ''}`);
}

export function logWarn(scope, message) {
  if (level < LogLevel.WARN) return;
  console.warn(`[${PREFIX}][${scope}] ${message}`);
}

export function logInfo(scope, message) {
  if (level < LogLevel.INFO) return;
  console.warn(`[${PREFIX}][${scope}] ${message}`);
}

export function logDebug(scope, message) {
  if (level < LogLevel.DEBUG) return;
  console.warn(`[${PREFIX}][${scope}] ${message}`);
}

/** Logs the same key at most once per `window` ticks of engine uptime. */
export function warnThrottled(key, scope, message, uptime, window = 600) {
  const bucket = Math.floor(uptime / window);
  const stamped = `${key}#${bucket}`;
  if (seen.has(stamped)) return false;
  seen.add(stamped);
  // Bound the set so a long session cannot grow it without limit.
  if (seen.size > 256) seen.clear();
  logWarn(scope, message);
  return true;
}

export function resetThrottle() {
  seen.clear();
}