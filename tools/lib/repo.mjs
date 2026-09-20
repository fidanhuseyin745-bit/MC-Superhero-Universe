/**
 * Shared helpers for the tools: repo paths, version reading and pack walking.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

export function readJson(relativePath) {
  return JSON.parse(readFileSync(join(ROOT, relativePath), 'utf8'));
}

export function readVersion() {
  const version = readJson('version.json');
  version.semver = version.version.join('.');
  version.slug = version.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return version;
}

export function readPacks() {
  return readJson('packs.json');
}

/** Recursively lists files under a directory, skipping VCS and scratch output. */
export function walkFiles(absoluteDir, options = {}) {
  const skip = new Set(options.skip ?? ['node_modules', 'dist', 'build', '.git']);
  const results = [];
  const visit = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (skip.has(entry.name) || entry.name.startsWith('.')) continue;
      const absolute = join(dir, entry.name);
      if (entry.isDirectory()) visit(absolute);
      else if (entry.isFile()) results.push(absolute);
    }
  };
  visit(absoluteDir);
  return results.sort();
}

/**
 * Files that exist for tooling only and must never ship inside a pack.
 * `scripts/package.json` marks the script tree as ESM for Node; Bedrock has no
 * use for it and it would be dead weight in every download.
 */
const TOOLING_ONLY = new Set(['scripts/package.json']);

export function packEntries(pack) {
  const absolute = join(ROOT, pack.path);
  return walkFiles(absolute)
    .map((file) => ({
      absolute: file,
      archivePath: relative(absolute, file).split(/[\\/]/).join('/'),
    }))
    .filter((entry) => !TOOLING_ONLY.has(entry.archivePath));
}