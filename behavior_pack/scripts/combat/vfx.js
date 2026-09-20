/**
 * Visual and audio feedback.
 *
 * Every call is funnelled through here so that one configuration value
 * (particle scale, adaptive quality tier, sounds on/off) governs the entire
 * addon's visual load. Density is expressed in particles per burst and is
 * multiplied by the quality tier, so the same ability reads correctly on a
 * flagship phone and stays quiet on a low-end one.
 */
import { getAdaptiveTier, getOption } from '../core/config.js';
import { playSound as playSoundRaw, spawnParticle } from '../core/api.js';
import { fromRotation, offsetAlong, scale as scaleVector } from '../core/vectors.js';
import { rngFor } from '../core/rng.js';
import { LIMITS } from '../core/constants.js';

export const Particles = {
  /** Sharp impact ring for punches, bolts and concussive blasts. */
  IMPACT: 'msu:impact',
  /** Soft trail left behind a moving hero or projectile. */
  TRAIL: 'msu:trail',
  /** Web/strand spray. */
  WEB: 'msu:web',
  /** Rising charge motes used while winding an ability up. */
  CHARGE: 'msu:charge',
  /** Ground dust for landings and footsteps. */
  DUST: 'msu:dust',
  /** Six-point flare for thunder and cosmic abilities. */
  FLARE: 'msu:flare',
};

export const Sounds = {
  CHARGE: 'random.orb',
  IMPACT: 'random.explode',
  WHOOSH: 'mob.enderdragon.flap',
  BLAST: 'mob.warden.sonic_boom',
  WEB: 'item.trident.throw',
  LAND: 'block.anvil.land',
  PULSE: 'block.beacon.activate',
  ULTIMATE: 'mob.wither.spawn',
};

/** Effective particle count for a requested density, after device tiering. */
export function density(requested) {
  const configured = Number(getOption('particleScale') ?? 1);
  const tier = getOption('adaptiveQuality') === false ? 1 : getAdaptiveTier();
  return Math.max(1, Math.min(LIMITS.maxProjectileBatch, Math.round(requested * configured * tier)));
}

export function particlesEnabled() {
  return getOption('enableParticles') !== false;
}

export function soundsEnabled() {
  return getOption('enableSounds') !== false;
}

/**
 * Emits a burst of particles around a point.
 * @param {object} dimension
 * @param {string} particleId
 * @param {{x:number,y:number,z:number}} location
 * @param {object} [options]
 * @param {number} [options.count] Requested particle count before scaling.
 * @param {number} [options.radius] Scatter radius in blocks.
 * @param {number} [options.vertical] Vertical scatter, defaults to radius.
 * @param {string} [options.seed] Makes the scatter reproducible.
 */
export function burst(dimension, particleId, location, options = {}) {
  if (!particlesEnabled() || !dimension) return 0;
  const count = density(options.count ?? 8);
  const radius = options.radius ?? 0.6;
  const vertical = options.vertical ?? radius;
  const rng = rngFor(`${particleId}`, options.seed ?? 'burst');
  let emitted = 0;

  for (let i = 0; i < count; i += 1) {
    const point = {
      x: location.x + rng.float(-radius, radius),
      y: location.y + rng.float(-vertical, vertical),
      z: location.z + rng.float(-radius, radius),
    };
    if (spawnParticle(dimension, particleId, point)) emitted += 1;
  }
  return emitted;
}

/** A line of particles from `origin` along `direction`, used for beams. */
export function beam(dimension, particleId, origin, direction, length, options = {}) {
  if (!particlesEnabled() || !dimension) return 0;
  const step = options.step ?? 0.5;
  const samples = Math.max(1, Math.min(LIMITS.maxProjectileBatch * 2, Math.floor(length / step)));
  let emitted = 0;
  for (let i = 0; i < samples; i += 1) {
    const offset = (i / samples) * length;
    const point = {
      x: origin.x + direction.x * offset,
      y: origin.y + direction.y * offset,
      z: origin.z + direction.z * offset,
    };
    if (spawnParticle(dimension, particleId, point)) emitted += 1;
  }
  return emitted;
}

/** Drops particles between two points - used for webs and grapple lines. */
export function trail(dimension, particleId, from, to, options = {}) {
  if (!particlesEnabled() || !dimension) return 0;
  const maxSamples = options.maxSamples ?? 12;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dz = to.z - from.z;
  const length = Math.hypot(dx, dy, dz);
  const samples = Math.max(2, Math.min(maxSamples, Math.ceil(length / (options.step ?? 0.75))));
  let emitted = 0;
  for (let i = 0; i <= samples; i += 1) {
    const t = i / samples;
    const point = { x: from.x + dx * t, y: from.y + dy * t, z: from.z + dz * t };
    if (spawnParticle(dimension, particleId, point)) emitted += 1;
  }
  return emitted;
}

/**
 * Plays a sound at a location.
 * @param {string} soundId A short key from `Sounds` or a full sound id.
 */
export function sfx(dimension, soundId, location, options = {}) {
  if (!soundsEnabled() || !dimension) return false;
  const resolved = Sounds[soundId] ?? soundId;
  return playSoundRaw(location, dimension, resolved, {
    volume: options.volume ?? 0.7,
    pitch: options.pitch ?? 1,
  });
}

/**
 * Draws a hero's signature move: a burst plus its particle trail, with an
 * optional sound. Used on landings, strikes and ultimates.
 */
export function impact(dimension, location, options = {}) {
  const particle = options.particle ?? Particles.IMPACT;
  const emitted = burst(dimension, particle, location, {
    count: options.count ?? 12,
    radius: options.radius ?? 1.2,
    seed: options.seed,
  });
  if (options.sound !== false) sfx(dimension, options.sound ?? 'IMPACT', location, options.sfxOptions ?? {});
  return emitted;
}

/** Scatters dust along a player's recent path. */
export function footsteps(player, options = {}) {
  if (!particlesEnabled()) return 0;
  const location = player.location;
  const velocity = player.getVelocity?.() ?? { x: 0, y: 0, z: 0 };
  const speed = Math.hypot(velocity.x, velocity.z);
  if (speed < 0.12) return 0;
  const behind = scaleVector(fromRotation(player.getRotation?.() ?? { x: 0, y: 0 }), -0.6);
  return burst(player.dimension, Particles.DUST, {
    x: location.x + behind.x,
    y: location.y + 0.1,
    z: location.z + behind.z,
  }, { count: options.count ?? 3, radius: 0.25, seed: player.id });
}

/** The point a projectile or blast should originate from (eye height). */
export function castOrigin(player, forwardBias = 0.8) {
  const location = player.location;
  const base = { x: location.x, y: location.y + 1.4, z: location.z };
  if (!forwardBias) return base;
  const forward = fromRotation(player.getRotation?.() ?? { x: 0, y: 0 });
  return offsetAlong(base, forward, forwardBias, 0);
}