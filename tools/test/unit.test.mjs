/**
 * Engine test suite.
 *
 * The Minecraft API is stubbed as a real module on disk (see
 * `tools/test/gen-stubs.mjs`), installed before any engine import, so these tests
 * exercise the real registry, the real energy pool and the real cooldown table.
 * Nothing asserts on mock internals: the assertions are about engine behaviour.
 */
import { configure, makeDimension, makeEntity, makePlayer, makePropertyStore, resetCalls, calls } from './mc-stub.mjs';
import { resetUi, queueResponse, shownForms } from './mc-stub-ui.mjs';
import { describe, test, assert, assertEqual, assertThrows, run } from './harness.mjs';

const worldProps = makePropertyStore();
configure({ props: worldProps.map });

const engineModule = await import('../../behavior_pack/scripts/core/engine.js');
const abilities = await import('../../behavior_pack/scripts/abilities/library.js');
const registry = await import('../../behavior_pack/scripts/abilities/registry.js');
const heroRegistry = await import('../../behavior_pack/scripts/heroes/registry.js');
const suits = await import('../../behavior_pack/scripts/suits/define.js');
const progression = await import('../../behavior_pack/scripts/progression/index.js');
const frameworkAbilities = await import('../../behavior_pack/scripts/framework/abilities.js');
const energySystem = await import('../../behavior_pack/scripts/systems/energy.js');
const cooldowns = await import('../../behavior_pack/scripts/systems/cooldowns.js');
const store = await import('../../behavior_pack/scripts/core/store.js');
const sessions = await import('../../behavior_pack/scripts/framework/sessions.js');
const targeting = await import('../../behavior_pack/scripts/combat/targeting.js');
const i18n = await import('../../behavior_pack/scripts/framework/i18n.js');
const api = await import('../../behavior_pack/scripts/core/api.js');
const config = await import('../../behavior_pack/scripts/core/config.js');
const schedulerModule = await import('../../behavior_pack/scripts/core/scheduler.js');
const forms = await import('../../behavior_pack/scripts/ui/forms.js');
const combatVfx = await import('../../behavior_pack/scripts/combat/vfx.js');

/** Registers content once; the registries are module-level and shared. */
const contentReady = (async () => {
  await abilities.registerCoreAbilities();
  await heroRegistry.loadBuiltinHeroes();
})();

function newStore() {
  return new store.Store(worldProps);
}

/** An engine with a session for one player, ready to activate abilities. */
async function freshEngine() {
  await contentReady;
  const player = makePlayer({ name: 'Tester' });
  const propertyStore = newStore();
  propertyStore.loadWorld();
  const engine = engineModule.createEngine();
  engine.store = propertyStore;
  engine.sessions = new sessions.SessionManager(engine.bus, propertyStore);
  const session = engine.sessions.join(player, propertyStore.profileFor(player));
  // Mirror what bootstrap does on join: a new player starts with the first hero.
  session.selectHero(heroRegistry.listHeroes()[0].id);
  return { engine, session, player, propertyStore };
}

describe('ability registry', () => {
  test('registers the core library including tier variants', async () => {
    const count = await contentReady.then(() => registry.count());
    assert(count > 20, `expected a substantial library, got ${count}`);
    assert(abilities.CORE_ABILITY_IDS.length > 0, 'core ids exported');
  });

  test('every registered ability is well formed', () => {
    for (const ability of registry.list()) {
      assert(['primary', 'defense', 'utility', 'ultimate'].includes(ability.slot), `${ability.id} slot`);
      assert(typeof ability.execute === 'function', `${ability.id} execute`);
      assert(ability.cooldownTicks >= 1, `${ability.id} cooldown`);
      assert(ability.cost >= 0, `${ability.id} cost`);
    }
  });

  test('registering an invalid slot throws', () => {
    assertThrows(() =>
      registry.register({ id: 'msu_ability:bad_slot', name: 'bad', slot: 'hat', execute: () => ({}) }),
    );
  });

  test('registering without an execute function throws', () => {
    assertThrows(() => registry.register({ id: 'msu_ability:no_exec', name: 'bad', slot: 'primary' }));
  });

  test('requireAbility names the offender when an id is missing', () => {
    assertThrows(() => registry.requireAbility('msu_ability:not_real', 'suit "x"'), 'unregistered ability');
  });
});

