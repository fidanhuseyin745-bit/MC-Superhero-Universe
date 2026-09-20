export const HEROES = {
  'iron_guard': {
    id: 'iron_guard',
    displayName: 'Iron Guard',
    costumeIds: ['iron_guard.mark_1', 'iron_guard.mark_42', 'iron_guard.steel_warden'],
    abilityIds: ['iron_guard.repulsor_burst', 'iron_guard.unibeam'],
    maxEnergy: 100,
    archetype: 'tech'
  },
  'web_slinger': {
    id: 'web_slinger',
    displayName: 'Web Slinger',
    costumeIds: ['web_slinger.classic', 'web_slinger.shadow', 'web_slinger.city_guard'],
    abilityIds: ['web_slinger.web_snap', 'web_slinger.wall_run'],
    maxEnergy: 95,
    archetype: 'mobility'
  },
  'green_giant': {
    id: 'green_giant',
    displayName: 'Green Giant',
    costumeIds: ['green_giant.primary', 'green_giant.terrain_breaker', 'green_giant.rival'],
    abilityIds: ['green_giant.smash_wave', 'green_giant.ground_punch'],
    maxEnergy: 110,
    archetype: 'power'
  },
  'storm_caller': {
    id: 'storm_caller',
    displayName: 'Storm Caller',
    costumeIds: ['storm_caller.lightning', 'storm_caller.thunder_crown', 'storm_caller.skybreaker'],
    abilityIds: ['storm_caller.lightning_strike', 'storm_caller.thunder_field'],
    maxEnergy: 100,
    archetype: 'elemental'
  },
  'flash_runner': {
    id: 'flash_runner',
    displayName: 'Flash Runner',
    costumeIds: ['flash_runner.speed', 'flash_runner.afterimage', 'flash_runner.tempo'],
    abilityIds: ['flash_runner.speed_burst', 'flash_runner.afterimage_dash'],
    maxEnergy: 90,
    archetype: 'speed'
  },
  'sky_warden': {
    id: 'sky_warden',
    displayName: 'Sky Warden',
    costumeIds: ['sky_warden.stratos', 'sky_warden.orbit_guard', 'sky_warden.heatwave'],
    abilityIds: ['sky_warden.flight_burst', 'sky_warden.sky_punch'],
    maxEnergy: 105,
    archetype: 'flight'
  },
  'night_warden': {
    id: 'night_warden',
    displayName: 'Night Warden',
    costumeIds: ['night_warden.shadow', 'night_warden.vigil', 'night_warden.moon_tech'],
    abilityIds: ['night_warden.shadow_step', 'night_warden.ghost_burst'],
    maxEnergy: 92,
    archetype: 'stealth'
  },
  'shield_bearer': {
    id: 'shield_bearer',
    displayName: 'Shield Bearer',
    costumeIds: ['shield_bearer.vanguard', 'shield_bearer.sky_defender', 'shield_bearer.valor'],
    abilityIds: ['shield_bearer.guard_slam', 'shield_bearer.rally_wall'],
    maxEnergy: 100,
    archetype: 'defense'
  },
  'nova_sentinel': {
    id: 'nova_sentinel',
    displayName: 'Nova Sentinel',
    costumeIds: ['nova_sentinel.ion', 'nova_sentinel.radiant', 'nova_sentinel.warden'],
    abilityIds: ['nova_sentinel.nova_ray', 'nova_sentinel.starburst'],
    maxEnergy: 120,
    archetype: 'radiant'
  }
};

