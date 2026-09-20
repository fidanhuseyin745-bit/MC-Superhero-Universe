#!/usr/bin/env node
/**
 * Generates `behavior_pack/scripts/framework/strings.js` from
 * `resource_pack/texts/en_US.lang`.
 *
 * The script runtime has no filesystem, so the language table has to be bundled
 * into the behaviour pack as data. Generating it from the lang file keeps one
 * authoring source: `npm run validate` fails if the two ever diverge.
 *
 * Usage: node tools/gen-strings.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, readJson } from './lib/repo.mjs';

const lang = readJson('resource_pack/texts/en_US.lang');
const entries = Object.entries(lang[0] ?? {}).sort(([a], [b]) => a.localeCompare(b));

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

const lines = entries.map(([key, value]) => `  '${escape(key)}': '${escape(value)}',`);

const source = `/**
 * Bundled localization table.
 *
 * GENERATED FILE - edit resource_pack/texts/en_US.lang and run
 * \`node tools/gen-strings.mjs\`. The validator compares the two and fails the
 * build when they disagree.
 *
 * Why bundle it at all: the Bedrock script runtime has no filesystem access, so
 * a lang file cannot be read at runtime. The lang file is what the engine renders
 * from, and this mirror is what the engine formats from.
 */
export const STRINGS = {
${lines.join('\n')}
};

export default STRINGS;
`;

const target = join(ROOT, 'behavior_pack/scripts/framework/strings.js');
writeFileSync(target, source);
console.log(`gen-strings: wrote ${entries.length} keys to behavior_pack/scripts/framework/strings.js`);