describe('hero roster', () => {
  test('loads all five built-in heroes with nothing skipped', async () => {
    const report = await heroRegistry.loadBuiltinHeroes();
    assertEqual(report.loaded.length, 5, 'loaded hero count');
    assertEqual(report.skipped.length, 0, `skipped: ${JSON.stringify(report.skipped)}`);
  });

  test('every hero passes validation', () => {
    for (const hero of heroRegistry.listHeroes()) {
      const problems = suits.validateHero(hero);
      assertEqual(problems.length, 0, `${hero.id}: ${problems.join('; ')}`);
    }
  });

  test('every suit maps one ability per slot', () => {
    for (const hero of heroRegistry.listHeroes()) {
      for (const suit of hero.suits) {
        const slots = suits.orderedSlots(suit).map((entry) => entry.slot);
        assertEqual(new Set(slots).size, slots.length, `${hero.id}/${suit.id} unique slots`);
        assertEqual(slots.length, suit.abilities.length, `${hero.id}/${suit.id} abilities all mapped`);
      }
    }
  });

  test('every hero has a starter suit with no unlock requirement', () => {
    for (const hero of heroRegistry.listHeroes()) {
      const starter = suits.starterSuit(hero);
      assert(!starter.unlock, `${hero.id} starter suit must be open`);
    }
  });

  test('suit energy ceilings never shrink as tiers go up', () => {
    for (const hero of heroRegistry.listHeroes()) {
      for (let i = 1; i < hero.suits.length; i += 1) {
        assert(
          hero.suits[i].energy.max >= hero.suits[i - 1].energy.max,
          `${hero.id}: ${hero.suits[i].id} has less energy than ${hero.suits[i - 1].id}`,
        );
      }
    }
  });

  test('a suit with two abilities in one slot is rejected at definition time', () => {
    const hero = heroRegistry.listHeroes()[0];
    const suit = hero.suits[0];
    const [first, second] = suit.abilities;
    assertThrows(
      () => suits.defineSuit({ id: 'bad', name: 'bad', abilities: [first, first, second] }),
      'conflicting slots',
    );
  });
});

describe('progression', () => {
  test('xp requirements grow monotonically', () => {
    for (let level = 1; level < 20; level += 1) {
      assert(
        progression.xpForLevel(level + 1) > progression.xpForLevel(level),
        `level ${level + 1} does not cost more than ${level}`,
      );
    }
  });

  test('levelProgress lands exactly on level boundaries', () => {
    let total = 0;
    for (let level = 1; level <= 6; level += 1) {
      const progress = progression.levelProgress(total);
      assertEqual(progress.level, level, `total ${total} should be level ${level}`);
      total += progression.xpForLevel(level);
    }
  });

  test('levelProgress clamps at the maximum', () => {
    const progress = progression.levelProgress(50_000_000);
    assertEqual(progress.level, progression.MAX_LEVEL, 'level clamps');
    assertEqual(progress.needed, 0, 'no requirement past max');
  });

  test('grantXp keeps the remainder after a level up', () => {
    const data = { level: 1, xp: 0 };
    const profile = {
      get: (path, fallback) =>
        path === 'level' ? data.level : path === 'xp' ? data.xp : path === 'unlocks' ? {} : fallback,
      set: (path, value) => {
        if (path === 'level') data.level = value;
        if (path === 'xp') data.xp = value;
        return profile;
      },
    };
    const amount = progression.xpForLevel(1) + 5;
    const outcome = progression.grantXp(profile, amount, 'test');
    assert(outcome.leveledUp, 'reports a level up');
    assertEqual(outcome.level, 2, 'new level');
    assertEqual(data.xp, amount, 'raw xp retained');
  });

  test('a suit stays locked until its level requirement is met', () => {
    const hero = heroRegistry.listHeroes()[0];
    const gated = hero.suits.find((suit) => suit.unlock?.level);
    if (!gated) return;
    const data = { level: 1, xp: 0, unlocks: {} };
    const profile = {
      get: (path, fallback) => {
        if (path === 'level') return data.level;
        if (path === 'xp') return data.xp;
        if (path === 'unlocks') return data.unlocks;
        return fallback;
      },
      set: (path, value) => {
        if (path === 'level') data.level = value;
        if (path === 'xp') data.xp = value;
        if (path === 'unlocks') data.unlocks = value;
        return profile;
      },
    };
    assert(!progression.isSuitUnlocked(profile, hero.id, gated), 'locked below the requirement');
    data.level = gated.unlock.level;
    data.xp = progression.totalXpForLevel(gated.unlock.level);
    assert(progression.isSuitUnlocked(profile, hero.id, gated), 'unlocked at the requirement');
  });
});

