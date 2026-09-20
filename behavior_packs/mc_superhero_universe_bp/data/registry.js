const BASE_HEROES = [
  ['iron_guard', 'Iron Guard', 'tech', 100, ['mark_1', 'mark_42', 'steel_warden']],
  ['web_slinger', 'Web Slinger', 'mobility', 95, ['classic', 'shadow', 'city_guard']],
  ['green_giant', 'Green Giant', 'power', 110, ['primary', 'terrain_breaker', 'rival']],
  ['storm_caller', 'Storm Caller', 'elemental', 100, ['lightning', 'thunder_crown', 'skybreaker']],
  ['flash_runner', 'Flash Runner', 'speed', 90, ['speed', 'afterimage', 'tempo']],
  ['sky_warden', 'Sky Warden', 'flight', 105, ['stratos', 'orbit_guard', 'heatwave']],
  ['night_warden', 'Night Warden', 'stealth', 92, ['shadow', 'vigil', 'moon_tech']],
  ['shield_bearer', 'Shield Bearer', 'defense', 100, ['vanguard', 'sky_defender', 'valor']],
  ['nova_sentinel', 'Nova Sentinel', 'radiant', 120, ['ion', 'radiant', 'warden']],
  ['ember_fox', 'Ember Fox', 'fire', 95, ['cinder', 'wildfire', 'ash_runner']],
  ['frost_lance', 'Frost Lance', 'ice', 100, ['glacier', 'permafrost', 'blue_shard']],
  ['quake_mason', 'Quake Mason', 'earth', 110, ['bedrock', 'faultline', 'monolith']],
  ['tide_crown', 'Tide Crown', 'water', 105, ['deepcurrent', 'waveguard', 'abyssal']],
  ['thorn_vanguard', 'Thorn Vanguard', 'nature', 98, ['briar', 'ironbark', 'verdant']],
  ['sonic_archer', 'Sonic Archer', 'sound', 90, ['resonance', 'echo', 'harmonic']],
  ['lumen_scout', 'Lumen Scout', 'light', 100, ['daystar', 'prism', 'flare']],
  ['void_strider', 'Void Strider', 'void', 105, ['umbra', 'riftwalker', 'eventide']],
  ['gravity_knight', 'Gravity Knight', 'gravity', 115, ['anchor', 'orbit', 'singularity']],
  ['plasma_smith', 'Plasma Smith', 'plasma', 110, ['forge', 'arcsteel', 'sunmetal']],
  ['crystal_mind', 'Crystal Mind', 'psionic', 100, ['quartz', 'faceted', 'mindglass']],
  ['ironbark', 'Ironbark', 'defense', 115, ['rootwall', 'timberline', 'oldgrowth']],
  ['mist_dancer', 'Mist Dancer', 'stealth', 88, ['vapor', 'moonmist', 'drift']],
  ['magnetar', 'Magnetar', 'magnetic', 108, ['northstar', 'poleflip', 'flux']],
  ['sunforge', 'Sunforge', 'solar', 118, ['dawncore', 'zenith', 'corona']],
  ['moonveil', 'Moonveil', 'lunar', 94, ['crescent', 'eclipse', 'silverbloom']],
  ['stormglass', 'Stormglass', 'weather', 102, ['rainline', 'hailguard', 'tempest']],
  ['ash_sentinel', 'Ash Sentinel', 'ember', 100, ['coalheart', 'smolder', 'blackflame']],
  ['river_wisp', 'River Wisp', 'water', 86, ['ripple', 'streamlight', 'rapids']],
  ['boulder_heart', 'Boulder Heart', 'power', 120, ['granite', 'orebound', 'stonewake']],
  ['silkwing', 'Silkwing', 'aerial', 92, ['mothlight', 'glasswing', 'nightwing']],
  ['rail_runner', 'Rail Runner', 'speed', 96, ['copperline', 'maglev', 'switchyard']],
  ['cipher_mage', 'Cipher Mage', 'arcane', 100, ['glyph', 'parallax', 'codex']],
  ['brine_guard', 'Brine Guard', 'water', 106, ['saltplate', 'reefward', 'undertow']],
  ['redwood_colossus', 'Redwood Colossus', 'nature', 122, ['sapheart', 'canopy', 'sequoia']],
  ['aurora_blade', 'Aurora Blade', 'light', 104, ['polar', 'ribbon', 'northglow']],
  ['hollow_star', 'Hollow Star', 'cosmic', 116, ['quasar', 'darkmatter', 'starless']],
  ['gearfox', 'Gearfox', 'tech', 90, ['clockwork', 'microcore', 'scrapline']],
  ['skyharbor', 'Skyharbor', 'flight', 108, ['cloudpiercer', 'windward', 'highport']],
  ['dusk_relay', 'Dusk Relay', 'mobility', 94, ['afterglow', 'twilight', 'relay']],
  ['voltage_vault', 'Voltage Vault', 'electric', 100, ['cell', 'overload', 'gridguard']],
  ['marrow_guard', 'Marrow Guard', 'defense', 112, ['boneplate', 'whitewall', 'keystone']],
  ['circuit_sage', 'Circuit Sage', 'tech', 102, ['logic_beam', 'drone_screen', 'quantum_patch']],
  ['storm_riven', 'Storm Riven', 'electric', 104, ['arc_javelin', 'chain_flash', 'sky_circuit']],
  ['ember_mantis', 'Ember Mantis', 'fire', 94, ['scorch_claw', 'flare_leap', 'inferno_pounce']],
  ['glacier_skein', 'Glacier Skein', 'ice', 103, ['frost_thread', 'ice_lattice', 'whiteout']],
  ['titan_loom', 'Titan Loom', 'power', 124, ['atlas_grip', 'breaker_step', 'colossus_drop']],
  ['star_cartographer', 'Star Cartographer', 'cosmic', 118, ['orbit_mark', 'meteor_route', 'celestial_map']],
  ['rune_bastion', 'Rune Bastion', 'arcane', 108, ['ward_glyph', 'rune_lance', 'seal_break']],
  ['gravity_lark', 'Gravity Lark', 'gravity', 101, ['featherwell', 'mass_shift', 'falling_star']],
  ['reef_oracle', 'Reef Oracle', 'water', 99, ['current_sight', 'reef_spike', 'tide_prophecy']],
  ['verdant_warden', 'Verdant Warden', 'nature', 107, ['vine_bind', 'bloom_guard', 'forest_call']],
  ['shade_lantern', 'Shade Lantern', 'stealth', 91, ['dark_lure', 'silent_step', 'blackout']],
  ['kinetic_harrow', 'Kinetic Harrow', 'plasma', 106, ['impact_store', 'vector_cut', 'kinetic_release']],
  ['aether_pilot', 'Aether Pilot', 'flight', 109, ['lift_vector', 'cloud_lance', 'skybreak']],
  ['pulse_nomad', 'Pulse Nomad', 'speed', 97, ['pulse_dash', 'tempo_strike', 'time_skip']],
  ['bastion_ore', 'Bastion Ore', 'defense', 116, ['ore_shield', 'fortify', 'citadel_crash']],
  ['prism_weaver', 'Prism Weaver', 'light', 101, ['prism_thread', 'spectrum_arc', 'rainbow_cascade']],
  ['void_chorus', 'Void Chorus', 'void', 111, ['null_note', 'rift_hum', 'silence_field']],
  ['sunken_crown', 'Sunken Crown', 'water', 113, ['pressure_wave', 'trench_guard', 'leviathan_call']],
  ['magnet_veil', 'Magnet Veil', 'magnetic', 105, ['iron_shroud', 'polarity_flip', 'railstorm']]
];

