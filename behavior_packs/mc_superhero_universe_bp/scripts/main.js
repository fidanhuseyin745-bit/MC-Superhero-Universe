import { world, system } from '@minecraft/server';
import { HEROES, COSTUMES, registrySummary, registerRegistryValidation } from '../data/registry.js';
import { ensureState, getState, setHero, setCostume, notify } from './core/player_state.js';
import { describeProgression } from './progression/progression_service.js';
import { useAbility } from './abilities/ability_runtime.js';
import { tickEnergy } from './energy/energy_service.js';

try { registerRegistryValidation(); } catch (error) { world.sendMessage(`§c[MSU] Registry error: ${error}`); }
world.afterEvents.playerSpawn.subscribe(({ player }) => { ensureState(player); notify(player, 'Hazır. !hero list veya !hero select <id> kullan. Blaze rod ile yetenek kullan.'); });
world.afterEvents.itemUse.subscribe(({ source, itemStack }) => { if (!source?.isValid() || itemStack?.typeId !== 'minecraft:blaze_rod') return; const state = ensureState(source); const hero = HEROES[state.heroId]; const abilityId = hero.abilityIds[source.selectedSlotIndex] ?? hero.abilityIds[0]; useAbility(source, abilityId); });
world.beforeEvents.chatSend.subscribe((event) => { const message = event.message.trim(); if (!message.startsWith('!')) return; event.cancel = true; system.run(() => handleCommand(event.sender, message)); });
function handleCommand(player, message) { const args = message.slice(1).split(/\s+/); if (args[0] === 'hero' && args[1] === 'list') { notify(player, Object.values(HEROES).map((h) => `${h.id}: ${h.displayName}`).join(' | ')); return; } if (args[0] === 'hero' && args[1] === 'select') { notify(player, setHero(player, args[2]) ? `Kahraman seçildi: ${args[2]}` : 'Bilinmeyen kahraman.'); return; } if (args[0] === 'costume' && args[1] === 'list') { const state = getState(player); notify(player, Object.values(COSTUMES).filter((c) => c.heroId === state.heroId).map((c) => c.id).join(' | ')); return; } if (args[0] === 'costume' && args[1] === 'equip') { notify(player, setCostume(player, args[2]) ? `Kostüm kuşanıldı: ${args[2]}` : 'Kostüm bu kahramana ait değil.'); return; } if (args[0] === 'status') { notify(player, describeProgression(player)); return; } notify(player, 'Komutlar: !hero list | !hero select <id> | !costume list | !costume equip <id> | !status'); }
system.runInterval(tickEnergy, 20);