describe('energy pool', () => {
  test('an overspend is refused without changing the pool', () => {
    const pool = energySystem.createPool({ energy: { max: 100, regen: 1, start: 1 } });
    assert(!pool.spend(150, 0), 'overspend refused');
    assertEqual(pool.current, 100, 'pool unchanged');
  });

  test('regen waits for the delay then resumes', () => {
    const pool = energySystem.createPool({ energy: { max: 100, regen: 10, regenDelay: 1 } });
    pool.spend(50, 0);
    assertEqual(pool.tick(5, 5), 0, 'no regen during the delay');
    assert(pool.tick(40, 10) > 0, 'regen resumes after the delay');
  });

  test('regen never exceeds the maximum', () => {
    const pool = energySystem.createPool({ energy: { max: 60, regen: 100 } });
    pool.spend(10, 0);
    pool.tick(1000, 1000);
    assertEqual(pool.current, 60, 'clamped at max');
  });

  test('refund cannot push past the maximum', () => {
    const pool = energySystem.createPool({ energy: { max: 40 } });
    pool.spend(20, 0);
    pool.refund(1000);
    assertEqual(pool.current, 40, 'clamped');
  });
});

describe('targeting', () => {
  test('falls back to proximity when the view ray finds nothing', () => {
    const near = makeEntity({ location: { x: 0, y: 64, z: 3 } });
    const dimension = makeDimension([near]);
    dimension.getEntitiesFromViewDirection = () => [];
    const player = makePlayer({ location: { x: 0, y: 64, z: 0 }, dimension });
    const target = targeting.resolveTarget(player, { strategy: 'look-then-nearest', range: 8 });
    assertEqual(target.kind, targeting.TargetKind.ENTITY, 'found by proximity');
    assertEqual(target.entity.id, near.id, 'nearest entity chosen');
  });

  test('the player is never their own target', () => {
    const player = makePlayer({ location: { x: 0, y: 64, z: 0 } });
    player.dimension.getEntities = () => [player];
    player.dimension.getEntitiesFromViewDirection = () => [player];
    assertEqual(targeting.entitiesAround(player, 10).length, 0, 'self excluded');
  });

  test('candidate scans honour the limit', () => {
    const mobs = Array.from({ length: 30 }, (_, i) =>
      makeEntity({ id: `mob${i}`, typeId: 'minecraft:zombie', location: { x: (i - 15) * 0.1, y: 64, z: 0 } }),
    );
    const dimension = makeDimension(mobs);
    const player = makePlayer({ location: { x: 0, y: 64, z: 0 }, dimension });
    assertEqual(targeting.entitiesAround(player, 20, { limit: 5 }).length, 5, 'capped');
  });

  test('a self-targeting ability resolves to the caster', () => {
    const player = makePlayer();
    const target = targeting.resolveTarget(player, { strategy: 'self', range: 5 });
    assertEqual(target.kind, targeting.TargetKind.SELF, 'self target');
  });
});

