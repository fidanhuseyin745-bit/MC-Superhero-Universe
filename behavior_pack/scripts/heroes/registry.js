/**
 * Hero registry and content loader.
 *
 * Heroes are registered by id and loaded in isolation: a hero file that throws
 * or references an unknown ability is reported and skipped, while the rest of
 * the roster keeps working. That property matters because content is edited over
 * GitHub on a phone, where there is no debugger.
 */
import { validateHero } from '../suits/define.js';
import { validateReferences } from '../abilities/registry.js';
import { registerCoreAbilities } from '../abilities/library.js';
import { logError, logInfo, logWarn } from '../core/log.js';

const heroes = new Map();
const order = [];

/** Guards the one-way dependency: abilities must exist before heroes load. */
let contentReady = undefined;

/**
 * Registers the core abilities once, before any hero is validated. Idempotent,
 * so it is safe to call from the loader, from bootstrap and from a test.
 */
export function ensureContentReady() {
  if (!contentReady) {
    contentReady = Promise.resolve().then(() => registerCoreAbilities());
  }
  return contentReady;
}

export function registerHero(hero) {
  if (!hero?.id) throw new Error('registerHero requires a hero with an id');
  if (heroes.has(hero.id)) logWarn('heroes', `"${hero.id}" re-registered; replacing the previous definition`);

  const problems = [...validateHero(hero), ...validateReferences(hero)];
  if (problems.length > 0) {
    for (const problem of problems) logWarn('heroes', problem);
    throw new Error(`hero "${hero.id}" failed validation: ${problems[0]}`);
  }

  heroes.set(hero.id, hero);
  if (!order.includes(hero.id)) order.push(hero.id);
  return hero;
}

/**
 * Registers every hero a module exports, containing failures to that hero.
 * Accepts both `export const heroes = [...]` and a default array.
 *
 * @param {object} module Loaded module namespace.
 * @param {string} label Source label for diagnostics.
 * @returns {{loaded: string[], skipped: string[]}}
 */
export function registerFromModule(module, label) {
  const loaded = [];
  const skipped = [];
  const candidates = [];
  const seen = new Set();

  const add = (candidate) => {
    if (!candidate?.id || seen.has(candidate.id)) return;
    seen.add(candidate.id);
    candidates.push(candidate);
  };

  // A hero module conventionally re-exports the same array under both `heroes`
  // and `default`, so collecting every array export would register each hero
  // twice. Dedupe by id and prefer the conventional names.
  const exported = module?.heroes ?? module?.default;
  if (Array.isArray(exported)) exported.forEach(add);
  else if (exported && typeof exported === 'object') add(exported);

  for (const [key, value] of Object.entries(module ?? {})) {
    if (key === 'heroes' || key === 'default') continue;
    if (Array.isArray(value)) value.filter((entry) => entry?.suits).forEach(add);
    else if (value?.suits) add(value);
  }

  for (const candidate of candidates) {
    try {
      registerHero(candidate);
      loaded.push(candidate.id);
    } catch (error) {
      skipped.push(candidate?.id ?? 'unknown');
      logError(`heroes:${label}`, error);
    }
  }
  return { loaded, skipped };
}

export function getHero(id) {
  return heroes.get(id);
}

export function hasHero(id) {
  return heroes.has(id);
}

export function listHeroes() {
  return order.map((id) => heroes.get(id)).filter(Boolean);
}

export function heroIds() {
  return [...order];
}

export function count() {
  return heroes.size;
}

export function clear() {
  heroes.clear();
  order.length = 0;
}

/**
 * Loads the built-in roster. Called once during bootstrap.
 *
 * Loading a hero requires its abilities to be registered first: a suit declares
 * ability ids, and validation resolves them immediately. `ensureContentReady`
 * makes that ordering explicit and idempotent rather than leaving it to whoever
 * happens to call first.
 */
export async function loadBuiltinHeroes() {
  await ensureContentReady();
  const sources = [
    ['tech', () => import('./tech_hero/index.js')],
    ['spider', () => import('./spider_hero/index.js')],
    ['speed', () => import('./speed_hero/index.js')],
    ['thunder', () => import('./thunder_hero/index.js')],
    ['cosmic', () => import('./cosmic_hero/index.js')],
  ];

  const report = { loaded: [], skipped: [] };
  for (const [label, load] of sources) {
    try {
      const module = await load();
      const result = registerFromModule(module, label);
      report.loaded.push(...result.loaded);
      report.skipped.push(...result.skipped);
    } catch (error) {
      report.skipped.push(label);
      logError(`heroes:${label}`, error);
    }
  }

  logInfo('heroes', `loaded ${report.loaded.length} hero(es): ${report.loaded.join(', ')}`);
  if (report.skipped.length > 0) logWarn('heroes', `skipped: ${report.skipped.join(', ')}`);
  return report;
}

export function describeRoster() {
  return listHeroes().map((hero) => ({
    id: hero.id,
    name: hero.name,
    suits: hero.suits.map((suit) => ({ id: suit.id, abilities: suit.abilities.length })),
  }));
}