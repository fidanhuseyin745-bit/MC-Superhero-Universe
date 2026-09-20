import { world } from '@minecraft/server';
import { recordCombat } from '../progression/progression_service.js';

function targets(player, radius) {
  try {
    return player.dimension.getEntities({ location: player.location, maxDistance: radius, excludeTypes: ['minecraft:item', 'minecraft:xp_orb'], excludeNames: [player.name] });
  } catch {
    return [];
  }
}

function command(player, value) {
  try { player.runCommand(value); } catch {}
}

function burst(player, ability, sound = 'random.orb') {
  command(player, `particle ${ability.particle || 'minecraft:basic_flame_particle'} ~ ~1 ~`);
  command(player, `playsound ${sound} @s ~ ~ ~ 1 1`);
}

export function applyAbility(player, ability, costume) {
  const bonus = costume?.passive?.damage ?? 0;
  const nearby = (radius, damage) => {
    for (const entity of targets(player, radius)) {
      try { entity.applyDamage(damage + bonus); } catch {}
    }
  };

  switch (ability.handler) {
    case 'repulsor_burst':
    case 'nova_ray':
      nearby(6, 8); burst(player, ability); break;
    case 'unibeam':
    case 'thunder_field':
    case 'starburst':
      nearby(8, 12); burst(player, ability, 'random.explode'); break;
    case 'web_snap':
      command(player, 'effect @s speed 5 1 true');
      nearby(5, 4); burst(player, ability); break;
    case 'wall_run':
      command(player, 'effect @s jump_boost 6 2 true');
      command(player, 'effect @s speed 6 2 true');
      burst(player, ability); break;
    case 'smash_wave':
    case 'ground_punch':
      nearby(6, 10); command(player, 'effect @s resistance 4 1 true'); burst(player, ability, 'random.anvil_land'); break;
    case 'lightning_strike':
      for (const entity of targets(player, 8)) { try { command(player, `summon lightning_bolt ${entity.location.x} ${entity.location.y} ${entity.location.z}`); entity.applyDamage(10 + bonus); } catch {} }
      burst(player, ability, 'random.explode'); break;
    case 'speed_burst':
      command(player, 'effect @s speed 6 3 true'); command(player, 'effect @s haste 6 1 true'); burst(player, ability); break;
    case 'afterimage_dash':
      command(player, 'effect @s speed 3 5 true'); command(player, 'tp @s ^ ^ ^6'); burst(player, ability); break;
    case 'flight_burst':
      command(player, 'effect @s levitation 3 1 true'); command(player, 'effect @s slow_falling 8 1 true'); burst(player, ability); break;
    case 'sky_punch':
      command(player, 'effect @s levitation 2 3 true'); nearby(5, 14); burst(player, ability, 'random.explode'); break;
    case 'shadow_step':
      command(player, 'effect @s invisibility 5 0 true'); command(player, 'effect @s speed 5 2 true'); burst(player, ability); break;
    case 'ghost_burst':
      command(player, 'effect @s invisibility 4 0 true'); nearby(5, 9); burst(player, ability); break;
    case 'guard_slam':
      nearby(5, 10); command(player, 'effect @s resistance 6 2 true'); burst(player, ability, 'random.anvil_land'); break;
    case 'rally_wall':
      command(player, 'effect @s resistance 10 3 true'); command(player, 'effect @s regeneration 8 1 true'); burst(player, ability, 'random.levelup'); break;
    default:
      burst(player, ability);
  }
  recordCombat(player, 5);
}