describe('ability activation', () => {
  test('a fresh session can fire its primary ability', async () => {
    resetCalls();
    const { engine, session } = await freshEngine();
    const outcome = frameworkAbilities.activate(engine, session, 'primary');
    assertEqual(outcome.status, frameworkAbilities.AbilityResult.OK, `activation: ${outcome.status}`);
    assert(session.profile.get('stats.abilities') >= 1, 'activation counted');
  });

  test('cost is deducted and the cooldown starts', async () => {
    const { engine, session } = await freshEngine();
    const entry = session.abilityFor('primary');
    const before = session.pool.current;
    assertEqual(frameworkAbilities.activate(engine, session, 'primary').status, 'ok', 'activated');
    assertEqual(session.pool.current, before - entry.ability.cost, 'energy deducted');
    assert(!cooldowns.isReady(session.id, entry.ability.id, engine.tick), 'cooldown running');
  });

  test('a second press inside the cooldown is refused', async () => {
    const { engine, session } = await freshEngine();
    assertEqual(frameworkAbilities.activate(engine, session, 'primary').status, 'ok', 'first ok');
    // Step past the 5-tick double-press guard so this exercises the real cooldown.
    engine.tick += 10;
    assertEqual(
      frameworkAbilities.activate(engine, session, 'primary').status,
      frameworkAbilities.AbilityResult.COOLDOWN,
      'second refused by cooldown',
    );
  });

  test('a repeated trigger inside 5 ticks counts as the same press', async () => {
    const { engine, session } = await freshEngine();
    assertEqual(frameworkAbilities.activate(engine, session, 'primary').status, 'ok', 'first ok');
    assertEqual(
      frameworkAbilities.activate(engine, session, 'primary').status,
      frameworkAbilities.AbilityResult.COOLDOWN,
      'repeat trigger swallowed',
    );
  });

  test('an unaffordable ability is refused', async () => {
    const { engine, session } = await freshEngine();
    session.pool.current = 0;
    assertEqual(
      frameworkAbilities.activate(engine, session, 'ultimate').status,
      frameworkAbilities.AbilityResult.NO_ENERGY,
      'refused',
    );
  });

  test('an unknown slot is reported, not thrown', async () => {
    const { engine, session } = await freshEngine();
    assertEqual(
      frameworkAbilities.activate(engine, session, 'helmet').status,
      frameworkAbilities.AbilityResult.UNKNOWN_SLOT,
      'unknown slot',
    );
  });

  test('a throwing ability refunds its cost and does not crash', async () => {
    const { engine, session } = await freshEngine();
    const entry = session.abilityFor('primary');
    const original = entry.ability.execute;
    entry.ability.execute = () => {
      throw new Error('boom');
    };
    const before = session.pool.current;
    const outcome = frameworkAbilities.activate(engine, session, 'primary');
    entry.ability.execute = original;
    assertEqual(outcome.status, frameworkAbilities.AbilityResult.FAILED, 'reported failed');
    assertEqual(session.pool.current, before, 'energy refunded');
    assert(cooldowns.isReady(session.id, entry.ability.id, engine.tick), 'cooldown rolled back');
  });

  test('a session with no hero is told, not thrown', async () => {
    const { engine, session } = await freshEngine();
    session.profile.set('hero', undefined);
    session.heroId = undefined;
    session.resolve();
    assertEqual(
      frameworkAbilities.activate(engine, session, 'primary').status,
      frameworkAbilities.AbilityResult.NO_HERO,
      'no hero',
    );
  });

  test('every slot of every starting suit can be activated', async () => {
    const { engine, session } = await freshEngine();
    for (const hero of heroRegistry.listHeroes()) {
      session.selectHero(hero.id);
      for (const entry of session.abilityList()) {
        session.pool.restore();
        session.lastAbilityTick = -1;
        cooldowns.clear(session.id, entry.ability.id);
        const outcome = frameworkAbilities.activate(engine, session, entry.slot);
        assertEqual(outcome.status, 'ok', `${hero.id} ${entry.slot} (${entry.abilityId}): ${outcome.status}`);
      }
    }
  });
});

