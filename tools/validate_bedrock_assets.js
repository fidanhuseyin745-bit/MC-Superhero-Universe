const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const bp = path.join(root, 'behavior_packs', 'mc_superhero_universe_bp');
const rp = path.join(root, 'resource_packs', 'mc_superhero_universe_rp');
function walk(dir) { return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => { const file = path.join(dir, entry.name); return entry.isDirectory() ? walk(file) : [file]; }); }
function json(file) { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (error) { throw new Error(`Invalid JSON: ${path.relative(root, file)}: ${error.message}`); } }
const files = [...walk(bp), ...walk(rp)].filter((file) => file.endsWith('.json'));
for (const file of files) json(file);
const entity = json(path.join(rp, 'entity', 'hero_base.entity.json'))['minecraft:client_entity']?.description;
if (!entity?.geometry || !entity?.render_controllers) throw new Error('Hero entity is missing geometry or render controller');
const controller = json(path.join(rp, 'animation_controllers', 'hero_base.controller.json'));
if (!controller.animation_controllers) throw new Error('Invalid animation controller');
const render = json(path.join(rp, 'render_controllers', 'hero_base.render.json'));
if (!render.render_controllers) throw new Error('Invalid render controller');
const geometry = json(path.join(rp, 'models', 'entity', 'superhero_base.geo.json'));
if (!Array.isArray(geometry['minecraft:geometry']) || geometry['minecraft:geometry'].length === 0) throw new Error('Geometry file has no minecraft:geometry array');
const item = geometry['minecraft:geometry'][0];
if (!item.description?.identifier || !item.description?.texture_width || !item.description?.texture_height || !Array.isArray(item.bones) || item.bones.length === 0) throw new Error('Geometry is missing required Bedrock fields');
const manifest = json(path.join(rp, 'asset_manifest.json'));
if (!Array.isArray(manifest.assets)) throw new Error('Asset manifest assets must be an array');
for (const asset of manifest.assets) if (asset.redistributable !== true) throw new Error(`Unapproved asset: ${asset.id}`);
console.log(`Bedrock static validation passed: ${files.length} JSON files; ${manifest.assets.length} approved external assets.`);
