/**
 * Content loading and lifecycle wiring.
 *
 * `main.js` is the Minecraft entry point and stays thin: it calls `startAddon`
 * here, and this module owns the order in which things come up. Keeping that
 * order in one place is what lets a new system be added without guessing where
 * it has to be initialised.
 *
 * Order:
 *   1. engine created (no API calls)
 *   2. API capabilities probed
 *   3. abilities + hero roster registered
 *   4. store and profile loader wired into sessions
 *   5. player join/leave listeners installed
 *   6. tick driver started
 */
import { PREFIX, STORE_KEYS } from '../core/constants.js';
import {
  api,
  broadcast,
  initialiseApi,
  isPlayerUsable,
  reportMissingCapabilities,
  subscribe,
} from '../core/api.js';
import { Events } from '../core/bus.js';
import { createEngine, describe, recoverSessions, start } from '../core/engine.js';
import { applyPreset, getOption, setOption } from '../core/config.js';
import { logError, logInfo, logWarn, setLogLevel } from '../core/log.js';
import { Store, stampSchema } from '../core/store.js';
import { SessionManager } from './sessions.js';
import { awardDefeat, installCombatHooks } from '../combat/rewards.js';
import { count as abilityCount, registerCoreAbilities } from '../abilities/library.js';
import { describeRoster, listHeroes, loadBuiltinHeroes } from '../heroes/registry.js';
import { reportPassiveProblems } from '../combat/passives.js';
import { installCommands } from './commands.js';
import { installUi } from '../ui/forms.js';
import { installInput } from './input.js';
import { starterSuit } from '../suits/define.js';
import { markSuitUnlocked } from '../progression/index.js';

/** The live engine, exported so scriptevent handlers and commands can reach it. */
export let engine;

/** Loads content and prepares the engine. Does not start ticking. */
export async function prepareEngine() {
  initialiseApi();
  setLogLevel(getOption('logLevel'));
  applyPreset(getOption('preset') ?? 'mobile');

  const instance = createEngine();
  const missing = reportMissingCapabilities('bootstrap', api.session);
  if (missing.length > 0) {
    broadcast(
      `\u00a7c[${PREFIX}] This build is missing ${missing.length} required API capability; some abilities are disabled.`,
    );
  }

  const registered = registerCoreAbilities();
  const roster = await loadBuiltinHeroes();
  for (const hero of listHeroes()) reportPassiveProblems(hero);

  instance.store = new Store(api.server.world);
  instance.store.loadWorld();
  stampSchema(api.server.world);

  instance.sessions = new SessionManager(instance.bus, instance.store);
  instance.profileFor = (player) => instance.store.profileFor(player);

  installCombatHooks(instance, instance.bus);
  installCommands(instance);
  installUi(instance);
  installInput(instance);

  instance.roster = describeRoster();
  instance.capabilityReport = missing;

  logInfo(
    'bootstrap',
    `content ready: ${registered} core abilities (${abilityCount()} registered), ` +
      `${roster.loaded.length} heroes, api ${api.version}`,
  );
  return instance;
}

/** Prepares and starts the addon, then wires the player lifecycle. */
export async function startAddon() {
  try {
    engine = await prepareEngine();
  } catch (error) {
    logError('bootstrap', error);
    return undefined;
  }

  installPlayerLifecycle(engine);
  recoverSessions(engine, engine.profileFor);
  start(engine);

  engine.bus.emit(Events.READY, { engine, report: describe(engine) });
  return engine;
}

/** Join/leave handling. Split out so tests can install it without starting. */
export function installPlayerLifecycle(instance) {
  subscribe('afterEvents.playerJoin', (event) => {
    const player = event.player ?? event.playerJoin?.player;
    if (!isPlayerUsable(player) || !instance.sessions) return;
    try {
      const session = instance.sessions.join(player, instance.profileFor(player));
      if (!session) return;
      // A player who has never chosen a hero gets the first one, so the Hero Core
      // is usable the moment they hold it instead of after a menu round trip.
      if (!session.hero && getOption('autoUnlockFirstSuit') !== false) {
        assignStarterHero(session);
      }
      if (session.hero) {
        instance.bus.emit(Events.HERO_EQUIPPED, { session, heroId: session.heroId, suitId: session.suitId });
      }
    } catch (error) {
      // A broken profile must not eject a player from the world.
      logError('lifecycle:join', error);
    }
  });

  subscribe('afterEvents.playerLeave', (event) => {
    const playerId = event.playerId ?? event.player?.id;
    if (!playerId || !instance.sessions) return;
    instance.sessions.leave(playerId);
  });

  subscribe('afterEvents.entityDie', (event) => {
    const dead = event.deadEntity;
    const killer = event.damageSource?.damagingEntity;
    if (!dead || !killer || !instance.sessions) return;
    const session = instance.sessions.get(killer);
    if (!session) return;
    try {
      awardDefeat(instance, session, dead.typeId);
    } catch (error) {
      logWarn('lifecycle:death', `could not award defeat: ${error.message}`);
    }
  });

  logInfo('bootstrap', 'player lifecycle installed');
}

export function worldFlag(key, fallback) {
  try {
    return api.server.world.getDynamicProperty(`${STORE_KEYS.world}:${key}`) ?? fallback;
  } catch {
    return fallback;
  }
}

/** Gives a brand-new session the roster's first hero and its starter suit. */
export function assignStarterHero(session) {
  const heroes = listHeroes();
  if (heroes.length === 0) {
    logWarn('lifecycle', 'no heroes are registered; the Hero Core has nothing to grant');
    return undefined;
  }
  const hero = heroes[0];
  session.selectHero(hero.id);
  const suit = starterSuit(hero);
  markSuitUnlocked(session.profile, hero.id, suit.id);
  session.flush(true);
  return hero.id;
}

export { setOption, getOption };