const HEROES = {};
const COSTUMES = {};
const ABILITIES = {};
const defaultAbilityNames = ['primary_strike', 'special_burst', 'ultimate_drive'];
const handlerByArchetype = {
  tech: 'repulsor_burst', mobility: 'speed_burst', power: 'smash_wave', elemental: 'lightning_strike', speed: 'speed_burst', flight: 'flight_burst', stealth: 'shadow_step', defense: 'guard_slam', radiant: 'nova_ray', fire: 'cinder_wave', ice: 'frost_burst', earth: 'ground_punch', water: 'tide_wave', nature: 'thorn_wave', sound: 'sonic_burst', light: 'nova_ray', void: 'shadow_step', gravity: 'gravity_well', plasma: 'repulsor_burst', psionic: 'mind_burst', magnetic: 'magnet_pulse', solar: 'nova_ray', lunar: 'shadow_step', weather: 'thunder_field', ember: 'cinder_wave', aerial: 'flight_burst', arcane: 'nova_ray', cosmic: 'starburst', electric: 'lightning_strike'
};

for (const [id, displayName, archetype, maxEnergy, variants, abilityNames] of BASE_HEROES) {
  const names = abilityNames || defaultAbilityNames;
  const costumeIds = variants.map((variant) => `${id}.${variant}`);
  const abilityIds = names.map((name) => `${id}.${name}`);
  HEROES[id] = { id, displayName, archetype, maxEnergy, costumeIds, abilityIds };
  variants.forEach((variant, index) => {
    const costumeId = `${id}.${variant}`;
    COSTUMES[costumeId] = { id: costumeId, heroId: id, displayName: `${displayName} ${variant.replaceAll('_', ' ')}`, tag: `msu_costume_${id}_${variant}`, passive: { energyRegen: 1 + index * 0.15, damage: index + 1 }, assetStatus: 'registry-only', modelAsset: null, textureAsset: null };
  });
  names.forEach((name, index) => {
    const abilityId = `${id}.${name}`;
    ABILITIES[abilityId] = { id: abilityId, heroId: id, displayName: `${displayName} ${name.replaceAll('_', ' ')}`, energyCost: 15 + index * 10, cooldown: 4 + index * 3, handler: handlerByArchetype[archetype] || 'repulsor_burst', particle: 'msu:energy_burst', sound: 'random.orb', animation: index === 0 ? 'animation.msu.hero_power' : index === 1 ? 'animation.msu.hero_special' : 'animation.msu.hero_ultimate' };
  });
}

