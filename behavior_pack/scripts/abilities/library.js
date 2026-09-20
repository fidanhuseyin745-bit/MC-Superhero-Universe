/**
 * The shared ability library.
 *
 * These are the building blocks every hero is assembled from. Each one is
 * deliberately small: it reads the execution context, applies effects/damage/
 * motion through the shared combat modules, and reports a result. Heroes compose
 * them, and `spec` creates tuned variants (Mark II hits harder than Mark I)
 * without duplicating behaviour.
 *
 * Convention: an ability id starts with `msu_ability:` so it is obvious at a
 * glance that it is an addon-internal identifier, not a Minecraft one.
 */
import { register } from './registry.js';
import { Effects, giveEffect, giveEffects } from '../combat/effects.js';
import {
  damageAround,
  entitiesAround,
  forwardPoint,
  resolveTarget,
  TargetKind,
} from '../combat/targeting.js';
import { Particles, burst, castOrigin, impact, sfx, trail } from '../combat/vfx.js';
import {
  applyKnockback,
  getViewDirection,
  isEntityUsable,
  spawnEntity,
} from '../core/api.js';
import { impulseFromMetersPerSecond, ticksFromSeconds } from '../core/units.js';
import { normalize, offsetAlong, scale, subtract } from '../core/vectors.js';
import { XpRewards } from '../progression/index.js';

const NO_TARGET = { hit: false, reason: 'no-target' };

/**
 * Applies knockback to every entity in a radius, pushing them away from the
 * hero. Strength is taken from the hero's tuning, not the raw API number, so a
 * phone player is never launched into the void by a shared ability.
 */
function pushAway(source, entities, metresPerSecond, vertical = 0.35) {
  const strength = impulseFromMetersPerSecond(metresPerSecond);
  let pushed = 0;
  for (const entity of entities) {
    if (!isEntityUsable(entity)) continue;
    const direction = normalize(subtract(entity.location, source.location));
    if (applyKnockback(entity, direction, strength, vertical)) pushed += 1;
  }
  return pushed;
}

