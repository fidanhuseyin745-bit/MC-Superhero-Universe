/**
 * HUD rendering via the action bar.
 *
 * The action bar is updated on a slow interval and only when the rendered string
 * actually changes, because writing to it is a client round trip and doing that
 * every tick is one of the easiest ways to hurt frame rate on a phone.
 */
import { formatEnergy, formatDuration, round } from '../core/units.js';
import { resolveTarget } from '../combat/targeting.js';
import { isCreativeOrSpectator, isPlayerUsable } from '../core/api.js';
import { remaining } from '../systems/cooldowns.js';
import { t } from './i18n.js';

const READY = '\u25cf';
const EMPTY = '\u25cb';

/** Compact single-line representation of a session. */
export function render(session, tick) {
  if (!session?.hero || !session.pool) return t('msu.message.no_hero');

  const energy = session.pool.describe();
  const pips = session.abilityList()
    .map((entry) => {
      const left = remaining(session.id, entry.ability.id, tick);
      return left > 0 ? EMPTY : READY;
    })
    .join('');

  const parts = [
    `${session.hero.name.includes('.') ? t(session.hero.name) : session.hero.name}`,
    `${t(session.suit.name)}`,
    `L${session.profile.get('level', 1)}`,
    `${t('msu.message.energy', energy.current, energy.max)}`,
    pips,
  ];

  const nextReady = session.abilityList()
    .map((entry) => remaining(session.id, entry.ability.id, tick))
    .filter((left) => left > 0)
    .sort((a, b) => a - b)[0];

  parts.push(nextReady ? t('msu.status.cooldown', formatDuration(nextReady)) : t('msu.status.ready'));

  // The action bar is narrow on a phone; alternate the scheme with the charge.
  const ratio = energy.ratio;
  const colour = ratio > 0.5 ? '\u00a7a' : ratio > 0.2 ? '\u00a7e' : '\u00a7c';
  const suffix = isCreativeOrSpectator(session.player) ? ' \u00a7dCREATIVE' : '';

  return `\u00a7b${parts[0]} \u00a77${parts[1]} ${colour}${parts[3]}\u00a77 ${parts[4]} ${parts[5]}${suffix}`;
}

/** Short, occasionally-updated detail line shown under the main HUD. */
export function renderDetail(session, tick) {
  const target = resolveTarget(session.player, { strategy: 'look', range: 8 });
  if (target.kind === 'none') return undefined;
  return `\u00a78${round(target.distance, 1)}m`;
}

/**
 * Pushes the HUD when it changed. `onScreenDisplay.setActionBar` costs a packet,
 * so the caller decides the cadence and this function decides whether it is worth
 * sending at all.
 *
 * @returns {boolean} true when the action bar was written.
 */
export function update(session, tick) {
  if (!isPlayerUsable(session.player)) return false;
  const text = render(session, tick);
  if (text === session.hudCache) return false;
  session.hudCache = text;
  try {
    session.player.onScreenDisplay.setActionBar(text);
    return true;
  } catch {
    return false;
  }
}

/** Full-screen status used by the stats form. */
export function statsBody(session) {
  const energy = session.pool?.describe() ?? { current: 0, max: 0 };
  return t(
    'msu.ui.stats.body',
    t(session.hero.name),
    t(session.suit.name),
    energy.current,
    energy.max,
    session.profile.get('level', 1),
  );
}

export { formatEnergy };