export { HEROES, COSTUMES, ABILITIES };
export function getHero(id) { return HEROES[id]; }
export function getCostume(id) { return COSTUMES[id]; }
export function getAbility(id) { return ABILITIES[id]; }
export function getHeroList() { return Object.values(HEROES); }
export function getCostumeList(heroId) { return Object.values(COSTUMES).filter((item) => item.heroId === heroId); }
export function registrySummary() { return { heroes: Object.keys(HEROES).length, costumes: Object.keys(COSTUMES).length, abilities: Object.keys(ABILITIES).length }; }

export function registerRegistryValidation() {
  const seen = new Set();
  for (const [id, hero] of Object.entries(HEROES)) {
    if (seen.has(id) || hero.id !== id) throw new Error(`Duplicate or invalid hero ID: ${id}`);
    seen.add(id);
    if (hero.costumeIds.length < 3 || hero.abilityIds.length < 3) throw new Error(`Incomplete hero: ${id}`);
    for (const costumeId of hero.costumeIds) if (!COSTUMES[costumeId] || COSTUMES[costumeId].heroId !== id) throw new Error(`Invalid costume reference: ${costumeId}`);
    for (const abilityId of hero.abilityIds) if (!ABILITIES[abilityId] || ABILITIES[abilityId].heroId !== id) throw new Error(`Invalid ability reference: ${abilityId}`);
  }
  for (const collection of [COSTUMES, ABILITIES]) {
    const ids = Object.keys(collection);
    if (new Set(ids).size !== ids.length) throw new Error('Duplicate registry ID');
  }
}
