const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const bp = path.join(root, 'behavior_packs', 'mc_superhero_universe_bp');
const rp = path.join(root, 'resource_packs', 'mc_superhero_universe_rp');

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(file) : [file];
  });
}
function json(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (error) { throw new Error(`Invalid JSON: ${path.relative(root, file)}: ${error.message}`); }
}
function hasKey(value, key) {
  if (!value || typeof value !== 'object') return false;
  if (Object.prototype.hasOwnProperty.call(value, key)) return true;
  return Object.values(value).some((child) => hasKey(child, key));
}

const jsonFiles = [...walk(bp), ...walk(rp)].filter((file) => file.endsWith('.json'));
for (const file of jsonFiles) json(file);

const entity = json(path.join(rp, 'entity', 'hero_base.entity.json'));
const entityDescription = entity['minecraft:client_entity']?.description;
if (!entityDescription) throw new Error('hero_base.entity.json is not a client entity');
if (!entityDescription.geometry || !entityDescription.render_controllers) throw new Error('Hero entity is missing geometry or render controller');

const controller = json(path.join(rp, 'animation_controllers', 'hero_base.controller.json'));
if (!hasKey(controller, 'animation_controllers')) throw new Error('hero_base.controller.json is not an animation controller');
const render = json(path.join(rp, 'render_controllers', 'hero_base.render.json'));
if (!hasKey(render, 'render_controllers')) throw new Error('hero_base.render.json is not a render controller');
const geometry = json(path.join(rp, 'models', 'entity', 'superhero_base.geo.json'));
if (!Array.isArray(geometry['minecraft:geometry'])) throw new Error('Geometry file has no minecraft:geometry array');

const manifest = json(path.join(rp, 'asset_manifest.json'));
if (!Array.isArray(manifest.assets)) throw new Error('Asset manifest assets must be an array');
for (const asset of manifest.assets) {
  if (asset.redistributable !== true) throw new Error(`Unapproved asset: ${asset.id}`);
}
console.log(`Bedrock static validation passed: ${jsonFiles.length} JSON files; ${manifest.assets.length} approved external assets.`);
