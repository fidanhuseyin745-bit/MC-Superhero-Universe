/**
 * Runtime configuration with runtime overrides.
 *
 * On a phone the biggest risks are long-running area effects and per-tick
 * scans, so the mobile profile is the default and everything expensive is
 * opt-in rather than opt-out.
 */

export const PRESETS = {
  mobile: {
    logLevel: 'warn',
    adaptiveQuality: true,
    enableParticles: true,
    particleScale: 0.5,
    enableSounds: true,
    enableCameraShake: false,
    enableScreenEffects: true,
    maxActiveSessions: 20,
    defaultEnergyRegen: 0.75,
    autoUnlockFirstSuit: true,
    announceAbilitiesInChat: false,
    debugHud: false,
  },
  balanced: {
    logLevel: 'warn',
    adaptiveQuality: true,
    enableParticles: true,
    particleScale: 1,
    enableSounds: true,
    enableCameraShake: true,
    enableScreenEffects: true,
    maxActiveSessions: 40,
    defaultEnergyRegen: 1,
    autoUnlockFirstSuit: true,
    announceAbilitiesInChat: true,
    debugHud: false,
  },
  cinematic: {
    logLevel: 'info',
    adaptiveQuality: false,
    enableParticles: true,
    particleScale: 1.5,
    enableSounds: true,
    enableCameraShake: true,
    enableScreenEffects: true,
    maxActiveSessions: 40,
    defaultEnergyRegen: 1.25,
    autoUnlockFirstSuit: true,
    announceAbilitiesInChat: true,
    debugHud: false,
  },
};

const overrides = new Map();

export function applyPreset(name) {
  const preset = PRESETS[name];
  if (!preset) return false;
  overrides.clear();
  for (const [key, value] of Object.entries(preset)) overrides.set(key, value);
  return true;
}

export function setOption(key, value) {
  overrides.set(key, value);
}

export function getOption(key) {
  if (overrides.has(key)) return overrides.get(key);
  return PRESETS.mobile[key];
}

export function configSnapshot() {
  return { preset: { ...PRESETS.mobile }, overrides: Object.fromEntries(overrides) };
}

export function resetConfig() {
  overrides.clear();
}

/**
 * Adaptive visual tier, shared by the quality controller and the VFX layer.
 *
 * The engine writes the sampled tier here; particle density reads it. Keeping it
 * in config (rather than passing it through every call) means a shared ability
 * automatically respects the current device load without knowing it exists.
 */
let adaptiveTier = 1;

export function setAdaptiveTier(value) {
  const next = clampNumber(value, 0.4, 1);
  const changed = next !== adaptiveTier;
  adaptiveTier = next;
  return changed;
}

export function getAdaptiveTier() {
  return adaptiveTier;
}

function clampNumber(value, min, max) {
  if (typeof value !== 'number' || Number.isNaN(value)) return min;
  return value < min ? min : value > max ? max : value;
}

/**
 * Quality scaler. Samples the engine's own tick cost and steps visual
 * intensity down before the phone's frame rate suffers, then recovers slowly.
 */
export function createQualityController(options = {}) {
  const budget = options.budgetMs ?? 6;
  const window = options.window ?? 100;
  let samples = 0;
  let total = 0;
  let tier = 1;
  let cooldown = 0;

  return {
    sample(elapsedMs) {
      samples += 1;
      total += elapsedMs;
      if (samples < window) return tier;
      const average = total / samples;
      samples = 0;
      total = 0;
      if (average > budget && tier > 0.4) tier = Math.max(0.4, tier - 0.2);
      else if (average < budget * 0.5 && tier < 1 && cooldown <= 0) tier = Math.min(1, tier + 0.1);
      cooldown = 3;
      return tier;
    },
    get tier() {
      return tier;
    },
    /** Effective multiplier for particle/sound volume. */
    scale() {
      const configured = Number(getOption('particleScale') ?? 1);
      return getOption('adaptiveQuality') ? configured * tier : configured;
    },
    reset() {
      samples = 0;
      total = 0;
      tier = 1;
      cooldown = 0;
    },
  };
}