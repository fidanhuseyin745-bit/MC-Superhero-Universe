/**
 * Error types and the single place that defines "a failing hook must not kill
 * the engine".
 */
import { logError, logWarn } from './log.js';

export class MsuError extends Error {
  constructor(code, message, detail) {
    super(message);
    this.name = 'MsuError';
    this.code = code;
    this.detail = detail;
  }
}

/**
 * Raised when an event the addon depends on is absent from the running build.
 * On its own this is not fatal - the related feature simply stays off - but the
 * entry point treats "no world event at all" as a hard configuration error.
 */
export class MissingEventError extends MsuError {
  constructor(eventName) {
    super('MISSING_EVENT', `event "${eventName}" is unavailable; the addon cannot start on this Minecraft build`);
    this.name = 'MissingEventError';
    this.eventName = eventName;
  }
}

export function isMsuError(value) {
  return value instanceof MsuError;
}

/**
 * Wraps a callback so a thrown error is contained.
 *
 * Used for event subscriptions, scheduler tasks and content loading: one bad
 * hero must never take the whole pack down, because on a phone the player has
 * no way to see the console.
 */
export function guard(label, fn, fallback = undefined) {
  return (...args) => {
    try {
      return fn(...args);
    } catch (error) {
      logError(label, error);
      return fallback;
    }
  };
}

/** Same as `guard`, but also swallows a rejected promise from an async callback. */
export function guardAsync(label, fn) {
  return (...args) => {
    try {
      const result = fn(...args);
      if (result && typeof result.then === 'function') {
        result.then(undefined, (error) => logError(label, error));
      }
      return result;
    } catch (error) {
      logError(label, error);
      return undefined;
    }
  };
}

/** Runs every callback, isolating failures. Returns how many succeeded. */
export function runIsolated(label, callbacks) {
  let ok = 0;
  for (const callback of callbacks) {
    try {
      callback();
      ok += 1;
    } catch (error) {
      logError(label, error);
    }
  }
  return ok;
}

export function assert(condition, message) {
  if (!condition) throw new MsuError('ASSERT', message);
}

export function reportUnsupported(scope, capability) {
  logWarn(scope, `capability "${capability}" is unavailable in this Minecraft version; feature disabled`);
}