export const COSTUMES = {
  'iron_guard.mark_1': { id: 'iron_guard.mark_1', heroId: 'iron_guard', displayName: 'Mark I', tag: 'msu_costume_iron_guard_mark_1', passive: { energyRegen: 1.25, damage: 1 } },
  'iron_guard.mark_42': { id: 'iron_guard.mark_42', heroId: 'iron_guard', displayName: 'Mark 42', tag: 'msu_costume_iron_guard_mark_42', passive: { energyRegen: 1.5, damage: 2 } },
  'iron_guard.steel_warden': { id: 'iron_guard.steel_warden', heroId: 'iron_guard', displayName: 'Steel Warden', tag: 'msu_costume_iron_guard_steel_warden', passive: { energyRegen: 1.2, damage: 3 } },

  'web_slinger.classic': { id: 'web_slinger.classic', heroId: 'web_slinger', displayName: 'Classic', tag: 'msu_costume_web_slinger_classic', passive: { energyRegen: 1.4, mobility: 1 } },
  'web_slinger.shadow': { id: 'web_slinger.shadow', heroId: 'web_slinger', displayName: 'Shadow', tag: 'msu_costume_web_slinger_shadow', passive: { energyRegen: 1.5, mobility: 2 } },
  'web_slinger.city_guard': { id: 'web_slinger.city_guard', heroId: 'web_slinger', displayName: 'City Guard', tag: 'msu_costume_web_slinger_city_guard', passive: { energyRegen: 1.2, damage: 1 } },

  'green_giant.primary': { id: 'green_giant.primary', heroId: 'green_giant', displayName: 'Primary', tag: 'msu_costume_green_giant_primary', passive: { energyRegen: 1.0, damage: 2 } },
  'green_giant.terrain_breaker': { id: 'green_giant.terrain_breaker', heroId: 'green_giant', displayName: 'Terrain Breaker', tag: 'msu_costume_green_giant_terrain_breaker', passive: { energyRegen: 0.9, damage: 3 } },
  'green_giant.rival': { id: 'green_giant.rival', heroId: 'green_giant', displayName: 'Rival', tag: 'msu_costume_green_giant_rival', passive: { energyRegen: 1.1, damage: 2.5 } },

  'storm_caller.lightning': { id: 'storm_caller.lightning', heroId: 'storm_caller', displayName: 'Lightning', tag: 'msu_costume_storm_caller_lightning', passive: { energyRegen: 1.2, damage: 1.5 } },
  'storm_caller.thunder_crown': { id: 'storm_caller.thunder_crown', heroId: 'storm_caller', displayName: 'Thunder Crown', tag: 'msu_costume_storm_caller_thunder_crown', passive: { energyRegen: 1.35, damage: 2.2 } },
  'storm_caller.skybreaker': { id: 'storm_caller.skybreaker', heroId: 'storm_caller', displayName: 'Skybreaker', tag: 'msu_costume_storm_caller_skybreaker', passive: { energyRegen: 1.5, damage: 2.5 } },

  'flash_runner.speed': { id: 'flash_runner.speed', heroId: 'flash_runner', displayName: 'Speed', tag: 'msu_costume_flash_runner_speed', passive: { energyRegen: 1.5, mobility: 2 } },
  'flash_runner.afterimage': { id: 'flash_runner.afterimage', heroId: 'flash_runner', displayName: 'Afterimage', tag: 'msu_costume_flash_runner_afterimage', passive: { energyRegen: 1.6, mobility: 3 } },
  'flash_runner.tempo': { id: 'flash_runner.tempo', heroId: 'flash_runner', displayName: 'Tempo', tag: 'msu_costume_flash_runner_tempo', passive: { energyRegen: 1.4, damage: 1 } },

  'sky_warden.stratos': { id: 'sky_warden.stratos', heroId: 'sky_warden', displayName: 'Stratos', tag: 'msu_costume_sky_warden_stratos', passive: { energyRegen: 1.2, mobility: 1.5 } },
  'sky_warden.orbit_guard': { id: 'sky_warden.orbit_guard', heroId: 'sky_warden', displayName: 'Orbit Guard', tag: 'msu_costume_sky_warden_orbit_guard', passive: { energyRegen: 1.4, damage: 2 } },
  'sky_warden.heatwave': { id: 'sky_warden.heatwave', heroId: 'sky_warden', displayName: 'Heatwave', tag: 'msu_costume_sky_warden_heatwave', passive: { energyRegen: 1.1, damage: 2.5 } },

  'night_warden.shadow': { id: 'night_warden.shadow', heroId: 'night_warden', displayName: 'Shadow', tag: 'msu_costume_night_warden_shadow', passive: { energyRegen: 1.3, mobility: 1.5 } },
  'night_warden.vigil': { id: 'night_warden.vigil', heroId: 'night_warden', displayName: 'Vigil', tag: 'msu_costume_night_warden_vigil', passive: { energyRegen: 1.5, damage: 1.5 } },
  'night_warden.moon_tech': { id: 'night_warden.moon_tech', heroId: 'night_warden', displayName: 'Moon Tech', tag: 'msu_costume_night_warden_moon_tech', passive: { energyRegen: 1.3, mobility: 2 } },

  'shield_bearer.vanguard': { id: 'shield_bearer.vanguard', heroId: 'shield_bearer', displayName: 'Vanguard', tag: 'msu_costume_shield_bearer_vanguard', passive: { energyRegen: 1.3, damage: 1.2 } },
  'shield_bearer.sky_defender': { id: 'shield_bearer.sky_defender', heroId: 'shield_bearer', displayName: 'Sky Defender', tag: 'msu_costume_shield_bearer_sky_defender', passive: { energyRegen: 1.4, damage: 1.8 } },
  'shield_bearer.valor': { id: 'shield_bearer.valor', heroId: 'shield_bearer', displayName: 'Valor', tag: 'msu_costume_shield_bearer_valor', passive: { energyRegen: 1.25, damage: 2.2 } },

  'nova_sentinel.ion': { id: 'nova_sentinel.ion', heroId: 'nova_sentinel', displayName: 'Ion', tag: 'msu_costume_nova_sentinel_ion', passive: { energyRegen: 1.5, damage: 2 } },
  'nova_sentinel.radiant': { id: 'nova_sentinel.radiant', heroId: 'nova_sentinel', displayName: 'Radiant', tag: 'msu_costume_nova_sentinel_radiant', passive: { energyRegen: 1.6, damage: 2.6 } },
  'nova_sentinel.warden': { id: 'nova_sentinel.warden', heroId: 'nova_sentinel', displayName: 'Warden', tag: 'msu_costume_nova_sentinel_warden', passive: { energyRegen: 1.4, damage: 3 } }
};

