import { world } from '@minecraft/server';
import { getState, saveState, notify } from '../core/player_state.js';
import { getHero, getAbility, getCostume } from '../../data/registry.js';
import { isCooling, startCooldown } from '../energy/energy_service.js';
import { applyAbility } from './combat_service.js';
import { recordAbilityUse } from '../progression/progression_service.js';

export function useAbility(player, abilityId) { const ability = getAbility(abilityId); const state = getState(player); const hero = getHero(state.heroId); const costume = getCostume(state.costumeId); if (!ability || ability.heroId !== hero.id) return notify(player, 'Bu yetenek mevcut kahramana ait değil.'); if (isCooling(player, ability.id)) return notify(player, 'Yetenek bekleme süresinde.'); if (state.energy < ability.energyCost) return notify(player, 'Yeterli enerjin yok.'); state.energy -= ability.energyCost; saveState(player, state); applyAbility(player, ability, costume); startCooldown(player, ability.id, ability.cooldown); recordAbilityUse(player, ability.id); notify(player, `${ability.displayName} kullanıldı. Enerji: ${Math.floor(state.energy)}`); }
