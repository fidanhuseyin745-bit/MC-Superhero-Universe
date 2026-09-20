import { world } from '@minecraft/server';
import { recordCombat } from '../progression/progression_service.js';

function targets(player, radius) {
  try {
    return player.dimension.getEntities({
      location: player.location,
      maxDistance: radius,
      excludeTypes: ['minecraft:item', 'minecraft:xp_orb'],
      excludeNames: [player.name]
    });
  } catch {
    return [];
  }
}

export function applyAbility(player, ability, costume) {
  const damageBonus = costume?.passive?.damage ?? 0;
  const particleName = ability.particle || 'msu:energy_burst';
  const soundName = ability.sound || 'random.orb';

  const runParticle = () => player.runCommand(`particle ${particleName} ~ ~1 ~`);
  const runSound = () => player.runCommand(`playsound ${soundName} @s ~ ~ ~ 1 1`);

  if (ability.handler === 'repulsor_burst' || ability.handler === 'lightning_strike' || ability.handler === 'nova_ray' || ability.handler === 'smash_wave' || ability.handler === 'speed_burst' || ability.handler === 'wall_run') {
    for (const entity of targets(player, 6)) {
      try { entity.applyDamage(8 + damageBonus); } catch {}
    }
    runParticle();
    runSound();
    recordCombat(player, 6);
    return;
  }

  if (ability.handler === 'unibeam' || ability.handler === 'thunder_field' || ability.handler === 'ground_punch' || ability.handler === 'guardian_pulse' || ability.handler === 'starburst') {
    for (const entity of targets(player, 8)) {
      try { entity.applyDamage(12 + damageBonus); } catch {}
    }
    runParticle();
    runSound();
    recordCombat(player, 8);
    return;
  }

  if (ability.handler === 'web_snap' || ability.handler === 'shadow_step' || ability.handler === 'flight_burst') {
    runParticle();
    runSound();
    player.runCommand('effect @s speed 4 1 true');
    recordCombat(player, 4);
    return;
  }

  if (ability.handler === 'guard_slam' || ability.handler === 'rally_wall') {
    for (const entity of targets(player, 5)) {
      try { entity.applyDamage(10 + damageBonus); } catch {}
    }
    runParticle();
    runSound();
    player.runCommand('effect @s resistance 5 1 true');
    recordCombat(player, 7);
    return;
  }

  runParticle();
  runSound();
  recordCombat(player, 3);
}
