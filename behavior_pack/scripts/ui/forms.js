/**
 * In-game forms: the suit locker and the progress screen.
 *
 * Forms are the only practical menu surface on Bedrock, and on a phone they are
 * the difference between a hero picker that works and one that requires typing
 * ids. Two rules keep them usable:
 *
 *   - `show()` can reject with `UserBusy` (the player has another screen open),
 *     so every call goes through `showWithRetry`;
 *   - a form is never opened while another is open for the same player, which is
 *     what produces the second, confusing "busy" message.
 */
import { ActionFormData, FormCancelationReason } from '@minecraft/server-ui';
import { isPlayerUsable } from '../core/api.js';
import { logDebug, logWarn } from '../core/log.js';
import { listHeroes } from '../heroes/registry.js';
import { availableSuits, describeRequirement, levelProgress } from '../progression/index.js';
import { t } from '../framework/i18n.js';

/** Players with a form currently open, so a second open is refused locally. */
const openForms = new Set();

const RETRY_LIMIT = 4;
const RETRY_INTERVAL = 10;

/**
 * Shows a form, retrying while the player is busy.
 *
 * @param {object} engine
 * @param {object} session
 * @param {object} form An `ActionFormData` or `ModalFormData`.
 * @param {string} label Diagnostics label.
 * @returns {Promise<object|undefined>} The response, or undefined on failure.
 */
export async function showWithRetry(engine, session, form, label) {
  const { player } = session;
  if (!isPlayerUsable(player)) return undefined;
  if (openForms.has(session.id)) {
    logDebug('ui', `${label}: a form is already open for ${player.name}`);
    return undefined;
  }

  openForms.add(session.id);
  try {
    for (let attempt = 1; attempt <= RETRY_LIMIT; attempt += 1) {
      const response = await form.show(player);
      if (response.cancelationReason !== FormCancelationReason.UserBusy) return response;
      await waitTicks(engine, RETRY_INTERVAL);
      if (!isPlayerUsable(player)) return undefined;
    }
    logWarn('ui', `${label}: player stayed busy; giving up`);
    return undefined;
  } catch (error) {
    logWarn('ui', `${label} failed: ${error.message}`);
    return undefined;
  } finally {
    openForms.delete(session.id);
  }
}

/** Awaits N ticks through the engine scheduler, so a pause cannot leak. */
function waitTicks(engine, ticks) {
  return new Promise((resolve) => {
    let remaining = ticks;
    engine.scheduler.every({
      label: 'ui:retry-wait',
      interval: 1,
      run: () => {
        remaining -= 1;
        if (remaining > 0) return true;
        resolve();
        return false;
      },
    });
  });
}

/** Hero + suit picker. */
export async function openLocker(engine, session) {
  if (!session) return { ok: false, reason: 'no-session' };
  const heroes = listHeroes();
  if (heroes.length === 0) return { ok: false, reason: 'no-heroes' };

  const menu = new ActionFormData().title(t('msu.ui.menu.title')).body(t('msu.ui.menu.body'));

  const current = session.heroId;
  for (const hero of heroes) {
    const mark = hero.id === current ? '\u2705 ' : '';
    menu.button(`${mark}${t(hero.name)}`);
  }
  menu.button('\u00a7cCancel');

  const response = await showWithRetry(engine, session, menu, 'locker');
  if (!response || response.canceled || response.selection === undefined) return { ok: false, reason: 'cancelled' };
  if (response.selection >= heroes.length) return { ok: false, reason: 'cancelled' };

  const hero = heroes[response.selection];
  const unlocked = new Set(availableSuits(session.profile, hero));

  const suitMenu = new ActionFormData().title(t(hero.name)).body(hero.description ? t(hero.description) : t('msu.ui.menu.body'));

  for (const suit of hero.suits) {
    const locked = !unlocked.has(suit.id);
    const equipped = suit.id === session.suitId && hero.id === session.heroId;
    const label = `${equipped ? '\u2705 ' : ''}${t(suit.name)}`;
    suitMenu.button(`${label}${locked ? `\n\u00a78${describeRequirement(suit)}` : ''}`);
  }
  suitMenu.button('\u00a7cCancel');

  const suitResponse = await showWithRetry(engine, session, suitMenu, 'suit');
  if (!suitResponse || suitResponse.canceled || suitResponse.selection === undefined) {
    return { ok: false, reason: 'cancelled' };
  }
  if (suitResponse.selection >= hero.suits.length) return { ok: false, reason: 'cancelled' };

  const chosen = hero.suits[suitResponse.selection];

  if (hero.id !== session.heroId) session.selectHero(hero.id);
  const outcome = session.equipSuit(chosen.id);
  session.flush(true);

  if (!outcome.ok) return { ok: false, reason: outcome.reason, suit: chosen.id };
  return { ok: true, hero: hero.id, suit: chosen.id };
}

/** Progress screen: level, XP bar, energy and the equipped kit. */
export async function openStats(engine, session) {
  if (!session?.hero) {
    // With no hero the stats screen would be empty; offer the locker instead.
    return openLocker(engine, session);
  }

  const progress = levelProgress(session.profile.get('xp', 0));
  const energy = session.pool.describe();

  const body = [
    t('msu.ui.stats.body', t(session.hero.name), t(session.suit.name), energy.current, energy.max, progress.level),
    '',
    `\u00a77${xpBar(progress.ratio, 12)} \u00a7f${progress.into}/${progress.needed} XP`,
    `\u00a77Abilities used: \u00a7f${session.profile.get('stats.abilities', 0)}`,
    `\u00a77Entities defeated: \u00a7f${session.profile.get('stats.defeated', 0)}`,
    '',
    `\u00a77${session.abilityList().map((entry) => t(entry.ability.name)).join(', ')}`,
  ].join('\n');

  const form = new ActionFormData()
    .title(t('msu.ui.stats.title'))
    .body(body)
    .button('\u00a7aChange suit')
    .button('\u00a7cClose');

  const response = await showWithRetry(engine, session, form, 'stats');
  if (response && !response.canceled && response.selection === 0) return openLocker(engine, session);
  return { ok: true, closed: true };
}

/** Renders a ratio as a width-limited block bar. */
export function xpBar(ratio, width = 10) {
  const filled = Math.max(0, Math.min(width, Math.round(ratio * width)));
  return `\u00a7a${'\u2588'.repeat(filled)}\u00a78${'\u2591'.repeat(width - filled)}`;
}

/** Installs the interaction surface. Called once from bootstrap. */
export function installUi(engine) {
  engine.openLocker = (session) => openLocker(engine, session);
  engine.openStats = (session) => openStats(engine, session);
  logDebug('ui', 'forms installed');
  return true;
}
