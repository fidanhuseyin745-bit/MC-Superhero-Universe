import { world, system } from '@minecraft/server';
import { HEROES, COSTUMES, registrySummary, registerRegistryValidation } from '../data/registry.js';
import { ensureState, getState, setHero, setCostume, notify } from './core/player_state.js';
import { describeProgression } from './progression/progression_service.js';
import { useAbility } from './abilities/ability_runtime.js';
import { tickEnergy } from './energy/energy_service.js';

try { registerRegistryValidation(); } catch (error) { world.sendMessage(`§c[MSU] Registry error: ${error.message}`); }

world.afterEvents.playerSpawn.subscribe(({ player }) => {
  ensureState(player);
  notify(player, 'MC Superhero Universe hazır. !hero list | !hero select <id> | !costume list');
});

world.afterEvents.itemUse.subscribe(({ source, itemStack }) => {
  if (!source || !source.isValid || !source.isValid()) return;
  if (!itemStack || itemStack.typeId !== 'minecraft:blaze_rod') return;
  const state = ensureState(source);
  const hero = HEROES[state.heroId];
  if (!hero || !hero.abilityIds || hero.abilityIds.length === 0) return;
  const slot = source.selectedSlotIndex ?? 0;
  const abilityId = hero.abilityIds[slot] ?? hero.abilityIds[0];
  useAbility(source, abilityId);
});

world.beforeEvents.chatSend.subscribe((event) => {
  const message = event.message.trim();
  if (!message.startsWith('!')) return;
  event.cancel = true;
  system.run(() => handleCommand(event.sender, message));
});

function handleCommand(player, message) {
  const args = message.slice(1).split(/\s+/).filter(Boolean);

  if (args[0] === 'hero' && args[1] === 'list') {
    notify(player, Object.values(HEROES).map((hero) => `${hero.id}: ${hero.displayName}`).join(' | '));
    return;
  }

  if (args[0] === 'hero' && args[1] === 'select') {
    const heroId = args[2];
    notify(player, setHero(player, heroId) ? `Kahraman seçildi: ${heroId}` : 'Bilinmeyen kahraman.');
    return;
  }

  if (args[0] === 'costume' && args[1] === 'list') {
    const state = getState(player);
    const list = Object.values(COSTUMES).filter((costume) => costume.heroId === state.heroId).map((costume) => costume.id);
    notify(player, list.join(' | ') || 'Bu kahramanın kostümü yok.');
    return;
  }

  if (args[0] === 'costume' && args[1] === 'equip') {
    const costumeId = args[2];
    notify(player, setCostume(player, costumeId) ? `Kostüm kuşanıldı: ${costumeId}` : 'Kostüm bu kahramana ait değil.');
    return;
  }

  if (args[0] === 'status') {
    notify(player, describeProgression(player));
    return;
  }

  if (args[0] === 'registry') {
    notify(player, JSON.stringify(registrySummary()));
    return;
  }

  notify(player, 'Komutlar: !hero list | !hero select <id> | !costume list | !costume equip <id> | !status | !registry');
}

system.runInterval(() => tickEnergy(), 20);
