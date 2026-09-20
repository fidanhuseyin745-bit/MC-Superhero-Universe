/**
 * Vector maths on plain `{x, y, z}` objects.
 *
 * Bedrock's `Vector3` is a plain object, so the engine never allocates engine
 * classes for maths that runs every tick.
 */

export const ZERO = Object.freeze({ x: 0, y: 0, z: 0 });
export const UP = Object.freeze({ x: 0, y: 1, z: 0 });

export function vec(x = 0, y = 0, z = 0) {
  return { x, y, z };
}

export function clone(v) {
  return { x: v.x, y: v.y, z: v.z };
}

export function add(a, b) {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

export function subtract(a, b) {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

export function scale(a, factor) {
  return { x: a.x * factor, y: a.y * factor, z: a.z * factor };
}

export function length(v) {
  return Math.hypot(v.x, v.y, v.z);
}

export function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

export function dot(a, b) {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

export function normalize(v) {
  const magnitude = length(v);
  if (magnitude < 1e-6) return { x: 0, y: 0, z: 0 };
  return { x: v.x / magnitude, y: v.y / magnitude, z: v.z / magnitude };
}

export function lerp(a, b, t) {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    z: a.z + (b.z - a.z) * t,
  };
}

/** Height-only horizontal distance - the useful measure for knockback and range. */
export function horizontalDistance(a, b) {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

export function flatten(v) {
  return { x: v.x, y: 0, z: v.z };
}

export function withY(v, y) {
  return { x: v.x, y, z: v.z };
}

/** Rounds to whole blocks; Bedrock rejects fractional block coordinates. */
export function toBlock(v) {
  return { x: Math.floor(v.x), y: Math.floor(v.y), z: Math.floor(v.z) };
}

export function toRotation(v) {
  const yaw = (-Math.atan2(v.x, v.z) * 180) / Math.PI;
  const pitch = (-Math.asin(normalize(v).y) * 180) / Math.PI;
  return { x: pitch, y: yaw };
}

/** Direction vector from a Bedrock `{x: pitch, y: yaw}` rotation. */
export function fromRotation(rotation) {
  const pitch = (rotation.x * Math.PI) / 180;
  const yaw = (rotation.y * Math.PI) / 180;
  return {
    x: -Math.sin(yaw) * Math.cos(pitch),
    y: -Math.sin(pitch),
    z: Math.cos(yaw) * Math.cos(pitch),
  };
}

export function offsetAlong(origin, direction, distanceMeters, verticalBias = 0) {
  const step = scale(normalize(direction), distanceMeters);
  return { x: origin.x + step.x, y: origin.y + step.y + verticalBias, z: origin.z + step.z };
}

export function isFinite3(v) {
  return Number.isFinite(v?.x) && Number.isFinite(v?.y) && Number.isFinite(v?.z);
}