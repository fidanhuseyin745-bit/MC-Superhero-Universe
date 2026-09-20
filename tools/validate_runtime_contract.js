const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const registryPath = path.join(root, 'behavior_packs', 'mc_superhero_universe_bp', 'data', 'registry.js');
const combatPath = path.join(root, 'behavior_packs', 'mc_superhero_universe_bp', 'scripts', 'combat', 'combat_service.js');
const registry = fs.readFileSync(registryPath, 'utf8');
const combat = fs.readFileSync(combatPath, 'utf8');

const requiredFields = ['energyCost', 'cooldown', 'handler', 'particle', 'sound', 'animation'];
for (const field of requiredFields) {
  if (!registry.includes(`${field}:`)) throw new Error(`Ability field is missing from registry source: ${field}`);
}

const supportedHandlers = [
  'repulsor_burst', 'nova_ray', 'magnet_pulse', 'plasma_burst', 'mind_burst',
  'unibeam', 'thunder_field', 'starburst', 'gravity_well', 'web_snap', 'wall_run',
  'tide_wave', 'sonic_burst', 'smash_wave', 'ground_punch', 'thorn_wave', 'frost_burst',
  'lightning_strike', 'speed_burst', 'afterimage_dash', 'flight_burst', 'sky_punch',
  'shadow_step', 'ghost_burst', 'guard_slam', 'rally_wall', 'cinder_wave'
];
for (const handler of supportedHandlers) {
  if (registry.includes(`'${handler}'`) && !combat.includes(`'${handler}'`)) {
    throw new Error(`Registry handler is not implemented by combat runtime: ${handler}`);
  }
}

const heroEntries = (registry.match(/\['[a-z0-9_]+',\s*'[^']+',\s*'[a-z]+',\s*\d+,\s*\[/g) || []).length;
const costumeRecords = (registry.match(/assetStatus:\s*'registry-only'/g) || []).length;
const abilityRecords = (registry.match(/particle:\s*'msu:energy_burst'/g) || []).length;
if (heroEntries < 1 || costumeRecords < heroEntries * 3 || abilityRecords < heroEntries * 3) {
  throw new Error(`Registry content counts are incomplete: heroes=${heroEntries}, costumes=${costumeRecords}, abilities=${abilityRecords}`);
}

console.log(`Runtime contract validation passed: ${heroEntries} heroes, ${costumeRecords} registry-only costumes, ${abilityRecords} abilities.`);
