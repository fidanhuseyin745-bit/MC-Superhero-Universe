/**
 * Cooperative scheduler for everything that runs on a timer.
 *
 * Design notes for mobile:
 *   - one repeating driver advances the whole queue, so a hundred timers cost
 *     one `runInterval` registration rather than a hundred;
 *   - every task is checked for validity before it runs, so a task holding a
 *     despawned entity cannot throw;
 *   - per-tick work is bounded by `budget`, and anything over budget is pushed
 *     to the next tick instead of being dropped.
 */
import { LIMITS } from './constants.js';
import { guard } from './errors.js';
import { logWarn } from './log.js';

let nextHandle = 1;

export class Scheduler {
  constructor(options = {}) {
    this.tick = 0;
    this.tasks = new Map();
    this.budget = options.budget ?? 24;
    this.driverHandle = undefined;
    this.slowTasks = [];
    this.overruns = 0;
  }

  /**
   * @param {object} options
   * @param {number} options.interval Ticks between runs.
   * @param {Function} options.run Callback; return false to cancel.
   * @param {Function} [options.until] Cancellation predicate checked before each run.
   * @param {number} [options.delay] Initial delay in ticks.
   * @param {number} [options.repeats] Run at most this many times.
   * @param {string} [options.label] Diagnostics label.
   */
  every(options) {
    if (this.tasks.size >= LIMITS.maxSchedulerTasks) {
      logWarn('scheduler', `task limit (${LIMITS.maxSchedulerTasks}) reached; "${options.label}" not scheduled`);
      return undefined;
    }
    const handle = nextHandle++;
    const interval = Math.max(1, Math.round(options.interval ?? 1));
    this.tasks.set(handle, {
      handle,
      interval,
      run: guard(`scheduler:${options.label ?? handle}`, options.run),
      until: options.until,
      nextAt: this.tick + (options.delay ?? interval),
      remaining: options.repeats ?? Number.POSITIVE_INFINITY,
      label: options.label ?? `task-${handle}`,
    });
    return handle;
  }

  sequence(steps, options = {}) {
    let index = 0;
    return this.every({
      interval: options.interval ?? 1,
      label: options.label ?? 'sequence',
      until: options.until,
      run: (context) => {
        const step = steps[index];
        index += 1;
        step(context);
        return index < steps.length;
      },
    });
  }

  everyTicks(label, run, interval, until) {
    return this.every({ label, run, interval, until });
  }

  /** Cancels one task. Safe to call for a handle that already finished. */
  cancel(handle) {
    return this.tasks.delete(handle);
  }

  cancelMatching(predicate) {
    let removed = 0;
    for (const [handle, task] of this.tasks) {
      if (predicate(task)) {
        this.tasks.delete(handle);
        removed += 1;
      }
    }
    return removed;
  }

  /** Removes every task owned by a player - essential on player leave. */
  cancelOwnedBy(ownerId) {
    return this.cancelMatching((task) => task.ownerId === ownerId);
  }

  /** Attaches ownership to a task so it can be reaped with the player. */
  own(handle, ownerId) {
    const task = this.tasks.get(handle);
    if (task) task.ownerId = ownerId;
    return handle;
  }

  get size() {
    return this.tasks.size;
  }

  /**
   * Advances the queue. `driver` is supplied by the engine so the scheduler and
   * the ability systems share one timing source.
   */
  advance(context) {
    const { tick, now } = context;
    this.tick = tick;
    const started = now ?? 0;
    let executed = 0;

    for (const [handle, task] of this.tasks) {
      if (task.nextAt > tick) continue;
      if (task.until && !task.until(context)) {
        this.tasks.delete(handle);
        continue;
      }
      let keepGoing = true;
      try {
        keepGoing = task.run({ ...context, handle, task });
      } catch {
        keepGoing = false;
      }
      task.remaining -= 1;
      if (!keepGoing || task.remaining <= 0) {
        this.tasks.delete(handle);
        continue;
      }
      task.nextAt = tick + task.interval;
      executed += 1;
    }

    if (now !== undefined) {
      const elapsed = performanceNow() - started;
      if (elapsed > this.budget) {
        this.overruns += 1;
        // Report rarely; a slow frame is expected when many abilities land at once.
        if (this.overruns % 200 === 1) {
          logWarn('scheduler', `tick work took ${elapsed.toFixed(1)}ms (>${this.budget}ms budget)`);
        }
      }
    }
    return executed;
  }

  clear() {
    this.tasks.clear();
  }

  describe() {
    const byLabel = {};
    for (const task of this.tasks.values()) byLabel[task.label] = (byLabel[task.label] ?? 0) + 1;
    return { tasks: this.tasks.size, overruns: this.overruns, byLabel };
  }
}

/** Wall-clock helper; `Date.now` is available in the Bedrock script runtime. */
function performanceNow() {
  return typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();
}

export { performanceNow };