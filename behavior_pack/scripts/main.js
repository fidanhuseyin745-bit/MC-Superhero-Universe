/**
 * Entry point.
 *
 * Bedrock loads this file when the behaviour pack's script module starts. It
 * does nothing except wait for the earliest safe world event and hand control to
 * `startAddon`, so that the entire lifecycle stays testable and every failure is
 * reported through the logger rather than as an empty console.
 *
 * The `import` of the engine is intentionally last: the modules above define the
 * logger and error types the engine reports through, so a load-time error still
 * has somewhere to go.
 */
import { subscribe } from './core/api.js';
import { logError, logWarn } from './core/log.js';
import { MissingEventError } from './core/errors.js';

let started = false;

async function launch(label) {
  if (started) return;
  started = true;
  try {
    // Imported lazily so a syntax error in one system does not stop the world
    // event from ever firing; it surfaces here with a usable stack instead.
    const { startAddon } = await import('./framework/bootstrap.js');
    await startAddon();
  } catch (error) {
    started = false;
    logError(`main:${label}`, error);
  }
}

/**
 * `worldInitialize` is the earliest event that guarantees dynamic properties and
 * the script API are usable, so it is the preferred entry. Older builds only
 * offer `worldLoad`, hence the pair.
 */
const entryEvents = ['afterEvents.worldInitialize', 'afterEvents.worldLoad', 'beforeEvents.worldInitialize'];

let installed = 0;
for (const eventPath of entryEvents) {
  if (subscribe(eventPath, () => launch(eventPath))) installed += 1;
}

if (installed === 0) {
  // Nothing to hook: fail loudly once, because a silent no-op pack is the
  // hardest failure to diagnose from a phone.
  logWarn('main', new MissingEventError('worldInitialize/worldLoad').message);
}