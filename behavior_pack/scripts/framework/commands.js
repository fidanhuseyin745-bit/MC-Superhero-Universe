/**
 * Operator commands, driven by script events.
 *
 * Bedrock offers `/scriptevent` as the reliable way for an addon to expose
 * commands, and it works identically on a phone. Every command is registered in
 * one table so the permission check, the argument parsing and the help text
 * cannot drift apart.
 *
 * Usage in game: `/scriptevent msu:hero tech_hero`
 */
import { STORE_KEYS } from '../core/constants.js';
import { getPlayers, isPlayerUsable, sendMessage, subscribe } from '../core/api.js';
import { describe as describeEngine } from '../core/engine.js';
import { getHero } from '../heroes/registry.js';
import { count as abilityCount } from '../abilities/library.js';
import { totalXpForLevel } from '../progression/index.js';
import { setBypass } from './abilities.js';
import { handleCastRequest } from './input.js';
import { configSnapshot, getOption, setOption } from '../core/config.js';
import { logInfo, logWarn } from '../core/log.js';
import { t } from './i18n.js';
import { openLocker, openStats } from '../ui/forms.js';

/** Commands anyone may run on their own session. */
const PLAYER_COMMANDS = new Set(['menu', 'stats', 'energy', 'hero', 'suit', 'cast']);
/** Commands reserved for operators. */
const OPERATOR_COMMANDS = new Set(['reload', 'debug', 'give', 'xp', 'bypass', 'config']);

export function commandTable() {
  return {
    menu: { usage: 'msu:menu', description: 'Open the suit locker.', run: (ctx) => openLocker(ctx.engine, ctx.session) },
    stats: { usage: 'msu:stats', description: 'Show progress.', run: (ctx) => openStats(ctx.engine, ctx.session) },
    energy: {
      usage: 'msu:energy',
      description: 'Report current energy.',
      run: (ctx) => {
        const pool = ctx.session?.pool?.describe();
        if (!pool) return { ok: false, reason: 'no-session' };
        sendMessage(ctx.session.player, t('msu.message.energy', pool.current, pool.max));
        return { ok: true };
      },
    },
    hero: {
      usage: 'msu:hero <heroId>',
      description: 'Select a hero.',
      run: (ctx) => {
        const heroId = ctx.args[0];
        if (!heroId) return { ok: false, reason: 'usage', usage: 'msu:hero tech_hero' };
        if (!getHero(heroId)) return { ok: false, reason: 'unknown-hero' };
        ctx.session.selectHero(heroId);
        ctx.session.flush(true);
        sendMessage(ctx.session.player, t('msu.message.selected', t(ctx.session.hero.name)));
        return { ok: true, hero: heroId };
      },
    },
    suit: {
      usage: 'msu:suit <suitId>',
      description: 'Equip a suit you have unlocked.',
      run: (ctx) => {
        const suitId = ctx.args[0];
        if (!suitId) return { ok: false, reason: 'usage', usage: 'msu:suit mark2' };
        const outcome = ctx.session.equipSuit(suitId);
        if (!outcome.ok) {
          const message = outcome.reason === 'locked' ? t('msu.message.suit_locked') : t('msu.message.unknown_suit');
          sendMessage(ctx.session.player, message);
          return { ok: false, reason: outcome.reason };
        }
        ctx.session.flush(true);
        sendMessage(ctx.session.player, t('msu.message.suit_equipped', t(outcome.suit.name)));
        return { ok: true, suit: suitId };
      },
    },
    cast: {
      usage: 'msu:cast <slot>',
      description: 'Fire an ability slot (companion apps and testing).',
      run: (ctx) => handleCastRequest(ctx.engine, ctx.session, ctx.args[0]),
    },
    reload: {
      usage: 'msu:reload',
      description: 'Report engine and content state.',
      run: (ctx) => {
        logInfo('commands', `reload requested by ${ctx.player.name}`);
        const state = describeEngine(ctx.engine);
        sendMessage(
          ctx.player,
          t('msu.message.reloaded') + ` \u00a77${state.sessions} session(s), ${abilityCount()} abilities`,
        );
        return { ok: true, state };
      },
    },
    debug: {
      usage: 'msu:debug',
      description: 'Print engine diagnostics.',
      run: (ctx) => {
        const state = describeEngine(ctx.engine);
        const summary = [
          `tick=${state.tick}`,
          `sessions=${state.sessions}`,
          `lastTick=${state.lastTickMs}ms`,
          `slowTicks=${state.slowTicks}`,
          `quality=${state.qualityTier}`,
          `scheduler=${state.scheduler.size}`,
          `abilities=${abilityCount()}`,
        ].join(' ');
        sendMessage(ctx.player, `\u00a77${summary}`);
        logInfo('commands', summary);
        return { ok: true, state };
      },
    },
    xp: {
      usage: 'msu:xp <heroId> <level>',
      description: 'Set a hero to a level threshold (operator).',
      run: (ctx) => {
        const heroId = ctx.args[0];
        const level = Number(ctx.args[1]);
        const hero = getHero(heroId);
        if (!hero || !Number.isFinite(level)) return { ok: false, reason: 'usage', usage: 'msu:xp tech_hero 10' };
        const target = ctx.target ?? ctx.player;
        const profile = ctx.engine.store.player(target);
        profile.set('hero', hero.id);
        profile.set('xp', totalXpForLevel(Math.max(1, Math.round(level))));
        profile.set('level', Math.max(1, Math.round(level)));
        profile.flush(true);
        const session = ctx.engine.sessions.get(target);
        if (session) session.resolve();
        sendMessage(ctx.player, `\u00a7aSet ${target.name} to ${heroId} level ${level}.`);
        return { ok: true };
      },
    },
    bypass: {
      usage: 'msu:bypass <cooldowns|energy|off>',
      description: 'Toggle ability gating for testing (operator).',
      run: (ctx) => {
        const mode = ctx.args[0] ?? 'off';
        setBypass(ctx.engine, {
          cooldowns: mode === 'cooldowns' || mode === 'all',
          energy: mode === 'energy' || mode === 'all',
        });
        sendMessage(ctx.player, `\u00a7aBypass: cooldowns=${ctx.engine.allowCooldownBypass} energy=${ctx.engine.allowEnergyBypass}`);
        return { ok: true, allowCooldownBypass: ctx.engine.allowCooldownBypass, allowEnergyBypass: ctx.engine.allowEnergyBypass };
      },
    },
    config: {
      usage: 'msu:config <key> <value>',
      description: 'Read or set a runtime option (operator).',
      run: (ctx) => {
        const [key, raw] = ctx.args;
        if (!key) return { ok: true, config: configSnapshot() };
        if (raw === undefined) return { ok: true, key, value: getOption(key) };
        const numeric = Number(raw);
        setOption(key, Number.isNaN(numeric) ? raw : numeric);
        sendMessage(ctx.player, `\u00a7a${key} = ${getOption(key)}`);
        return { ok: true, key, value: getOption(key) };
      },
    },
  };
}

