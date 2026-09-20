import { recordCombat } from '../progression/progression_service.js';

const MAX_TARGETS = 12;

function targets(player, radius) {
  try {
    return player.dimension.getEntities({
      location: player.location,
      maxDistance: radius,
      excludeTypes: ['minecraft:item', 'minecraft:xp_orb'],
      excludeNames: [player.name]
    }).slice(0, MAX_TARGETS);
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

function areaDamage(player, radius, damage, bonus) {
  for (const entity of targets(player, radius)) {
    try { entity.applyDamage(damage + bonus); } catch {}
  }
}

export function applyAbility(player, ability, costume) {
  const bonus = costume?.passive?.damage ?? 0;
  switch (ability.handler) {
    case 'repulsor_burst':
    case 'nova_ray':
    case 'magnet_pulse':
    case 'plasma_burst':
    case 'mind_burst':
      areaDamage(player, 6, 8, bonus); burst(player, ability); break;
    case 'unibeam':
    case 'thunder_field':
    case 'starburst':
    case 'gravity_well':
      areaDamage(player, 8, 12, bonus); burst(player, ability, 'random.explode'); break;
    case 'web_snap':
    case 'wall_run':
    case 'tide_wave':
    case 'sonic_burst':
      command(player, 'effect @s speed 5 1 true');
      command(player, 'effect @s jump_boost 5 1 true');
      areaDamage(player, 5, 4, bonus); burst(player, ability); break;
    case 'smash_wave':
    case 'ground_punch':
    case 'thorn_wave':
    case 'frost_burst':
      areaDamage(player, 6, 10, bonus);
      command(player, 'effect @s resistance 4 1 true');
      burst(player, ability, 'random.anvil_land'); break;
    case 'lightning_strike':
      areaDamage(player, 8, 10, bonus);
      burst(player, ability, 'random.explode'); break;
    case 'speed_burst':
      command(player, 'effect @s speed 6 3 true');
      command(player, 'effect @s haste 6 1 true');
      burst(player, ability); break;
    case 'afterimage_dash':
      command(player, 'effect @s speed 3 5 true');
      command(player, 'tp @s ^ ^ ^6');
      burst(player, ability); break;
    case 'flight_burst':
      command(player, 'effect @s levitation 3 1 true');
      command(player, 'effect @s slow_falling 8 1 true');
      burst(player, ability); break;
    case 'sky_punch':
      command(player, 'effect @s levitation 2 3 true');
      areaDamage(player, 5, 14, bonus);
      burst(player, ability, 'random.explode'); break;
    case 'shadow_step':
      command(player, 'effect @s invisibility 5 0 true');
      command(player, 'effect @s speed 5 2 true');
      burst(player, ability); break;
    case 'ghost_burst':
      command(player, 'effect @s invisibility 4 0 true');
      areaDamage(player, 5, 9, bonus);
      burst(player, ability); break;
    case 'guard_slam':
      areaDamage(player, 5, 10, bonus);
      command(player, 'effect @s resistance 6 2 true');
      burst(player, ability, 'random.anvil_land'); break;
    case 'rally_wall':
      command(player, 'effect @s resistance 10 3 true');
      command(player, 'effect @s regeneration 8 1 true');
      burst(player, ability, 'random.levelup'); break;
    case 'cinder_wave':
      areaDamage(player, 6, 9, bonus);
      command(player, 'effect @s fire_resistance 6 0 true');
      burst(player, ability, 'fire.fire'); break;
    default:
      burst(player, ability);
  }
  recordCombat(player, 5);
}
