#!/usr/bin/env node
/**
 * Static validation for the packs. Runs in CI and locally on Termux.
 *
 * Catches the mistakes that are otherwise only visible as an addon that
 * silently refuses to load on the phone:
 *   - malformed or version-drifting manifests
 *   - duplicate or missing UUIDs
 *   - invalid JSON anywhere in a pack
 *   - script imports that do not resolve, or modules outside the allowlist
 *   - localization keys used by scripts but missing from en_US.lang
 *   - unnamespaced custom entity / particle identifiers
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { ROOT, packEntries, readJson, readPacks, readVersion, walkFiles } from './lib/repo.mjs';

const errors = [];
const warnings = [];
const fail = (message) => errors.push(message);
const warn = (message) => warnings.push(message);

const version = readVersion();
const packs = readPacks();
const ALLOWED_MODULES = new Set(Object.keys(version.script_modules));

/** Every custom id a script may reference must be namespaced with msu:. */
const ID_PATTERN = /["']([a-z0-9_]+):([a-z0-9_/.-]+)["']/g;
const IGNORED_NAMESPACES = new Set(['minecraft', 'msu', 'msu_ability']);
/** Non-content namespaces: engine internals, Node builtins, event/diagnostic labels. */
const INTERNAL_NAMESPACES = new Set(['node', 'engine', 'combat', 'progress', 'hero', 'suit', 'ability', 'energy', 'ui', 'bus', 'lifecycle', 'sound', 'random', 'mob', 'block', 'item', 'textures', 'particle']);

function checkManifest(pack, manifest) {
  const label = `${pack.path}/manifest.json`;
  if (!existsSync(join(ROOT, pack.path, 'pack_icon.png'))) {
    fail(`${pack.path} is missing pack_icon.png`);
  }
  if (manifest.format_version !== 2) fail(`${label}: format_version must be 2`);
  if (manifest.header?.uuid?.toLowerCase() !== pack.uuid) {
    fail(`${label}: header.uuid does not match packs.json (${pack.uuid})`);
  }
  if (JSON.stringify(manifest.header?.version) !== JSON.stringify(version.version)) {
    fail(`${label}: header.version ${JSON.stringify(manifest.header?.version)} != version.json ${JSON.stringify(version.version)}`);
  }
  if (JSON.stringify(manifest.header?.min_engine_version) !== JSON.stringify(version.target_engine.min)) {
    fail(`${label}: header.min_engine_version must match version.json target_engine.min`);
  }
  const modules = manifest.modules ?? [];
  if (modules.length === 0) fail(`${label}: no modules defined`);
  for (const module of modules) {
    if (!module.uuid) fail(`${label}: a module is missing its uuid`);
    if (JSON.stringify(module.version) !== JSON.stringify(version.version)) {
      fail(`${label}: module ${module.type} version must match version.json`);
    }
  }
  for (const dependency of manifest.dependencies ?? []) {
    if (dependency.module_name) {
      const expected = version.script_modules[dependency.module_name];
      if (!expected) fail(`${label}: dependency on unsupported module ${dependency.module_name}`);
      else if (dependency.version !== expected) {
        fail(`${label}: ${dependency.module_name} must be pinned to ${expected}, found ${dependency.version}`);
      }
    }
  }
  return modules;
}

function collectUuids() {
  const seen = new Map();
  for (const pack of Object.values(packs)) {
    const manifest = readJson(`${pack.path}/manifest.json`);
    const entries = [['header', manifest.header?.uuid], ...(manifest.modules ?? []).map((m) => ['module', m.uuid])];
    for (const [kind, uuid] of entries) {
      if (!uuid) continue;
      const key = uuid.toLowerCase();
      if (seen.has(key)) fail(`duplicate uuid ${uuid} used by ${seen.get(key)} and ${pack.path} (${kind})`);
      else seen.set(key, `${pack.path} (${kind})`);
    }
  }
}

function checkJsonFiles() {
  for (const pack of Object.values(packs)) {
    for (const entry of packEntries(pack)) {
      if (!entry.archivePath.endsWith('.json')) continue;
      try {
        JSON.parse(readFileSync(entry.absolute, 'utf8'));
      } catch (error) {
        fail(`${pack.path}/${entry.archivePath} is not valid JSON: ${error.message}`);
      }
    }
  }
}

function resolveSpecifier(fromFile, specifier) {
  const base = resolve(dirname(fromFile), specifier);
  for (const candidate of [base, `${base}.js`, join(base, 'index.js')]) {
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

function checkScripts() {
  const scriptFiles = walkFiles(join(ROOT, 'behavior_pack/scripts')).filter((file) => file.endsWith('.js'));
  if (scriptFiles.length === 0) fail('behavior_pack/scripts contains no JavaScript files');

  for (const file of scriptFiles) {
    const source = readFileSync(file, 'utf8');
    const relative = file.slice(ROOT.length + 1);
    const specifiers = [
      ...source.matchAll(/(?:^|\n)\s*import\s+[^"']*from\s*["']([^"']+)["']/g),
      ...source.matchAll(/import\s*\(\s*["']([^"']+)["']\s*\)/g),
    ].map((match) => match[1]);

    for (const specifier of specifiers) {
      if (specifier.startsWith('.')) {
        if (!resolveSpecifier(file, specifier)) fail(`${relative}: import "${specifier}" does not resolve`);
      } else if (!ALLOWED_MODULES.has(specifier)) {
        fail(`${relative}: import "${specifier}" is not an allowed module (${[...ALLOWED_MODULES].join(', ')})`);
      }
    }

    if (/\brequire\s*\(/.test(source)) warn(`${relative}: uses require(), which Bedrock does not support`);
    if (/-beta|@beta|"beta"/.test(source)) warn(`${relative}: references a beta API token; the project targets stable APIs only`);

    for (const match of source.matchAll(ID_PATTERN)) {
      if (IGNORED_NAMESPACES.has(match[1]) || INTERNAL_NAMESPACES.has(match[1])) continue;
      warn(`${relative}: custom id "${match[0]}" should be namespaced with msu:`);
    }
  }

  checkStringsMirror();
}

/**
 * The bundled `strings.js` must match `en_US.lang` exactly, or the engine and the
 * game disagree about what a key means. Regenerating is one command, so drift is
 * a build failure rather than a warning.
 */
function checkStringsMirror() {
  const lang = JSON.parse(readFileSync(join(ROOT, 'resource_pack/texts/en_US.lang'), 'utf8'));
  const declared = lang[0] ?? {};
  for (const required of ['pack.name', 'pack.description']) {
    if (!Object.hasOwn(declared, required)) fail(`en_US.lang must define "${required}"`);
  }

  const mirrorPath = join(ROOT, 'behavior_pack/scripts/framework/strings.js');
  if (!existsSync(mirrorPath)) {
    fail('behavior_pack/scripts/framework/strings.js is missing; run node tools/gen-strings.mjs');
    return;
  }
  const source = readFileSync(mirrorPath, 'utf8');
  const escape = (value) =>
    value
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t');
  const unescape = (value) =>
    value
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '\r')
      .replace(/\\t/g, '\t')
      .replace(/\\'/g, "'")
      .replace(/\\\\/g, '\\');

  const mirrored = new Map(
    [...source.matchAll(/^\s*'((?:[^'\\]|\\.)+)':\s*'((?:[^'\\]|\\.)*)',?$/gm)].map((match) => [
      unescape(match[1]),
      unescape(match[2]),
    ]),
  );

  for (const [key, value] of Object.entries(declared)) {
    if (!mirrored.has(key)) fail(`strings.js is missing "${key}"; run node tools/gen-strings.mjs`);
    else if (mirrored.get(key) !== value) {
      fail(`strings.js "${key}" disagrees with en_US.lang; run node tools/gen-strings.mjs`);
    }
  }
  for (const key of mirrored.keys()) {
    if (!Object.hasOwn(declared, key)) fail(`strings.js defines "${key}", which is not in en_US.lang`);
  }

  // Every key the scripts reference must exist, or a raw key reaches the player.
  const scriptFiles = walkFiles(join(ROOT, 'behavior_pack/scripts')).filter((file) => file.endsWith('.js'));
  for (const file of scriptFiles) {
    const contents = readFileSync(file, 'utf8');
    for (const match of contents.matchAll(/["'](msu\.[a-z0-9_.]+)["']/g)) {
      if (!Object.hasOwn(declared, match[1])) {
        fail(`${file.slice(ROOT.length + 1)}: localization key "${match[1]}" is missing from en_US.lang`);
      }
    }
  }
}

for (const pack of Object.values(packs)) {
  if (!existsSync(join(ROOT, pack.path))) {
    fail(`packs.json points at ${pack.path}, which does not exist`);
    continue;
  }
  const manifestPath = join(ROOT, pack.path, 'manifest.json');
  if (!existsSync(manifestPath)) {
    fail(`${pack.path}/manifest.json is missing`);
    continue;
  }
  checkManifest(pack, readJson(`${pack.path}/manifest.json`));
}

collectUuids();
checkJsonFiles();
checkScripts();

for (const message of warnings) console.warn(`warn  ${message}`);
for (const message of errors) console.error(`error ${message}`);

if (errors.length > 0) {
  console.error(`\nvalidate: ${errors.length} error(s), ${warnings.length} warning(s)`);
  process.exit(1);
}
console.log(`validate: ok (${warnings.length} warning(s))`);