export function isOperator(player) {
  // `isOp` is not exposed to scripts, so operator-only commands are gated on the
  // world setting rather than a per-player check. Games that need per-player
  // gating can flip `allowOperatorCommands` off and use the UI instead.
  return getOption('allowOperatorCommands') !== false ? isGameOperator(player) : false;
}

function isGameOperator(player) {
  try {
    // Available on some builds via the player permission level.
    const level = player.permissionLevel;
    if (typeof level === 'string') return level === 'Operator' || level === 'operator';
    if (typeof level === 'number') return level >= 1;
  } catch {
    // Fall through.
  }
  return getOption('trustAllPlayers') === true;
}

/**
 * Executes a parsed command.
 * @param {object} engine
 * @param {object} request { command, args, player }
 */
export function runCommand(engine, request) {
  const table = commandTable();
  const command = String(request.command ?? '').toLowerCase();
  const spec = table[command];
  if (!spec) return { ok: false, reason: 'unknown-command', command };

  const session = engine.sessions?.get(request.player);
  if (!session) return { ok: false, reason: 'no-session' };

  if (OPERATOR_COMMANDS.has(command) && !isOperator(request.player)) {
    sendMessage(request.player, t('msu.message.no_permission'));
    return { ok: false, reason: 'no-permission' };
  }

  const context = {
    engine,
    session,
    player: request.player,
    args: request.args ?? [],
    target: findPlayer(engine, request.args?.[0]),
  };

  try {
    return spec.run(context) ?? { ok: true };
  } catch (error) {
    logWarn('commands', `${command} failed: ${error.message}`);
    return { ok: false, reason: 'failed', message: error.message };
  }
}

function findPlayer(engine, name) {
  if (!name) return undefined;
  for (const player of getPlayers()) {
    if (player.name.toLowerCase() === String(name).toLowerCase()) return player;
  }
  return undefined;
}

/**
 * Parses `msu:<command> <arg> <arg>` from a script event message.
 * Returns undefined when the message is not addressed to this addon.
 */
export function parseScriptEvent(message, namespace) {
  const prefix = `${namespace}:`;
  const text = String(message ?? '').trim();
  if (!text.startsWith(prefix)) return undefined;
  const [command, ...args] = text.slice(prefix.length).split(/\s+/).filter(Boolean);
  return { command, args };
}

/** Installs the script event listener. Safe to call when the channel is absent. */
export function installCommands(engine) {
  subscribe('afterEvents.scriptEventReceive', (event) => {
    const id = event.id ?? '';
    if (!id.startsWith(`${STORE_KEYS.world.split(':')[0]}:`)) return;
    const parsed = parseScriptEvent(id, 'msu');
    if (!parsed) return;
    const player = event.sourceEntity;
    if (!isPlayerUsable(player)) return;
    runCommand(engine, { ...parsed, player });
  });

  // Keep the help text honest: it is generated from the same table.
  engine.commandHelp = Object.entries(commandTable()).map(([name, spec]) => `${name}: ${spec.description}`);
  logInfo('commands', `registered ${engine.commandHelp.length} script events`);
  return engine.commandHelp;
}

export { PLAYER_COMMANDS, OPERATOR_COMMANDS };