export const ABILITIES = {
  'iron_guard.repulsor_burst': { id: 'iron_guard.repulsor_burst', heroId: 'iron_guard', displayName: 'Repulsor Burst', energyCost: 20, cooldown: 5, handler: 'repulsor_burst', particle: 'msu:energy_burst', sound: 'random.orb' },
  'iron_guard.unibeam': { id: 'iron_guard.unibeam', heroId: 'iron_guard', displayName: 'Uni Beam', energyCost: 35, cooldown: 10, handler: 'unibeam', particle: 'msu:energy_burst', sound: 'random.levelup' },

  'web_slinger.web_snap': { id: 'web_slinger.web_snap', heroId: 'web_slinger', displayName: 'Web Snap', energyCost: 18, cooldown: 4, handler: 'web_snap', particle: 'msu:energy_burst', sound: 'random.orb' },
  'web_slinger.wall_run': { id: 'web_slinger.wall_run', heroId: 'web_slinger', displayName: 'Wall Run', energyCost: 24, cooldown: 8, handler: 'wall_run', particle: 'msu:energy_burst', sound: 'random.levelup' },

  'green_giant.smash_wave': { id: 'green_giant.smash_wave', heroId: 'green_giant', displayName: 'Smash Wave', energyCost: 24, cooldown: 6, handler: 'smash_wave', particle: 'msu:energy_burst', sound: 'random.anvil_land' },
  'green_giant.ground_punch': { id: 'green_giant.ground_punch', heroId: 'green_giant', displayName: 'Ground Punch', energyCost: 32, cooldown: 10, handler: 'ground_punch', particle: 'msu:energy_burst', sound: 'random.explode' },

  'storm_caller.lightning_strike': { id: 'storm_caller.lightning_strike', heroId: 'storm_caller', displayName: 'Lightning Strike', energyCost: 22, cooldown: 5, handler: 'lightning_strike', particle: 'msu:energy_burst', sound: 'random.orb' },
  'storm_caller.thunder_field': { id: 'storm_caller.thunder_field', heroId: 'storm_caller', displayName: 'Thunder Field', energyCost: 30, cooldown: 9, handler: 'thunder_field', particle: 'msu:energy_burst', sound: 'random.explode' },

  'flash_runner.speed_burst': { id: 'flash_runner.speed_burst', heroId: 'flash_runner', displayName: 'Speed Burst', energyCost: 18, cooldown: 4, handler: 'speed_burst', particle: 'msu:energy_burst', sound: 'random.orb' },
  'flash_runner.afterimage_dash': { id: 'flash_runner.afterimage_dash', heroId: 'flash_runner', displayName: 'Afterimage Dash', energyCost: 28, cooldown: 8, handler: 'afterimage_dash', particle: 'msu:energy_burst', sound: 'random.levelup' },

  'sky_warden.flight_burst': { id: 'sky_warden.flight_burst', heroId: 'sky_warden', displayName: 'Flight Burst', energyCost: 20, cooldown: 5, handler: 'flight_burst', particle: 'msu:energy_burst', sound: 'random.orb' },
  'sky_warden.sky_punch': { id: 'sky_warden.sky_punch', heroId: 'sky_warden', displayName: 'Sky Punch', energyCost: 30, cooldown: 9, handler: 'sky_punch', particle: 'msu:energy_burst', sound: 'random.explode' },

  'night_warden.shadow_step': { id: 'night_warden.shadow_step', heroId: 'night_warden', displayName: 'Shadow Step', energyCost: 18, cooldown: 4, handler: 'shadow_step', particle: 'msu:energy_burst', sound: 'random.orb' },
  'night_warden.ghost_burst': { id: 'night_warden.ghost_burst', heroId: 'night_warden', displayName: 'Ghost Burst', energyCost: 26, cooldown: 8, handler: 'ghost_burst', particle: 'msu:energy_burst', sound: 'random.levelup' },

  'shield_bearer.guard_slam': { id: 'shield_bearer.guard_slam', heroId: 'shield_bearer', displayName: 'Guard Slam', energyCost: 22, cooldown: 5, handler: 'guard_slam', particle: 'msu:energy_burst', sound: 'random.anvil_land' },
  'shield_bearer.rally_wall': { id: 'shield_bearer.rally_wall', heroId: 'shield_bearer', displayName: 'Rally Wall', energyCost: 30, cooldown: 10, handler: 'rally_wall', particle: 'msu:energy_burst', sound: 'random.levelup' },

  'nova_sentinel.nova_ray': { id: 'nova_sentinel.nova_ray', heroId: 'nova_sentinel', displayName: 'Nova Ray', energyCost: 28, cooldown: 6, handler: 'nova_ray', particle: 'msu:energy_burst', sound: 'random.orb' },
  'nova_sentinel.starburst': { id: 'nova_sentinel.starburst', heroId: 'nova_sentinel', displayName: 'Starburst', energyCost: 35, cooldown: 11, handler: 'starburst', particle: 'msu:energy_burst', sound: 'random.explode' }
};

export function getHero(id) { return HEROES[id]; }
export function getCostume(id) { return COSTUMES[id]; }
export function getAbility(id) { return ABILITIES[id]; }
export function getHeroList() { return Object.values(HEROES); }
export function getCostumeList(heroId) { return Object.values(COSTUMES).filter((costume) => costume.heroId === heroId); }
export function registrySummary() { return { heroes: Object.keys(HEROES).length, costumes: Object.keys(COSTUMES).length, abilities: Object.keys(ABILITIES).length }; }

export function registerRegistryValidation() {
  for (const hero of Object.values(HEROES)) {
    if (!hero || !hero.id) throw new Error('Malformed hero descriptor');
    for (const costumeId of hero.costumeIds) {
      if (!COSTUMES[costumeId] || COSTUMES[costumeId].heroId !== hero.id) throw new Error(`Invalid costume reference: ${costumeId}`);
    }
    for (const abilityId of hero.abilityIds) {
      if (!ABILITIES[abilityId] || ABILITIES[abilityId].heroId !== hero.id) throw new Error(`Invalid ability reference: ${abilityId}`);
    }
  }
}
