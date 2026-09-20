#!/usr/bin/env node
/**
 * Test entry point.
 *
 * Runs every `*.test.mjs` file in this directory against the Minecraft stubs, so
 * `npm test` works on Termux with no install step and no network.
 *
 * Usage: node tools/test/run.mjs
 */
import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

// The engine imports `@minecraft/server` as a bare specifier, so the fake
// packages have to exist on disk before any suite runs. Generation is cheap and
// idempotent, and it keeps `npm test` a single command on a fresh Termux clone.
const stubs = spawnSync(process.execPath, [join(here, 'gen-stubs.mjs')], { stdio: 'inherit' });
if (stubs.status !== 0) {
  console.error('test: could not generate the Minecraft stubs');
  process.exit(1);
}

const suites = readdirSync(here).filter((name) => name.endsWith('.test.mjs')).sort();

if (suites.length === 0) {
  console.error('test: no *.test.mjs files found');
  process.exit(1);
}

let failed = 0;
for (const suite of suites) {
  console.log(`\n=== ${suite}`);
  // Each file is a separate process so one suite's stub installation cannot leak
  // into another's module cache.
  const { spawnSync } = await import('node:child_process');
  const result = spawnSync(process.execPath, [join(here, suite)], { stdio: 'inherit' });
  if (result.status !== 0) failed += 1;
}

console.log(`\ntest: ${suites.length - failed}/${suites.length} suite(s) passed`);
process.exit(failed === 0 ? 0 : 1);