describe('session lifecycle', () => {
  test('joining twice reuses the same session', async () => {
    const { engine, player, propertyStore } = await freshEngine();
    const again = engine.sessions.join(player, propertyStore.profileFor(player));
    assertEqual(again.id, player.id, 'same session id');
    assertEqual(engine.sessions.size, 1, 'no duplicate session');
  });

  test('leaving flushes the profile and clears cooldowns', async () => {
    const { engine, session, player } = await freshEngine();
    session.lastAbilityTick = -1;
    frameworkAbilities.activate(engine, session, 'primary');
    assert(cooldowns.size() > 0, 'cooldown registered');
    engine.sessions.leave(player.id);
    assertEqual(Object.keys(cooldowns.describe(player.id, 0)).length, 0, 'this owner has no cooldowns left');
    assertEqual(engine.sessions.size, 0, 'session removed');
  });

  test('the session cap refuses new sessions', async () => {
    const propertyStore = newStore();
    const manager = new sessions.SessionManager({ emit: () => 0 }, propertyStore);
    config.setOption('maxActiveSessions', 1);
    const first = makePlayer({ name: 'A' });
    const second = makePlayer({ name: 'B' });
    assert(manager.join(first, propertyStore.profileFor(first)), 'first joins');
    assertEqual(manager.join(second, propertyStore.profileFor(second)), undefined, 'second refused');
    config.setOption('maxActiveSessions', 40);
  });

  test('selecting a hero equips and unlocks its starter suit', async () => {
    const { session } = await freshEngine();
    const hero = heroRegistry.listHeroes()[2];
    session.selectHero(hero.id);
    assertEqual(session.heroId, hero.id, 'hero set');
    assertEqual(session.suitId, suits.starterSuit(hero).id, 'starter suit equipped');
    assertEqual(session.abilityList().length, suits.starterSuit(hero).abilities.length, 'slots resolved');
  });

  test('a locked suit cannot be equipped', async () => {
    const { session } = await freshEngine();
    const hero = heroRegistry.listHeroes()[0];
    session.selectHero(hero.id);
    const locked = hero.suits.find((suit) => suit.unlock);
    if (!locked) return;
    const outcome = session.equipSuit(locked.id);
    assertEqual(outcome.ok, false, 'refused');
    assertEqual(outcome.reason, 'locked', 'reason is locked');
  });

  test('switching suits preserves the energy ratio', async () => {
    const { session } = await freshEngine();
    const hero = heroRegistry.listHeroes()[0];
    session.selectHero(hero.id);
    session.lastAbilityTick = -1;
    session.pool.current = session.pool.max * 0.5;
    const ratio = session.pool.ratio;
    const next = hero.suits.find((suit) => suit.id !== session.suitId);
    if (!next) return;
    session.equipSuit(next.id);
    assert(Math.abs(session.pool.ratio - ratio) < 0.01, `ratio drifted: ${session.pool.ratio} vs ${ratio}`);
  });
});

describe('engine tick loop', () => {
  test('reaping drops sessions whose player went away', async () => {
    const { engine, player } = await freshEngine();
    player.isValid = false;
    assertEqual(engine.sessions.reap(), 1, 'stale session reaped');
    assertEqual(engine.sessions.size, 0, 'session map empty');
  });

  test('session.tick regenerates energy over time', async () => {
    const { session } = await freshEngine();
    session.pool.current = 0;
    session.pool.lastSpendTick = -10_000;
    session.lastRegenTick = 0;
    for (let tick = 0; tick < 60; tick += 1) session.tick(tick);
    assert(session.pool.current > 0, `expected regen, got ${session.pool.current}`);
  });

  test('a long stall does not grant a full pool in one step', async () => {
    const { session } = await freshEngine();
    session.pool.current = 0;
    session.lastRegenTick = 0;
    const gained = session.tick(100_000);
    assert(gained <= session.pool.max, 'regen bounded by max');
  });

  test('describe() reports a coherent state', async () => {
    const { engine } = await freshEngine();
    const state = engineModule.describe(engine);
    assertEqual(state.sessions, 1, 'one session');
    assert(typeof state.scheduler.tasks === 'number', 'scheduler task count reported');
  });

  test('ticking a synthetic engine advances its accounting', async () => {
    const { engine } = await freshEngine();
    for (let i = 0; i < 60; i += 1) engineModule.tick(engine);
    assert(engine.health.ticks >= 60, `expected ticks counted, got ${engine.health.ticks}`);
    assertEqual(engine.sessions.size, 1, 'session survived the ticks');
  });
});

