import { world } from '@minecraft/server';

export const HEROES = {
  skyforge: { id: 'skyforge', displayName: 'Skyforge', costumeIds: ['skyforge.standard', 'skyforge.overcharge'], abilityIds: ['skyforge.arc_burst', 'skyforge.guardian_pulse'], maxEnergy: 100 },
  emberwarden: { id: 'emberwarden', displayName: 'Emberwarden', costumeIds: ['emberwarden.field'], abilityIds: ['emberwarden.cinder_wave'], maxEnergy: 90 }
};

export const COSTUMES = {
  'skyforge.standard': { id: 'skyforge.standard', heroId: 'skyforge', displayName: 'Skyforge Standard', tag: 'msu_costume_skyforge_standard', passive: { energyRegen: 1 } },
  'skyforge.overcharge': { id: 'skyforge.overcharge', heroId: 'skyforge', displayName: 'Skyforge Overcharge', tag: 'msu_costume_skyforge_overcharge', passive: { energyRegen: 0.5, damage: 2 } },
  'emberwarden.field': { id: 'emberwarden.field', heroId: 'emberwarden', displayName: 'Emberwarden Field', tag: 'msu_costume_emberwarden_field', passive: { damage: 1 } }
};

export const ABILITIES = {
  'skyforge.arc_burst': { id: 'skyforge.arc_burst', heroId: 'skyforge', displayName: 'Arc Burst', energyCost: 20, cooldown: 5, handler: 'arc_burst', particle: 'msu:energy_burst', sound: 'random.orb' },
  'skyforge.guardian_pulse': { id: 'skyforge.guardian_pulse', heroId: 'skyforge', displayName: 'Guardian Pulse', energyCost: 35, cooldown: 10, handler: 'guardian_pulse', particle: 'msu:energy_burst', sound: 'random.levelup' },
  'emberwarden.cinder_wave': { id: 'emberwarden.cinder_wave', heroId: 'emberwarden', displayName: 'Cinder Wave', energyCost: 25, cooldown: 6, handler: 'cinder_wave', particle: 'msu:energy_burst', sound: 'fire.fire' }
};

export function getHero(id) { return HEROES[id]; }
export function getCostume(id) { return COSTUMES[id]; }
export function getAbility(id) { return ABILITIES[id]; }
export function registrySummary() { return { heroes: Object.keys(HEROES).length, costumes: Object.keys(COSTUMES).length, abilities: Object.keys(ABILITIES).length }; }

export function registerRegistryValidation() {
  for (const hero of Object.values(HEROES)) {
    for (const costumeId of hero.costumeIds) if (!COSTUMES[costumeId] || COSTUMES[costumeId].heroId !== hero.id) throw new Error(`Invalid costume reference: ${costumeId}`);
    for (const abilityId of hero.abilityIds) if (!ABILITIES[abilityId] || ABILITIES[abilityId].heroId !== hero.id) throw new Error(`Invalid ability reference: ${abilityId}`);
  }
}
