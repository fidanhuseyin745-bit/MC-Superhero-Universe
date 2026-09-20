/**
 * Progression: XP, levels, and which suits a player has earned.
 *
 * A suit may declare `unlock: { level, xp }`. Gating lives here rather than in
 * you each hero so that the rules stay identical across the roster, and so
 * that a new hero cannot accidentally bypass the gates.
 */

export const MAX_LEVEL = 40;

/** XP required to advance from `level` to `level + 1`. */
export function xpForLevel(level) {
  const safe = Math.max(1, Math.floor(level));
  return Math.round(120 * Math.pow(1.16, safe - 1));
}

/** Total XP required to reach `level` from 1. */
export function totalXpForLevel(level) {
  let total = 0;
  for (let i = 1; i < level; i += 1) total += xpForLevel(i);
  return total;
}

/** Resolves a raw XP total into `{ level, into, needed, ratio }`. */
export function levelProgress(xp) {
  let level = 1;
  let remaining = Math.max(0, xp);
  while (level < MAX_LEVEL && remaining >= xpForLevel(level)) {
    remaining -= xpForLevel(level);
    level += 1;
  }
  const needed = level >= MAX_LEVEL ? 0 : xpForLevel(level);
  return {
    level,
    into: remaining,
    needed,
    ratio: needed === 0 ? 1 : remaining / needed,
  };
}

export function unlockKey(heroId, suitId) {
  return `${heroId}/${suitId}`;
}

/**
 * XP reward tables. Values are tuned so a fresh player earns the first alternate
 * suit inside a single play session, without the roster unlocking at once.
 */
export const XpRewards = {
  abilityUsed: 2,
  abilityHit: 4,
  entityDefeated: 12,
  bossDefeated: 60,
  levelUpBonus: 10,
};

/**
 * Grants XP to a profile, applying level-ups. Returns a summary so the caller
 * can react (announce, unlock suits) in one place.
 *
 * @returns {{gained: number, level: number, previousLevel: number, leveledUp: boolean}}
 */
export function grantXp(profile, amount, reason = 'unknown') {
  const gained = Math.max(0, Math.round(amount));
  if (gained === 0) return { gained: 0, level: profile.get('level', 1), previousLevel: profile.get('level', 1), leveledUp: false };

  const previousLevel = profile.get('level', 1);
  const total = profile.get('xp', 0) + gained;
  profile.set('xp', total);
  const { level } = levelProgress(total);
  profile.set('level', level);

  return {
    gained,
    previousLevel,
    level,
    leveledUp: level > previousLevel,
    reason,
  };
}

/** True when the player has earned the right to equip this suit. */
export function isSuitUnlocked(profile, heroId, suit, options = {}) {
  if (profile.get(`unlocks.${unlockKey(heroId, suit.id)}`)) return true;
  const requirement = suit.unlock;
  if (!requirement) return options.firstOfHero === true;
  const level = profile.get('level', 1);
  if (requirement.level && level < requirement.level) return false;
  if (requirement.xp && profile.get('xp', 0) < requirement.xp) return false;
  return true;
}

export function markSuitUnlocked(profile, heroId, suitId) {
  profile.set(`unlocks.${unlockKey(heroId, suitId)}`, true);
  return unlockKey(heroId, suitId);
}

/** Lists the suit ids currently available for a hero. */
export function availableSuits(profile, hero) {
  const available = [];
  hero.suits.forEach((suit, index) => {
    if (isSuitUnlocked(profile, hero.id, suit, { firstOfHero: index === 0 })) available.push(suit.id);
  });
  return available;
}

/** Human-readable requirement, used by the suit locker form. */
export function describeRequirement(suit) {
  const requirement = suit.unlock;
  if (!requirement) return 'unlocked by default';
  const parts = [];
  if (requirement.level) parts.push(`level ${requirement.level}`);
  if (requirement.xp) parts.push(`${requirement.xp} XP`);
  return parts.length ? `requires ${parts.join(' and ')}` : 'unlocked by default';
}