const DEFINITIONS = {
  /* ------------------------------------------------------------------ *
   * Shared primitives
   * ------------------------------------------------------------------ */

  'msu_ability:pulse_blast': {
    name: 'Concussive Blast',
    slot: 'primary',
    cooldown: 0.9,
    cost: 8,
    tags: ['ranged', 'knockback'],
    execute: (ctx) => {
      const target = resolveTarget(ctx.player, { strategy: 'look-then-nearest', range: 7 });
      const origin = castOrigin(ctx.player);
      if (target.kind === TargetKind.NONE) {
        // Firing into empty space still shows the flare but lands nothing.
        burst(ctx.dimension, Particles.CHARGE, origin, { count: 4, radius: 0.3, seed: ctx.player.id });
        return { ...NO_TARGET };
      }
      const blastCentre = target.location;
      const hits = damageAround(
        { dimension: ctx.dimension, location: blastCentre, id: ctx.player.id },
        3.2,
        ctx.damage(6),
        { limit: 4 },
      );
      pushAway({ location: blastCentre }, entitiesAround({ dimension: ctx.dimension, location: blastCentre, id: ctx.player.id }, 3.4, { limit: 4 }), 9);
      impact(ctx.dimension, blastCentre, { count: 10, radius: 1, seed: ctx.player.id });
      burst(ctx.dimension, Particles.FLARE, origin, { count: 5, radius: 0.2 });
      return { hit: hits > 0, hits, distance: target.distance };
    },
  },

  'msu_ability:repulsor_beam': {
    name: 'Repulsor Beam',
    slot: 'primary',
    cooldown: 1.4,
    cost: 14,
    tags: ['ranged', 'beam'],
    execute: (ctx) => {
      const forward = getViewDirection(ctx.player);
      const origin = castOrigin(ctx.player, 0.9);
      const length = ctx.ability.range ?? 14;
      burst(ctx.dimension, Particles.TRAIL, origin, { count: 3, radius: 0.15 });
      // Sample a handful of points along the ray instead of a per-tick projectile:
      // cheaper on mobile and reads identically at these speeds.
      const samples = 6;
      let hits = 0;
      let lastPoint = origin;
      for (let i = 1; i <= samples; i += 1) {
        const point = offsetAlong(origin, forward, (length / samples) * i);
        lastPoint = point;
        const found = damageAround({ dimension: ctx.dimension, location: point, id: ctx.player.id }, 1.4, ctx.damage(3), {
          limit: 6,
        });
        hits += found;
        if (found > 0) break;
      }
      trail(ctx.dimension, Particles.CHARGE, origin, lastPoint, { maxSamples: 10 });
      sfx(ctx.dimension, 'BLAST', origin, { volume: 0.5, pitch: 1.6 });
      return { hit: hits > 0, hits };
    },
  },

  'msu_ability:ground_slam': {
    name: 'Ground Slam',
    slot: 'primary',
    cooldown: 2.2,
    cost: 16,
    tags: ['melee', 'aoe'],
    execute: (ctx) => {
      const ground = { ...ctx.player.location, y: ctx.player.location.y - 0.9 };
      const hits = damageAround(ctx.player, 4.5, ctx.damage(5), { limit: 8 });
      pushAway(ctx.player, entitiesAround(ctx.player, 4.5, { limit: 8 }), 6, 0.55);
      impact(ctx.dimension, ground, { count: 14, radius: 2, seed: ctx.player.id });
      sfx(ctx.dimension, 'LAND', ground, { volume: 0.8, pitch: 0.9 });
      return { hit: hits > 0, hits };
    },
  },

  'msu_ability:knockback_punch': {
    name: 'Power Punch',
    slot: 'primary',
    cooldown: 0.7,
    cost: 6,
    tags: ['melee'],
    execute: (ctx) => {
      const target = resolveTarget(ctx.player, { strategy: 'look', range: 4 });
      if (target.kind !== TargetKind.ENTITY) return { ...NO_TARGET };
      if (!isEntityUsable(target.entity)) return { ...NO_TARGET };
      try {
        target.entity.applyDamage(ctx.damage(4), { cause: 'entityAttack' });
      } catch {
        return { ...NO_TARGET };
      }
      pushAway(ctx.player, [target.entity], 11, 0.4);
      impact(ctx.dimension, target.location, { count: 8, radius: 0.6 });
      return { hit: true, hits: 1 };
    },
  },

  /* ------------------------------------------------------------------ *
   * Tech hero
   * ------------------------------------------------------------------ */

  'msu_ability:mark_ii_strike': {
    name: 'Micro-Missiles',
    slot: 'defense',
    cooldown: 6,
    cost: 22,
    tags: ['ranged', 'aoe'],
    execute: (ctx) => {
      const forward = getViewDirection(ctx.player);
      const origin = castOrigin(ctx.player, 1.2);
      const landing = offsetAlong({ ...ctx.player.location, y: ctx.player.location.y + 1.2 }, forward, 9);
      const hits = damageAround({ dimension: ctx.dimension, location: landing, id: ctx.player.id }, 4, ctx.damage(7), {
        limit: 8,
      });
      burst(ctx.dimension, Particles.CHARGE, origin, { count: 6, radius: 0.6 });
      impact(ctx.dimension, landing, { count: 16, radius: 2.2, seed: ctx.player.id });
      return { hit: hits > 0, hits };
    },
  },

  'msu_ability:shield_barrier': {
    name: 'Energy Barrier',
    slot: 'defense',
    cooldown: 14,
    cost: 24,
    tags: ['defense'],
    execute: (ctx) => {
      giveEffects(ctx.player, [
        [Effects.RESISTANCE, 6, 2],
        [Effects.ABSORPTION, 6, 3],
      ]);
      burst(ctx.dimension, Particles.FLARE, ctx.player.location, { count: 12, radius: 1, seed: ctx.player.id });
      sfx(ctx.dimension, 'PULSE', ctx.player.location, { volume: 0.7 });
      return { hit: false, buffed: true };
    },
  },

  'msu_ability:flight_boost': {
    name: 'Thruster Boost',
    slot: 'utility',
    cooldown: 4,
    cost: 18,
    tags: ['movement'],
    execute: (ctx) => {
      const forward = getViewDirection(ctx.player);
      const destination = offsetAlong({ ...ctx.player.location, y: ctx.player.location.y + 0.4 }, forward, 7, 1.5);
      ctx.player.teleport(destination, { dimension: ctx.dimension });
      giveEffect(ctx.player, Effects.SLOW_FALLING, 4, 1);
      burst(ctx.dimension, Particles.TRAIL, ctx.player.location, { count: 10, radius: 0.5, seed: ctx.player.id });
      sfx(ctx.dimension, 'WHOOSH', ctx.player.location, { volume: 0.6, pitch: 1.2 });
      return { hit: false, moved: true };
    },
  },

  'msu_ability:nanite_repair': {
    name: 'Nanite Repair',
    slot: 'utility',
    cooldown: 26,
    cost: 30,
    tags: ['support'],
    execute: (ctx) => {
      giveEffects(ctx.player, [
        [Effects.REGENERATION, 6, 2],
        [Effects.SATURATION, 2, 1],
      ]);
      burst(ctx.dimension, Particles.CHARGE, ctx.player.location, { count: 10, radius: 0.8, seed: ctx.player.id });
      return { hit: false, buffed: true };
    },
  },

  'msu_ability:arc_reactor': {
    name: 'Arc Reactor Overload',
    slot: 'ultimate',
    cooldown: 40,
    cost: 45,
    tags: ['ultimate', 'aoe'],
    execute: (ctx) => {
      const hits = damageAround(ctx.player, 8, ctx.damage(11), { limit: 10 });
      giveEffects(ctx.player, [
        [Effects.STRENGTH, 8, 2],
        [Effects.RESISTANCE, 8, 1],
      ]);
      pushAway(ctx.player, entitiesAround(ctx.player, 8, { limit: 10 }), 14, 0.8);
      burst(ctx.dimension, Particles.FLARE, ctx.player.location, { count: 24, radius: 3, vertical: 2, seed: ctx.player.id });
      sfx(ctx.dimension, 'ULTIMATE', ctx.player.location, { volume: 1, pitch: 1.2 });
      return { hit: hits > 0, hits, ultimate: true };
    },
  },

  /* ------------------------------------------------------------------ *
   * Spider hero
   * ------------------------------------------------------------------ */

  'msu_ability:web_shot': {
    name: 'Web Shot',
    slot: 'primary',
    cooldown: 1.1,
    cost: 9,
    tags: ['ranged', 'control'],
    execute: (ctx) => {
      const target = resolveTarget(ctx.player, { strategy: 'look-then-nearest', range: 12 });
      const origin = castOrigin(ctx.player, 0.9);
      if (target.kind === TargetKind.NONE) return { ...NO_TARGET };
      trail(ctx.dimension, Particles.WEB, origin, target.location, { maxSamples: 12 });
      if (target.kind === TargetKind.ENTITY && isEntityUsable(target.entity)) {
        giveEffects(target.entity, [
          [Effects.SLOWNESS, 4, 2],
          [Effects.WEAKNESS, 4, 1],
        ]);
      }
      sfx(ctx.dimension, 'WEB', origin, { volume: 0.6, pitch: 1.4 });
      return { hit: true, hits: 1, distance: target.distance };
    },
  },

  'msu_ability:web_zip': {
    name: 'Web Zip',
    slot: 'utility',
    cooldown: 3.5,
    cost: 12,
    tags: ['movement'],
    execute: (ctx) => {
      const target = resolveTarget(ctx.player, { strategy: 'look', range: 16 });
      const origin = castOrigin(ctx.player, 0.6);
      const destination =
        target.kind === TargetKind.NONE ? forwardPoint(ctx.player, 10, 2) : offsetAlong(target.location, { x: 0, y: 1, z: 0 }, 2);
      trail(ctx.dimension, Particles.WEB, origin, destination, { maxSamples: 12 });
      ctx.player.teleport(destination, { dimension: ctx.dimension });
      giveEffect(ctx.player, Effects.SLOW_FALLING, 3, 1);
      sfx(ctx.dimension, 'WHOOSH', origin, { volume: 0.7, pitch: 1.5 });
      return { hit: false, moved: true };
    },
  },

  'msu_ability:wall_climb': {
    name: 'Wall Climb',
    slot: 'utility',
    cooldown: 9,
    cost: 16,
    tags: ['movement', 'traversal'],
    execute: (ctx) => {
      ctx.repeat({
        times: 24,
        interval: 2,
        label: 'wall-climb',
        fn: () => {
          if (!isEntityUsable(ctx.player)) return false;
          const velocity = ctx.player.getVelocity?.() ?? { x: 0, y: 0, z: 0 };
          ctx.player.applyImpulse?.({ x: velocity.x * 0.5, y: 0.28, z: velocity.z * 0.5 });
          burst(ctx.dimension, Particles.DUST, ctx.player.location, { count: 2, radius: 0.3 });
          return true;
        },
      });
      return { hit: false, moving: true };
    },
  },

  'msu_ability:spider_sense': {
    name: 'Spider Sense',
    slot: 'defense',
    cooldown: 10,
    cost: 14,
    tags: ['defense', 'utility'],
    execute: (ctx) => {
      giveEffects(ctx.player, [
        [Effects.NIGHT_VISION, 12, 1],
        [Effects.SPEED, 6, 1],
      ]);
      const nearby = entitiesAround(ctx.player, 12, { limit: 8 });
      for (const entity of nearby) giveEffect(entity, Effects.GLOWING, 6, 1);
      burst(ctx.dimension, Particles.CHARGE, ctx.player.location, { count: 10, radius: 1.5, seed: ctx.player.id });
      return { hit: false, revealed: nearby.length };
    },
  },

  'msu_ability:web_swing': {
    name: 'Web Swing',
    slot: 'utility',
    cooldown: 2.5,
    cost: 10,
    tags: ['movement'],
    execute: (ctx) => {
      const forward = getViewDirection(ctx.player);
      const anchor = offsetAlong({ ...ctx.player.location, y: ctx.player.location.y + 6 }, forward, 6);
      trail(ctx.dimension, Particles.WEB, { ...ctx.player.location, y: ctx.player.location.y + 2 }, anchor, {
        maxSamples: 10,
      });
      const launch = scale({ ...forward, y: Math.max(0.35, forward.y) }, 1.1);
      ctx.player.applyImpulse?.({ x: launch.x, y: launch.y, z: launch.z });
      giveEffect(ctx.player, Effects.SLOW_FALLING, 4, 1);
      return { hit: false, moved: true };
    },
  },

  'msu_ability:web_storm': {
    name: 'Web Storm',
    slot: 'ultimate',
    cooldown: 34,
    cost: 40,
    tags: ['ultimate', 'control', 'aoe'],
    execute: (ctx) => {
      const targets = entitiesAround(ctx.player, 9, { limit: 10 });
      for (const entity of targets) {
        giveEffects(entity, [
          [Effects.SLOWNESS, 6, 3],
          [Effects.WEAKNESS, 6, 2],
        ]);
        trail(ctx.dimension, Particles.WEB, ctx.player.location, entity.location, { maxSamples: 8 });
      }
      burst(ctx.dimension, Particles.WEB, ctx.player.location, { count: 24, radius: 4, vertical: 3, seed: ctx.player.id });
      sfx(ctx.dimension, 'WEB', ctx.player.location, { volume: 1, pitch: 0.8 });
      return { hit: targets.length > 0, hits: targets.length, ultimate: true };
    },
  },

  /* ------------------------------------------------------------------ *
   * Speed hero
   * ------------------------------------------------------------------ */

  'msu_ability:speed_aura': {
    name: 'Blur',
    slot: 'utility',
    cooldown: 5,
    cost: 12,
    tags: ['buff', 'movement'],
    execute: (ctx) => {
      giveEffects(ctx.player, [
        [Effects.SPEED, 8, 3],
        [Effects.HASTE, 8, 2],
      ]);
      burst(ctx.dimension, Particles.TRAIL, ctx.player.location, { count: 8, radius: 0.6, seed: ctx.player.id });
      return { hit: false, buffed: true };
    },
  },

  'msu_ability:speed_dash': {
    name: 'Dash',
    slot: 'primary',
    cooldown: 1.6,
    cost: 10,
    tags: ['movement'],
    execute: (ctx) => {
      const forward = getViewDirection(ctx.player);
      const destination = offsetAlong({ ...ctx.player.location, y: ctx.player.location.y + 0.2 }, forward, 8);
      trail(ctx.dimension, Particles.TRAIL, ctx.player.location, destination, { maxSamples: 10 });
      ctx.player.teleport(destination, { dimension: ctx.dimension });
      return { hit: false, moved: true };
    },
  },

  'msu_ability:speed_combat': {
    name: 'Flurry',
    slot: 'defense',
    cooldown: 7,
    cost: 20,
    tags: ['melee', 'aoe'],
    execute: (ctx) => {
      const hits = damageAround(ctx.player, 3.5, ctx.damage(4), { limit: 8 });
      giveEffect(ctx.player, Effects.SPEED, 5, 2);
      burst(ctx.dimension, Particles.TRAIL, ctx.player.location, { count: 10, radius: 1.2, seed: ctx.player.id });
      return { hit: hits > 0, hits };
    },
  },

  'msu_ability:phase_step': {
    name: 'Phase Step',
    slot: 'utility',
    cooldown: 12,
    cost: 22,
    tags: ['defense', 'movement'],
    execute: (ctx) => {
      giveEffects(ctx.player, [
        [Effects.INVISIBILITY, 3, 1],
        [Effects.SPEED, 4, 2],
        [Effects.RESISTANCE, 3, 1],
      ]);
      burst(ctx.dimension, Particles.CHARGE, ctx.player.location, { count: 10, radius: 0.8, seed: ctx.player.id });
      return { hit: false, buffed: true };
    },
  },

  'msu_ability:speed_force_punch': {
    name: 'Speed Force Punch',
    slot: 'defense',
    cooldown: 8,
    cost: 22,
    tags: ['melee'],
    execute: (ctx) => {
      const target = resolveTarget(ctx.player, { strategy: 'look', range: 4 });
      if (target.kind !== TargetKind.ENTITY || !isEntityUsable(target.entity)) return { ...NO_TARGET };
      try {
        target.entity.applyDamage(ctx.damage(9), { cause: 'entityAttack' });
      } catch {
        return { ...NO_TARGET };
      }
      pushAway(ctx.player, [target.entity], 22, 0.9);
      impact(ctx.dimension, target.location, { count: 12, radius: 0.8 });
      sfx(ctx.dimension, 'BLAST', target.location, { volume: 0.8, pitch: 1.4 });
      return { hit: true, hits: 1 };
    },
  },

  'msu_ability:time_dilation': {
    name: 'Time Dilation',
    slot: 'ultimate',
    cooldown: 38,
    cost: 42,
    tags: ['ultimate', 'control', 'aoe'],
    execute: (ctx) => {
      const targets = entitiesAround(ctx.player, 10, { limit: 10 });
      for (const entity of targets) {
        giveEffects(entity, [
          [Effects.SLOWNESS, 8, 4],
          [Effects.MINING_FATIGUE, 8, 2],
        ]);
      }
      giveEffects(ctx.player, [
        [Effects.SPEED, 8, 3],
        [Effects.HASTE, 8, 3],
      ]);
      burst(ctx.dimension, Particles.FLARE, ctx.player.location, { count: 20, radius: 4, vertical: 2, seed: ctx.player.id });
      sfx(ctx.dimension, 'ULTIMATE', ctx.player.location, { volume: 1, pitch: 1.6 });
      return { hit: targets.length > 0, hits: targets.length, ultimate: true };
    },
  },

  /* ------------------------------------------------------------------ *
   * Thunder hero
   * ------------------------------------------------------------------ */

  'msu_ability:lightning_bolt': {
    name: 'Lightning Bolt',
    slot: 'primary',
    cooldown: 2.4,
    cost: 18,
    tags: ['ranged', 'storm'],
    execute: (ctx) => {
      const target = resolveTarget(ctx.player, { strategy: 'look-then-nearest', range: 14 });
      const strike = target.kind === TargetKind.NONE ? forwardPoint(ctx.player, 8) : target.location;
      spawnEntity(ctx.dimension, 'minecraft:lightning_bolt', strike);
      const hits = damageAround({ dimension: ctx.dimension, location: strike, id: ctx.player.id }, 4, ctx.damage(6), {
        limit: 6,
      });
      burst(ctx.dimension, Particles.FLARE, strike, { count: 12, radius: 1.5, seed: ctx.player.id });
      sfx(ctx.dimension, 'IMPACT', strike, { volume: 0.9, pitch: 1.3 });
      return { hit: hits > 0, hits };
    },
  },

  'msu_ability:thunder_clap': {
    name: 'Thunder Clap',
    slot: 'defense',
    cooldown: 9,
    cost: 24,
    tags: ['aoe', 'storm'],
    execute: (ctx) => {
      const hits = damageAround(ctx.player, 6, ctx.damage(7), { limit: 8 });
      pushAway(ctx.player, entitiesAround(ctx.player, 6, { limit: 8 }), 16, 0.7);
      burst(ctx.dimension, Particles.FLARE, ctx.player.location, { count: 18, radius: 3, seed: ctx.player.id });
      sfx(ctx.dimension, 'BLAST', ctx.player.location, { volume: 0.9 });
      return { hit: hits > 0, hits };
    },
  },

  'msu_ability:storm_aura': {
    name: 'Storm Aura',
    slot: 'utility',
    cooldown: 18,
    cost: 28,
    tags: ['aura', 'storm'],
    execute: (ctx) => {
      giveEffects(ctx.player, [
        [Effects.RESISTANCE, 8, 1],
        [Effects.FIRE_RESISTANCE, 8, 1],
      ]);
      // Pulse four times over eight seconds: enough to read as an aura without
      // holding a per-tick area query open for the whole duration.
      ctx.repeat({
        times: 4,
        interval: 40,
        label: 'storm-aura',
        fn: () => {
          if (!isEntityUsable(ctx.player)) return false;
          for (const entity of entitiesAround(ctx.player, 6, { limit: 6 })) {
            giveEffect(entity, Effects.WEAKNESS, 3, 1);
          }
          burst(ctx.dimension, Particles.FLARE, ctx.player.location, { count: 6, radius: 2 });
          return true;
        },
      });
      return { hit: false, aura: true };
    },
  },

  'msu_ability:chain_lightning': {
    name: 'Chain Lightning',
    slot: 'primary',
    cooldown: 5,
    cost: 26,
    tags: ['ranged', 'chain'],
    execute: (ctx) => {
      let source = ctx.player;
      const struck = [];
      for (let jump = 0; jump < 3; jump += 1) {
        const next = entitiesAround(source, 8, { limit: 4, exclude: struck }).find((entity) => !struck.includes(entity.id));
        if (!next) break;
        trail(ctx.dimension, Particles.FLARE, source.location, next.location, { maxSamples: 6 });
        try {
          next.applyDamage(ctx.damage(5), { cause: 'lightning' });
        } catch {
          break;
        }
        struck.push(next.id);
        source = next;
      }
      return { hit: struck.length > 0, hits: struck.length };
    },
  },

  'msu_ability:thunder_god': {
    name: 'Wrath of the Storm',
    slot: 'ultimate',
    cooldown: 44,
    cost: 46,
    tags: ['ultimate', 'storm', 'aoe'],
    execute: (ctx) => {
      giveEffect(ctx.player, Effects.SLOW_FALLING, 5, 1);
      for (let i = -1; i <= 1; i += 1) {
        const strike = offsetAlong(ctx.player.location, { x: i, y: 0, z: 0 }, 5);
        ctx.afterTicks(10 * (i + 2), () => {
          spawnEntity(ctx.dimension, 'minecraft:lightning_bolt', strike);
          damageAround({ dimension: ctx.dimension, location: strike, id: ctx.player.id }, 3.5, ctx.damage(8), { limit: 6 });
          burst(ctx.dimension, Particles.FLARE, strike, { count: 12, radius: 1.5 });
        });
      }
      sfx(ctx.dimension, 'ULTIMATE', ctx.player.location, { volume: 1, pitch: 0.9 });
      return { hit: true, ultimate: true };
    },
  },

  /* ------------------------------------------------------------------ *
   * Cosmic hero
   * ------------------------------------------------------------------ */

  'msu_ability:cosmic_ray': {
    name: 'Cosmic Ray',
    slot: 'primary',
    cooldown: 1.8,
    cost: 16,
    tags: ['ranged'],
    execute: (ctx) => {
      const forward = getViewDirection(ctx.player);
      const origin = castOrigin(ctx.player, 1);
      const landing = offsetAlong(origin, forward, 13);
      trail(ctx.dimension, Particles.FLARE, origin, landing, { maxSamples: 12 });
      const hits = damageAround({ dimension: ctx.dimension, location: landing, id: ctx.player.id }, 3, ctx.damage(6), {
        limit: 6,
      });
      impact(ctx.dimension, landing, { count: 10, radius: 1.4, seed: ctx.player.id });
      return { hit: hits > 0, hits };
    },
  },

  'msu_ability:gravity_well': {
    name: 'Gravity Well',
    slot: 'defense',
    cooldown: 12,
    cost: 26,
    tags: ['control', 'aoe'],
    execute: (ctx) => {
      const centre = forwardPoint(ctx.player, 6);
      const targets = entitiesAround({ dimension: ctx.dimension, location: centre, id: ctx.player.id }, 5, { limit: 8 });
      for (const entity of targets) {
        giveEffects(entity, [
          [Effects.LEVITATION, 2, 1],
          [Effects.SLOWNESS, 5, 3],
        ]);
      }
      burst(ctx.dimension, Particles.CHARGE, centre, { count: 16, radius: 2.5, vertical: 2, seed: ctx.player.id });
      sfx(ctx.dimension, 'PULSE', centre, { volume: 0.8, pitch: 0.7 });
      return { hit: targets.length > 0, hits: targets.length };
    },
  },

  'msu_ability:gravity_flight': {
    name: 'Gravity Flight',
    slot: 'utility',
    cooldown: 6,
    cost: 20,
    tags: ['movement'],
    execute: (ctx) => {
      const forward = getViewDirection(ctx.player);
      giveEffect(ctx.player, Effects.SLOW_FALLING, 8, 1);
      ctx.player.applyImpulse?.({
        x: forward.x * 0.8,
        y: Math.max(0.5, forward.y * 0.8),
        z: forward.z * 0.8,
      });
      burst(ctx.dimension, Particles.CHARGE, ctx.player.location, { count: 10, radius: 0.6, seed: ctx.player.id });
      return { hit: false, moved: true };
    },
  },

  'msu_ability:cosmic_armour': {
    name: 'Cosmic Armour',
    slot: 'defense',
    cooldown: 20,
    cost: 30,
    tags: ['defense'],
    execute: (ctx) => {
      giveEffects(ctx.player, [
        [Effects.RESISTANCE, 10, 2],
        [Effects.ABSORPTION, 10, 4],
        [Effects.REGENERATION, 6, 1],
      ]);
      burst(ctx.dimension, Particles.FLARE, ctx.player.location, { count: 14, radius: 1.2, seed: ctx.player.id });
      return { hit: false, buffed: true };
    },
  },

  'msu_ability:nova_burst': {
    name: 'Nova Burst',
    slot: 'ultimate',
    cooldown: 46,
    cost: 50,
    tags: ['ultimate', 'aoe'],
    execute: (ctx) => {
      const hits = damageAround(ctx.player, 11, ctx.damage(13), { limit: 12 });
      for (const entity of entitiesAround(ctx.player, 11, { limit: 12 })) {
        giveEffect(entity, Effects.LEVITATION, 2, 1);
      }
      giveEffect(ctx.player, Effects.RESISTANCE, 6, 2);
      burst(ctx.dimension, Particles.FLARE, ctx.player.location, {
        count: 28,
        radius: 5,
        vertical: 4,
        seed: ctx.player.id,
      });
      sfx(ctx.dimension, 'ULTIMATE', ctx.player.location, { volume: 1.1, pitch: 0.8 });
      return { hit: hits > 0, hits, ultimate: true };
    },
  },

  'msu_ability:reality_step': {
    name: 'Reality Step',
    slot: 'utility',
    cooldown: 16,
    cost: 26,
    tags: ['movement', 'defense'],
    execute: (ctx) => {
      const forward = getViewDirection(ctx.player);
      const destination = offsetAlong({ ...ctx.player.location, y: ctx.player.location.y + 0.5 }, forward, 12, 1);
      trail(ctx.dimension, Particles.FLARE, ctx.player.location, destination, { maxSamples: 10 });
      ctx.player.teleport(destination, { dimension: ctx.dimension });
      giveEffects(ctx.player, [
        [Effects.RESISTANCE, 3, 1],
        [Effects.SPEED, 4, 2],
      ]);
      return { hit: false, moved: true };
    },
  },

  /* ------------------------------------------------------------------ *
   * Shared utility
   * ------------------------------------------------------------------ */

  'msu_ability:power_surge': {
    name: 'Power Surge',
    slot: 'utility',
    cooldown: 30,
    cost: 0,
    tags: ['support', 'regen'],
    execute: (ctx) => {
      ctx.energy.refund(40);
      giveEffect(ctx.player, Effects.STRENGTH, 6, 1);
      burst(ctx.dimension, Particles.CHARGE, ctx.player.location, { count: 12, radius: 0.8, seed: ctx.player.id });
      sfx(ctx.dimension, 'CHARGE', ctx.player.location, { volume: 0.7, pitch: 1.2 });
      return { hit: false, buffed: true };
    },
  },

  'msu_ability:adrenaline': {
    name: 'Adrenaline',
    slot: 'utility',
    cooldown: 24,
    cost: 15,
    tags: ['support'],
    execute: (ctx) => {
      giveEffects(ctx.player, [
        [Effects.REGENERATION, 5, 1],
        [Effects.SPEED, 5, 1],
      ]);
      return { hit: false, buffed: true };
    },
  },

  'msu_ability:swift_escape': {
    name: 'Escape',
    slot: 'defense',
    cooldown: 18,
    cost: 18,
    tags: ['movement', 'defense'],
    execute: (ctx) => {
      const backward = scale(getViewDirection(ctx.player), -1);
      const destination = offsetAlong({ ...ctx.player.location, y: ctx.player.location.y + 0.3 }, backward, 9, 1.5);
      ctx.player.teleport(destination, { dimension: ctx.dimension });
      giveEffect(ctx.player, Effects.SLOW_FALLING, 3, 1);
      burst(ctx.dimension, Particles.DUST, ctx.player.location, { count: 8, radius: 0.6, seed: ctx.player.id });
      return { hit: false, moved: true };
    },
  },
};