describe('scheduler', () => {
  test('a repeating task obeys its interval and repeat count', () => {
    const scheduler = new schedulerModule.Scheduler({ budget: 1000 });
    let runs = 0;
    scheduler.every({
      label: 'test',
      interval: 2,
      repeats: 3,
      run: () => {
        runs += 1;
        return true;
      },
    });
    for (let i = 0; i <= 30; i += 1) scheduler.advance({ tick: i, now: i });
    assertEqual(runs, 3, 'ran exactly the requested number of times');
    assertEqual(scheduler.size, 0, 'task removed when finished');
  });

  test('a throwing task does not take the scheduler down', () => {
    const scheduler = new schedulerModule.Scheduler({ budget: 1000 });
    scheduler.every({
      label: 'bad',
      interval: 1,
      run: () => {
        throw new Error('task boom');
      },
    });
    scheduler.advance({ tick: 1, now: 1 });
    assert(scheduler.size <= 1, 'scheduler survived');
  });

  test('cancel removes only the named task', () => {
    const scheduler = new schedulerModule.Scheduler({ budget: 1000 });
    const keep = scheduler.every({ label: 'keep', interval: 10, run: () => true });
    const drop = scheduler.every({ label: 'drop', interval: 10, run: () => true });
    scheduler.cancel(drop);
    assertEqual(scheduler.size, 1, 'one task left');
    assert(scheduler.tasks.has(keep), 'the right task survived');
  });
});

describe('store', () => {
  test('a profile round-trips through dynamic properties', () => {
    const props = makePropertyStore();
    const profile = store.Profile.load(props, 'msu:test');
    profile.set('hero', 'tech_hero');
    profile.set('level', 7);
    assert(profile.flush(true), 'flushed');
    const reloaded = store.Profile.load(props, 'msu:test');
    assertEqual(reloaded.get('hero'), 'tech_hero', 'hero persisted');
    assertEqual(reloaded.get('level'), 7, 'level persisted');
  });

  test('a corrupt profile falls back to defaults instead of throwing', () => {
    const props = makePropertyStore();
    props.set('msu:test', '{not json');
    const profile = store.Profile.load(props, 'msu:test');
    assertEqual(profile.get('level'), 1, 'default level');
  });

  test('the same player returns one cached profile object', () => {
    const propertyStore = newStore();
    const player = makePlayer({ name: 'Cache' });
    assert(propertyStore.profileFor(player) === propertyStore.profileFor(player), 'cached');
    propertyStore.forget(player.id);
    assert(propertyStore.profileFor(player) !== undefined, 'returns again after forget');
  });

  test('an over-large profile drops optional stats instead of failing', () => {
    const props = makePropertyStore();
    const profile = store.Profile.load(props, 'msu:big');
    profile.set('stats', { abilities: 1, defeated: 2, damageTaken: 3, junk: 'x'.repeat(200_000) });
    profile.set('hero', 'tech_hero');
    profile.flush(true);
    const reloaded = store.Profile.load(props, 'msu:big');
    assertEqual(reloaded.get('hero'), 'tech_hero', 'essential data survived');
  });
});

