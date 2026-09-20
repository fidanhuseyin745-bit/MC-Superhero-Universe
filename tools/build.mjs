#!/usr/bin/env node
/**
 * Packages the behavior and resource packs into installable artifacts.
 *
 * Output (dist/):
 *   <slug>_behavior_v<semver>.mcpack
 *   <slug>_resources_v<semver>.mcpack
 *   <slug>_v<semver>.mcaddon      (both packs in one file)
 *
 * No external zip binary is required, so this runs on Termux unchanged.
 */
import { mkdirSync, writeFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { readFileSync } from 'node:fs';
import { createZip } from './lib/zip.mjs';
import { ROOT, packEntries, readPacks, readVersion } from './lib/repo.mjs';

const version = readVersion();
const packs = readPacks();
const distDir = join(ROOT, 'dist');
mkdirSync(distDir, { recursive: true });

const artifacts = [];

function buildPack(pack) {
  const zip = createZip();
  const entries = packEntries(pack);
  if (entries.length === 0) throw new Error(`${pack.path} has no files to package`);
  for (const entry of entries) zip.add(entry.archivePath, readFileSync(entry.absolute));
  const name = `${version.slug}_${pack.path}_v${version.semver}.mcpack`;
  const target = join(distDir, name);
  const buffer = zip.toBuffer();
  writeFileSync(target, buffer);
  artifacts.push({ name, buffer, entries: entries.length });
  return buffer;
}

const behavior = buildPack(packs.behavior_pack);
const resources = buildPack(packs.resource_pack);

const addon = createZip();
addon.add(`${packs.behavior_pack.path}.mcpack`, behavior);
addon.add(`${packs.resource_pack.path}.mcpack`, resources);
const addonName = `${version.slug}_v${version.semver}.mcaddon`;
writeFileSync(join(distDir, addonName), addon.toBuffer());

console.log(`${version.name} v${version.semver}`);
console.log(`Target: Minecraft Bedrock ${version.target_engine.min.join('.')}+ (stable script API, no experiments)`);
console.log('');
for (const artifact of artifacts) {
  console.log(`  ${artifact.name}  ${artifact.entries} files, ${(artifact.buffer.length / 1024).toFixed(1)} KiB`);
}
const addonSize = statSync(join(distDir, addonName)).size;
console.log(`  ${addonName}  ${(addonSize / 1024).toFixed(1)} KiB`);
console.log('');
console.log(`Artifacts written to dist/ - copy the .mcaddon to the phone and open it with Minecraft.`);