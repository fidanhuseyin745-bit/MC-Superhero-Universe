const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '..', 'behavior_packs', 'mc_superhero_universe_bp', 'data', 'registry.js');
const text = fs.readFileSync(file, 'utf8');
const required = ['HEROES', 'COSTUMES', 'ABILITIES', 'registerRegistryValidation'];
for (const name of required) if (!text.includes(name)) throw new Error(`Missing registry export: ${name}`);
for (const id of ['skyforge', 'emberwarden', 'skyforge.standard', 'skyforge.overcharge', 'emberwarden.field']) if (!text.includes(id)) throw new Error(`Missing example id: ${id}`);
console.log('Registry validation passed.');
