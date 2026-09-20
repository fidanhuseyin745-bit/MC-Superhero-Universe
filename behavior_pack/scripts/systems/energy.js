/**
 * Energy pools.
 *
 * Energy is the throttle that keeps a powerful hero from also being a
 * permanently-on hero. It regenerates on a slow interval (never per tick) and
 * is always clamped, so an ability cannot push it negative or above the cap.
 */
import { clamp } from '../core/units.js';
import { getOption } from '../core/config.js';

export class EnergyPool {
  /**
   * @param {object} definition
   * @param {number} definition.max
   * @param {number} [definition.regen] Units per second.
   * @param {number} [definition.regenDelay] Seconds of silence before regen resumes.
   * @param {number} [definition.start] Starting fraction of max, 0..1.
   */
  constructor(definition = {}) {
    this.max = definition.max ?? 100;
    this.regenPerSecond = (definition.regen ?? 1) * Number(getOption('defaultEnergyRegen') ?? 1);
    this.regenDelayTicks = Math.max(0, Math.round((definition.regenDelay ?? 1.5) * 20));
    this.current = this.max * (definition.start ?? 1);
    this.lastSpendTick = Number.NEGATIVE_INFINITY;
  }

  get ratio() {
    return this.max <= 0 ? 0 : this.current / this.max;
  }

  has(amount) {
    return this.current >= amount;
  }

  /** Attempts a spend. Returns false and changes nothing when too expensive. */
  spend(amount, tick) {
    if (amount <= 0) return true;
    if (this.current < amount) return false;
    this.current -= amount;
    this.lastSpendTick = tick;
    return true;
  }

  /** Refund path for abilities that failed after paying their cost. */
  refund(amount) {
    this.current = clamp(this.current + amount, 0, this.max);
    return this.current;
  }

  /** @param {number} ticksElapsed Ticks since the previous tick call. */
  tick(tick, ticksElapsed) {
    if (this.current >= this.max) {
      // Snap to the cap so a tier change cannot leave a fractional overflow.
      this.current = this.max;
      return 0;
    }
    if (tick - this.lastSpendTick < this.regenDelayTicks) return 0;
    const before = this.current;
    this.current = clamp(
      this.current + (this.regenPerSecond * ticksElapsed) / 20,
      0,
      this.max,
    );
    return this.current - before;
  }

  setMax(max) {
    this.max = max;
    this.current = clamp(this.current, 0, max);
  }

  fraction() {
    return this.ratio;
  }

  restore() {
    this.current = this.max;
  }

  /** Compact description used by the HUD and the stats form. */
  describe() {
    return { current: Math.round(this.current), max: this.max, ratio: this.ratio };
  }

  serialise() {
    return Math.round(this.current * 100) / 100;
  }
}

/**
 * Derives a pool from a suit definition, falling back to the config default when
 * a hero does not declare one.
 */
export function createPool(suit) {
  const energy = suit?.energy ?? {};
  return new EnergyPool({
    max: energy.max ?? 100,
    regen: energy.regen ?? 1,
    regenDelay: energy.regenDelay ?? 1.5,
    start: energy.start ?? 1,
  });
}