/** Tuned copy of a base ability. Suits use this to express their power tier. */
export function spec(baseId, overrides) {
  const base = DEFINITIONS[baseId];
  if (!base) throw new Error(`spec() references unknown base ability "${baseId}"`);
  return { ...base, ...overrides };
}

/** Tuning multiplier applied to a suit's damage across the whole kit. */
export function damageScale(multiplier) {
  return multiplier;
}

export const CORE_ABILITY_IDS = Object.keys(DEFINITIONS);

/** How many tuned variants `registerCoreAbilities` adds on top of the base set. */
export const TIER_VARIANT_COUNT = 5;

/** Registers the base library plus the tuned tier variants suits refer to. */
export function registerCoreAbilities() {
  for (const [id, definition] of Object.entries(DEFINITIONS)) {
    register({ ...definition, id });
  }

  register(spec('msu_ability:pulse_blast', {
    id: 'msu_ability:pulse_blast_ii',
    name: 'Twin Repulsor Blast',
    cooldown: 0.8,
    cost: 10,
    // A second, weaker shockwave lands four ticks later, reading as a twin shot.
    execute: (ctx) => {
      const result = DEFINITIONS['msu_ability:pulse_blast'].execute(ctx);
      if (result?.hit) {
        ctx.afterTicks(4, () => {
          if (!isEntityUsable(ctx.player)) return;
          const target = resolveTarget(ctx.player, { strategy: 'look-then-nearest', range: 7 });
          if (target.kind === TargetKind.NONE) return;
          const centre = target.location;
          damageAround({ dimension: ctx.dimension, location: centre, id: ctx.player.id }, 2.6, ctx.damage(3), { limit: 3 });
          impact(ctx.dimension, centre, { count: 6, radius: 0.7, seed: ctx.player.id });
        });
      }
      return result;
    },
  }));

  register(spec('msu_ability:web_shot', {
    id: 'msu_ability:web_shot_ii',
    name: 'Twin Web Shot',
    cooldown: 0.9,
    cost: 11,
  }));

  register(spec('msu_ability:speed_dash', {
    id: 'msu_ability:speed_dash_ii',
    name: 'Sonic Dash',
    cooldown: 1.2,
    cost: 12,
    execute: (ctx) => {
      giveEffect(ctx.player, Effects.SPEED, 4, 3);
      return DEFINITIONS['msu_ability:speed_dash'].execute(ctx);
    },
  }));

  register(spec('msu_ability:lightning_bolt', {
    id: 'msu_ability:lightning_bolt_ii',
    name: 'Storm Lance',
    cooldown: 2,
    cost: 20,
  }));

  register(spec('msu_ability:cosmic_ray', {
    id: 'msu_ability:cosmic_ray_ii',
    name: 'Nova Ray',
    cooldown: 1.6,
    cost: 18,
  }));

  return CORE_ABILITY_IDS.length + TIER_VARIANT_COUNT;
}

/* re-exported for hero files that build small custom abilities on top */
export const helpers = {
  pushAway,
  damageAround,
  entitiesAround,
  resolveTarget,
  TargetKind,
  Particles,
  burst,
  trail,
  impact,
  sfx,
  castOrigin,
  giveEffect,
  giveEffects,
  Effects,
  offsetAlong,
  forwardPoint,
  XpRewards,
};