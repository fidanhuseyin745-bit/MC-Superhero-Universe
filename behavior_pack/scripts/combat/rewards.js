/**
 * Combat feedback: XP, defeat tracking and the level-up unlocks that follow.
 *
 * Combat rewards are intentionally conservative. A kill is worth enough to feel
 * worthwhile but not enough to unlock the roster in one fight, and XP is
 * attributed to the killer rather than broadcast, so a group fight does not
 * hand the reward to everyone nearby.
 */
import { Events } from '../core/bus.js';
import { XpRewards, grantXp, isSuitUnlocked, markSuitUnlocked } from '../progression/index.js';
import { isPlayerUsable, sendMessage } from '../core/api.js';
import { logDebug } from '../core/log.js';
import { t } from '../framework/i18n.js';

/** Boss-ish entity ids worth more XP. */
const BOSS_TYPES = new Set([
  'minecraft:ender_dragon',
  'minecraft:wither',
  'minecraft:warden',
  'minecraft:elder_guardian',
]);

export function xpForDefeat(entityTypeId) {
  return BOSS_TYPES.has(entityTypeId) ? XpRewards.bossDefeated : XpRewards.entityDefeated;
}

/**
 * Records a defeat for the session that caused it and grants XP.
 * @returns {{gained: number, leveledUp: boolean, unlocked: string[]}}
 */
export function awardDefeat(engine, session, entityTypeId) {
  if (!session) return { gained: 0, leveledUp: false, unlocked: [] };
  session.profile.set('stats.defeated', session.profile.get('stats.defeated', 0) + 1);

  const reward = xpForDefeat(entityTypeId);
  const outcome = grantXp(session.profile, reward, 'defeat');
  const unlocked = outcome.leveledUp ? unlockEligibleSuits(engine, session) : [];

  engine.bus.emit(Events.XP_GAINED, { session, amount: outcome.gained, reason: 'defeat' });
  if (outcome.leveledUp) {
    engine.bus.emit(Events.LEVEL_UP, { session, level: outcome.level, previousLevel: outcome.previousLevel });
  }
  logDebug('combat', `${session.player.name} defeated ${entityTypeId} (+${reward} xp)`);
  return { gained: outcome.gained, leveledUp: outcome.leveledUp, unlocked };
}

/** Grants XP for connecting with an ability, capped per activation. */
export function awardHit(engine, session, hits = 1) {
  if (!session) return 0;
  const amount = XpRewards.abilityHit * Math.min(3, Math.max(1, hits));
  const outcome = grantXp(session.profile, amount, 'hit');
  engine.bus.emit(Events.XP_GAINED, { session, amount: outcome.gained, reason: 'hit' });
  return outcome.gained;
}

/** Charges the player for damage taken, so DEF suit slots read as worthwhile. */
export function recordDamage(session, amount) {
  if (!session) return;
  session.profile.set('stats.damageTaken', session.profile.get('stats.damageTaken', 0) + Math.round(amount));
}

/**
 * Unlocks every suit the player now qualifies for and tells them about it.
 * Called after a level-up so a new tier is available immediately, without the
 * player having to rejoin.
 */
export function unlockEligibleSuits(engine, session) {
  const hero = session.hero;
  if (!hero) return [];
  const unlocked = [];
  hero.suits.forEach((suit, index) => {
    if (isSuitUnlocked(session.profile, hero.id, suit, { firstOfHero: index === 0 })) return;
    const qualifies = isSuitUnlocked(session.profile, hero.id, { ...suit, unlock: undefined }, { firstOfHero: true });
    if (!qualifies) return;
    markSuitUnlocked(session.profile, hero.id, suit.id);
    unlocked.push(suit.id);
  });

  if (unlocked.length > 0) {
    const names = unlocked.map((id) => t(hero.suits.find((suit) => suit.id === id).name)).join(', ');
    sendMessage(session.player, t('msu.message.suit_equipped', names));
  }
  session.dirty = true;
  return unlocked;
}

/**
 * Wires combat events onto the bus. Kept separate from the tick loop so the
 * engine's hot path stays free of event plumbing.
 */
export function installCombatHooks(engine, bus) {
  bus.on(Events.ABILITY_USED, ({ session, result }) => {
    if (!session || !result?.hit) return;
    awardHit(engine, session, result.hits ?? 1);
  });

  bus.on(Events.DAMAGE_TAKEN, ({ session, amount }) => recordDamage(session, amount));

  bus.on(Events.LEVEL_UP, ({ session, level }) => {
    if (!isPlayerUsable(session.player)) return;
    const heroName = session.hero ? t(session.hero.name) : '';
    sendMessage(session.player, t('msu.message.level_up', heroName, level));
  });
}

export { XpRewards };