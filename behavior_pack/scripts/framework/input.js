/**
 * Input handling.
 *
 * Bedrock cannot bind new keys, so the hero kit is driven by gestures around
 * one item: the Hero Core. Holding it and using it casts the primary, sneaking
 * while using it cycles suits, and sneak plus jump shows energy. That leaves
 * the whole touch control set untouched, which is the point on a phone.
 *
 * The gesture table is data, so a future version can expose remapping without
 * touching the handlers.
 */
import { POWER_ITEM, ABILITY_SLOTS } from '../core/constants.js';
import { isPlayerUsable, sendMessage, subscribe } from '../core/api.js';
import { activate, AbilityResult } from './abilities.js';
import { logDebug } from '../core/log.js';
import { t } from './i18n.js';

export const Gestures = {
  /** Use the power item flat-footed: cast the primary ability. */
  CAST_PRIMARY: 'cast-primary',
  /** Sneak while using the power item: equip the next unlocked suit. */
  CYCLE_SUIT: 'cycle-suit',
  /** Sneak while jumping: report energy, the one read-out that matters mid-fight. */
  SHOW_ENERGY: 'show-energy',
};

/**
 * @param {object} event Bedrock `ItemUseAfterEvent`.
 * @returns {string|undefined} The gesture that was recognised.
 */
export function classifyItemUse(event) {
  if (!event?.itemStack || event.itemStack.typeId !== POWER_ITEM) return undefined;
  const player = event.source ?? event.player;
  if (!isPlayerUsable(player)) return undefined;
  const sneaking = isPlayerSneaking(player);
  return sneaking ? Gestures.CYCLE_SUIT : Gestures.CAST_PRIMARY;
}

export function isPlayerSneaking(player) {
  try {
    const sneaking = player.isSneaking;
    if (typeof sneaking === 'boolean') return sneaking;
  } catch {
    // Fall through to the component form on older builds.
  }
  try {
    return Boolean(player.getComponent('minecraft:is_sneaking'));
  } catch {
    return false;
  }
}

/**
 * Handles a recognised gesture. Returns true when the gesture was consumed, so
 * the caller can suppress the default item behaviour.
 */
export function handleItemUse(engine, session, gesture) {
  if (!session) return false;
  switch (gesture) {
    case Gestures.CAST_PRIMARY: {
      const primary = session.abilityFor('primary');
      if (!primary) return false;
      const outcome = activate(engine, session, 'primary');
      return outcome.status === AbilityResult.OK;
    }
    case Gestures.CYCLE_SUIT: {
      const next = session.cycleSuit(1);
      if (next) {
        sendMessage(session.player, t('msu.message.suit_equipped', t(next.name)));
        return true;
      }
      sendMessage(session.player, t('msu.message.suit_locked'));
      return false;
    }
    case Gestures.SHOW_ENERGY: {
      reportEnergy(engine, session);
      return true;
    }
    default:
      logDebug('input', `unhandled gesture ${gesture}`);
      return false;
  }
}

export function reportEnergy(engine, session) {
  if (!session?.pool) return;
  const { current, max } = session.pool.describe();
  sendMessage(session.player, t('msu.message.energy', current, max));
}

/**
 * Fires the slot bound to a keyboard/controller action, used by the script
 * event interface (`/scriptevent msu:cast ultimate`). Because touch cannot bind
 * keys, this is mainly a testing and companion-app surface.
 */
export function handleCastRequest(engine, session, slot) {
  if (!ABILITY_SLOTS.includes(slot)) return { status: AbilityResult.INVALID };
  return activate(engine, session, slot);
}

export function inputHelp() {
  return [
    t('msu.message.hint_key', POWER_ITEM),
    t('msu.message.hint_swap'),
    t('msu.message.hint_energy'),
  ];
}
/**
 * Wires the Hero Core gestures to the world event. Called from bootstrap with
 * the engine, because the handlers need to activate abilities and swap suits.
 */
export function installInput(engine) {
  subscribe('afterEvents.itemUse', (event) => {
    const session = engine.sessions?.get(event.source);
    if (!session) return;
    const gesture = classifyItemUse(event);
    if (!gesture) return;
    handleItemUse(engine, session, gesture);
  });
  return true;
}
