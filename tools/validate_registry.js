const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const bpRoot = path.join(root, 'behavior_packs', 'mc_superhero_universe_bp');
const rpRoot = path.join(root, 'resource_packs', 'mc_superhero_universe_rp');
function mustExist(filePath) { if (!fs.existsSync(filePath)) throw new Error(`Missing required file: ${filePath}`); }
mustExist(path.join(bpRoot, 'manifest.json')); mustExist(path.join(rpRoot, 'manifest.json')); mustExist(path.join(bpRoot, 'data', 'registry.js')); mustExist(path.join(bpRoot, 'scripts', 'main.js')); mustExist(path.join(rpRoot, 'entity', 'hero_base.entity.json')); mustExist(path.join(rpRoot, 'animation_controllers', 'hero_base.controller.json'));
const source = fs.readFileSync(path.join(bpRoot, 'data', 'registry.js'), 'utf8');
for (const id of ['iron_guard', 'web_slinger', 'green_giant', 'storm_caller', 'flash_runner', 'sky_warden', 'night_warden', 'shield_bearer', 'nova_sentinel']) if (!source.includes(`'${id}'`)) throw new Error(`Missing hero token: ${id}`);
for (const required of ['BASE_HEROES', 'COSTUMES', 'ABILITIES', 'registerRegistryValidation']) if (!source.includes(required)) throw new Error(`Missing registry section: ${required}`);
const bp = JSON.parse(fs.readFileSync(path.join(bpRoot, 'manifest.json'), 'utf8')); const rp = JSON.parse(fs.readFileSync(path.join(rpRoot, 'manifest.json'), 'utf8'));
if (bp.header.min_engine_version[0] !== 1 || rp.header.min_engine_version[0] !== 1) throw new Error('Invalid Bedrock version metadata');
console.log('Registry and pack validation passed.');
