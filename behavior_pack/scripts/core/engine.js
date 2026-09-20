/**
 * The engine: one tick loop, one scheduler, one session registry.
 *
 * Cadence is the core performance decision for a phone build. Work is spread
 * over fixed tick divisors rather than run per tick:
 *
 *   every tick       scheduler tasks, session liveness
 *   every 10 ticks   HUD refresh
 *   every 40 ticks   suit passives
 *   every 200 ticks  cooldown pruning, session reaping
 *   every 400 ticks  profile persistence
 *
 * The loop also samples its own wall-clock cost and lowers visual density when
 * it exceeds the mobile budget, so a slow device loses sparkle before it loses
 * responsiveness.
 */
import { LIMITS, MS_PER_TICK, PREFIX } from './constants.js';
import { currentTick, getPlayers, isPlayerUsable, runInterval } from './api.js';
import { Events, createBus } from './bus.js';
import { createQualityController, setAdaptiveTier } from './config.js';
import { logError, logInfo } from './log.js';
import { Scheduler } from './scheduler.js';
import { setTickSource } from '../framework/sessions.js';
import { applyPassives, PASSIVE_INTERVAL } from '../combat/passives.js';
import { update as updateHud } from '../framework/hud.js';
import { prune as pruneCooldowns } from '../systems/cooldowns.js';

const CADENCE = {
  hud: 10,
  passives: PASSIVE_INTERVAL,
  maintenance: 200,
  flush: 400,
};

/**
 * Creates the engine object. Content loading is deliberately *not* done here -
 * see `framework/bootstrap.js` - so a unit test can build an engine over stub
 * systems without touching the Minecraft runtime.
 */
export function createEngine(overrides = {}) {
  setTickSource(currentTick);
  return {
    tick: currentTick(),
    bus: createBus(),
    scheduler: new Scheduler({ budget: LIMITS.tickBudgetMs + 6 }),
    quality: createQualityController({ budgetMs: LIMITS.tickBudgetMs }),
    config: {},
    store: undefined,
    sessions: null,
    started: false,
    driverHandle: undefined,
    /** Command-driven overrides; see `setBypass` in framework/abilities.js. */
    allowCooldownBypass: false,
    allowEnergyBypass: false,
    health: { slowTicks: 0, reaps: 0, lastTickMs: 0, ticks: 0 },
    ...overrides,
  };
}

/**
 * Advances the engine by one tick. Exposed so tests can drive ticks directly
 * instead of waiting on the real game clock.
 */
export function tick(engine) {
  const started = Date.now();
  const now = currentTick();
  engine.tick = now;
  engine.health.ticks += 1;

  engine.scheduler.advance({ tick: now, engine, now: started });

  if (engine.sessions) {
    // Energy is the only thing that needs per-tick resolution; everything else
    // runs on a divisor. One multiply-add per player per tick is cheap enough.
    for (const session of engine.sessions.all()) session.tick(now);

    if (now % CADENCE.hud === 0) {
      for (const session of engine.sessions.all()) updateHud(session, now);
    }
    if (now % CADENCE.passives === 0) {
      for (const session of engine.sessions.all()) applyPassives(session, now);
    }
    if (now % CADENCE.maintenance === 0) {
      pruneCooldowns(now);
      engine.health.reaps += engine.sessions.reap();
    }
    if (now % CADENCE.flush === 0) {
      engine.sessions.flushAll();
      engine.store?.flushWorld(now);
    }
  }

  const elapsed = Date.now() - started;
  engine.health.lastTickMs = elapsed;
  const tier = engine.quality.sample(elapsed);
  setAdaptiveTier(tier);

  if (tier < 1) {
    engine.health.slowTicks += 1;
    if (engine.health.slowTicks % 200 === 1) {
      engine.bus.emit(Events.SLOW_TICK, { tick: now, elapsed, tier });
    }
  }

  engine.bus.emit(Events.TICK, { tick: now, elapsed });
  return elapsed;
}

/** Starts the driver. Idempotent, so a reload cannot register it twice. */
export function start(engine) {
  if (engine.started) return engine;
  engine.started = true;

  engine.driverHandle = runInterval(() => {
    try {
      tick(engine);
    } catch (error) {
      // A throwing tick must never stop the interval: on a phone that would look
      // like the addon silently dying.
      logError('engine:tick', error);
    }
  }, 1);

  logInfo('engine', `driver started (${MS_PER_TICK.toFixed(0)}ms per tick)`);
  return engine;
}

export function stop(engine) {
  if (!engine.started) return false;
  engine.sessions?.flushAll(true);
  engine.scheduler?.clear();
  engine.started = false;
  return true;
}

/**
 * Rebuilds sessions for players who are already online. Needed after a behaviour
 * pack reload, and when `worldLoad` arrives after players have joined.
 */
export function recoverSessions(engine, profileFor) {
  if (!engine.sessions) return 0;
  let created = 0;
  for (const player of getPlayers()) {
    if (!isPlayerUsable(player) || engine.sessions.get(player)) continue;
    if (engine.sessions.join(player, profileFor(player))) created += 1;
  }
  return created;
}

export function describe(engine) {
  return {
    tick: engine.tick,
    started: engine.started,
    uptimeTicks: engine.health.ticks,
    lastTickMs: engine.health.lastTickMs,
    slowTicks: engine.health.slowTicks,
    qualityTier: engine.quality.tier,
    sessions: engine.sessions?.size ?? 0,
    scheduler: engine.scheduler.describe(),
    listeners: engine.bus.listenerCount(),
  };
}

export { EventBus } from './bus.js';

/** Prefix used by `[msu]` chat announcements. */
export const CHAT_PREFIX = `\u00a7b[${PREFIX}]\u00a7r`;