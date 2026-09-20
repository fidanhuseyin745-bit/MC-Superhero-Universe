# Validation script for the registry and pack metadata.
const fs = require('fs');
const path = require('path');

const bpRoot = path.join(__dirname, '..', 'behavior_packs', 'mc_superhero_universe_bp');
const rpRoot = path.join(__dirname, '..', 'resource_packs', 'mc_superhero_universe_rp');

function mustExist(filePath) {
  if (!fs.existsSync(filePath)) throw new Error(`Missing required file: ${filePath}`);
}

mustExist(path.join(bpRoot, 'manifest.json'));
mustExist(path.join(rpRoot, 'manifest.json'));
mustExist(path.join(bpRoot, 'data', 'registry.js'));
mustExist(path.join(bpRoot, 'scripts', 'main.js'));
mustExist(path.join(rpRoot, 'entity', 'hero_base.entity.json'));
mustExist(path.join(rpRoot, 'animation_controllers', 'hero_base.controller.json'));

const registryText = fs.readFileSync(path.join(bpRoot, 'data', 'registry.js'), 'utf8');
for (const token of ['iron_guard', 'web_slinger', 'green_giant', 'storm_caller', 'flash_runner', 'sky_warden', 'night_warden', 'shield_bearer', 'nova_sentinel']) {
  if (!registryText.includes(token)) throw new Error(`Missing hero token: ${token}`);
}

const bpManifest = JSON.parse(fs.readFileSync(path.join(bpRoot, 'manifest.json'), 'utf8'));
const rpManifest = JSON.parse(fs.readFileSync(path.join(rpRoot, 'manifest.json'), 'utf8'));
if (bpManifest.header.min_engine_version[0] !== 1 || rpManifest.header.min_engine_version[0] !== 1) throw new Error('Invalid Bedrock version metadata');

const jsonFiles = [
  path.join(bpRoot, 'manifest.json'),
  path.join(rpRoot, 'manifest.json'),
  path.join(bpRoot, 'items', 'hero_focus.json'),
  path.join(rpRoot, 'entity', 'hero_base.entity.json'),
  path.join(rpRoot, 'render_controllers', 'hero_base.render.json'),
  path.join(rpRoot, 'models', 'entity', 'superhero_base.geo.json'),
  path.join(rpRoot, 'animation_controllers', 'hero_base.controller.json'),
  path.join(rpRoot, 'particles', 'energy_burst.particle.json'),
  path.join(rpRoot, 'texts', 'en_US.lang'),
  path.join(rpRoot, 'texts', 'tr_TR.lang')
];
for (const file of jsonFiles) {
  try {
    JSON.parse(file.endsWith('.lang') ? '{}' : fs.readFileSync(file, 'utf8'));
  } catch (error) {
    throw new Error(`JSON parse failed for ${file}: ${error.message}`);
  }
}

console.log('Registry and pack validation passed.');