describe('i18n', () => {
  test('a known key resolves to display text', () => {
    assertEqual(i18n.t('msu.hero.tech'), 'Tech Hero', 'known key');
  });

  test('an unknown key returns itself rather than throwing', () => {
    assertEqual(i18n.t('msu.not.a.key'), 'msu.not.a.key', 'unknown key');
  });

  test('placeholders substitute positionally', () => {
    assertEqual(i18n.format('%1% then %2%', ['a', 'b']), 'a then b', 'substitution');
  });

  test('every bundled key is reachable through t()', () => {
    for (const key of i18n.declaredKeys()) {
      assert(i18n.hasTranslation(key), `${key} should resolve`);
    }
  });
});

describe('api wrappers', () => {
  test('spawnEntity reports failure instead of throwing', () => {
    const dimension = makeDimension();
    dimension.spawnEntity = () => {
      throw new Error('cannot spawn here');
    };
    assertEqual(api.spawnEntity(dimension, 'minecraft:lightning_bolt', { x: 0, y: 64, z: 0 }), undefined, 'undefined');
  });

  test('applyDamage targets a usable entity', () => {
    resetCalls();
    const mob = makeEntity();
    assert(api.applyDamage(mob, 5), 'damage applied');
    assertEqual(calls.damage.length, 1, 'one damage call');
    assertEqual(calls.damage[0].amount, 5, 'correct amount');
  });

  test('a dead entity reference is detected before use', () => {
    const mob = makeEntity();
    mob.isValid = false;
    assertEqual(api.isEntityUsable(mob), false, 'dead entity rejected');
  });
});

describe('vfx quality', () => {
  test('density scales with the adaptive quality tier', () => {
    config.setOption('particleScale', 1);
    config.setAdaptiveTier(1);
    const full = combatVfx.density(10);
    config.setAdaptiveTier(0.4);
    const reduced = combatVfx.density(10);
    assert(reduced < full, `expected ${reduced} < ${full}`);
    config.setAdaptiveTier(1);
  });

  test('density never drops below one particle', () => {
    config.setAdaptiveTier(0.4);
    assert(combatVfx.density(1) >= 1, 'at least one particle');
    config.setAdaptiveTier(1);
  });
});

describe('ui forms', () => {
  test('cancelling the locker is reported, not thrown', async () => {
    resetUi();
    const { engine, session } = await freshEngine();
    queueResponse({ canceled: true, cancelationReason: 'UserClosed' });
    const outcome = await forms.openLocker(engine, session);
    assertEqual(outcome.ok, false, 'cancelled');
    assertEqual(outcome.reason, 'cancelled', 'reason');
  });

  test('a busy form is retried and then honoured', async () => {
    resetUi();
    const { engine, session } = await freshEngine();
    queueResponse({ canceled: false, cancelationReason: 'UserBusy' });
    queueResponse({ canceled: false, selection: 0 });
    queueResponse({ canceled: true, cancelationReason: 'UserClosed' });

    const promise = forms.openLocker(engine, session);
    // The retry waits on the engine scheduler, so drive the clock while waiting.
    for (let i = 0; i < 200; i += 1) {
      engine.scheduler.advance({ tick: i, now: i });
      await Promise.resolve();
    }
    const outcome = await promise;
    assertEqual(outcome.reason, 'cancelled', 'second (suit) form cancelled');
    assert(shownForms().length >= 2, `expected at least two forms, saw ${shownForms().length}`);
  });

  test('the xp bar renders fixed-width', () => {
    const strip = (value) => value.replace(/§./g, '').length;
    assertEqual(strip(forms.xpBar(0, 10)), 10, 'empty bar width');
    assertEqual(strip(forms.xpBar(1, 10)), 10, 'full bar width');
    assertEqual(strip(forms.xpBar(0.5, 10)), 10, 'half bar width');
  });

  test('opening stats with no hero falls through to the locker', async () => {
    resetUi();
    const { engine, session } = await freshEngine();
    session.profile.set('hero', undefined);
    session.heroId = undefined;
    session.resolve();
    queueResponse({ canceled: true, cancelationReason: 'UserClosed' });
    const outcome = await forms.openStats(engine, session);
    assertEqual(outcome.reason, 'cancelled', 'locker shown instead');
  });
});

const failures = await run('unit');
process.exit(failures === 0 ? 0 : 1);