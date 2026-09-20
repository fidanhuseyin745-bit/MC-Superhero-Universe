#!/usr/bin/env node
/**
 * Generates every PNG asset used by the project.
 *
 * There is no ImageMagick or `zip` on Termux and none in CI, so all art is
 * produced from code: pack icons, the hero core item icon and the particle
 * textures. Everything is deterministic - re-running the generator produces
 * byte-identical files, which keeps `git status` clean.
 *
 * Usage: node tools/gen-art.mjs
 */
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(bytes) {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([length, body, crc]);
}

/** Canvas of RGBA pixels addressed as (x, y, [r, g, b, a]). */
class Canvas {
  constructor(size) {
    this.size = size;
    this.pixels = new Uint8Array(size * size * 4);
  }

  set(x, y, rgba) {
    if (x < 0 || y < 0 || x >= this.size || y >= this.size) return;
    const offset = (y * this.size + x) * 4;
    this.pixels[offset] = rgba[0];
    this.pixels[offset + 1] = rgba[1];
    this.pixels[offset + 2] = rgba[2];
    this.pixels[offset + 3] = rgba.length > 3 ? rgba[3] : 255;
  }

  toPng() {
    const stride = this.size * 4;
    const raw = Buffer.alloc((stride + 1) * this.size);
    for (let y = 0; y < this.size; y += 1) {
      raw[y * (stride + 1)] = 0; // filter: none
      Buffer.from(this.pixels.buffer, y * stride, stride).copy(raw, y * (stride + 1) + 1);
    }
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(this.size, 0);
    ihdr.writeUInt32BE(this.size, 4);
    ihdr[8] = 8; // bit depth
    ihdr[9] = 6; // colour type: RGBA
    return Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      chunk('IHDR', ihdr),
      chunk('IDAT', deflateSync(raw, { level: 9 })),
      chunk('IEND', Buffer.alloc(0)),
    ]);
  }
}

function mix(a, b, t) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
    Math.round((a[3] ?? 255) + ((b[3] ?? 255) - (a[3] ?? 255)) * t),
  ];
}

/** Soft radial glow centred on the canvas - the base of every generated icon. */
function radialGlow(size, inner, outer) {
  const canvas = new Canvas(size);
  const centre = (size - 1) / 2;
  const maxDistance = Math.hypot(centre, centre);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const distance = Math.hypot(x - centre, y - centre) / maxDistance;
      canvas.set(x, y, mix(inner, outer, Math.min(1, distance)));
    }
  }
  return canvas;
}

/** Darker rounded-square plate so icons read well on both light and dark menus. */
function roundedPlate(canvas, colour) {
  const { size } = canvas;
  const radius = size * 0.18;
  const inset = Math.round(size * 0.06);
  for (let y = inset; y < size - inset; y += 1) {
    for (let x = inset; x < size - inset; x += 1) {
      const cx = Math.min(Math.max(x, inset + radius), size - inset - radius);
      const cy = Math.min(Math.max(y, inset + radius), size - inset - radius);
      if (Math.hypot(x - cx, y - cy) > radius) continue;
      const border =
        x < inset + 2 || y < inset + 2 || x >= size - inset - 2 || y >= size - inset - 2;
      canvas.set(x, y, border ? colour.edge : colour.fill);
    }
  }
}

function drawDisc(canvas, cx, cy, radius, rgba) {
  for (let y = Math.floor(cy - radius); y <= Math.ceil(cy + radius); y += 1) {
    for (let x = Math.floor(cx - radius); x <= Math.ceil(cx + radius); x += 1) {
      if (Math.hypot(x - cx, y - cy) <= radius) canvas.set(x, y, rgba);
    }
  }
}

function drawStar(canvas, cx, cy, outer, inner, points, rgba) {
  const step = Math.PI / points;
  for (let i = 0; i < points * 2; i += 1) {
    const angle = i * step - Math.PI / 2;
    const radius = i % 2 === 0 ? outer : inner;
    drawDisc(canvas, cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius, 0.9, rgba);
  }
}

function write(relativePath, buffer) {
  const target = join(ROOT, relativePath);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, buffer);
  return `${relativePath} (${buffer.length} bytes)`;
}

const ICON_SIZE = 128;

/** Blue hex-plate with a green core: the project-level pack icon. */
function packIcon() {
  const canvas = radialGlow(ICON_SIZE, [16, 26, 48, 255], [6, 10, 20, 255]);
  roundedPlate(canvas, { fill: [22, 40, 74, 255], edge: [90, 170, 255, 255] });
  drawDisc(canvas, 64, 64, 30, [12, 20, 34, 255]);
  drawDisc(canvas, 64, 64, 24, [40, 210, 150, 255]);
  drawDisc(canvas, 64, 64, 14, [190, 255, 230, 255]);
  return canvas.toPng();
}

/** Green-core reactor icon for the msu:hero_core item. */
function heroCoreIcon() {
  const canvas = new Canvas(16);
  for (let y = 0; y < 16; y += 1) {
    for (let x = 0; x < 16; x += 1) {
      const distance = Math.hypot(x - 7.5, y - 7.5);
      if (distance > 7.4) continue;
      if (distance > 6.2) canvas.set(x, y, [70, 84, 108, 255]);
      else if (distance > 4.2) canvas.set(x, y, [24, 32, 46, 255]);
      else if (distance > 2.6) canvas.set(x, y, [64, 226, 168, 255]);
      else canvas.set(x, y, [214, 255, 240, 255]);
    }
  }
  // Four reactor vents.
  for (const [x, y] of [
    [7, 1],
    [8, 1],
    [7, 14],
    [8, 14],
    [1, 7],
    [1, 8],
    [14, 7],
    [14, 8],
  ]) {
    canvas.set(x, y, [120, 230, 255, 255]);
  }
  return canvas.toPng();
}

/** Small additive spark used by the impact and trail particles. */
function sparkTexture() {
  const canvas = new Canvas(8);
  for (let y = 0; y < 8; y += 1) {
    for (let x = 0; x < 8; x += 1) {
      const distance = Math.hypot(x - 3.5, y - 3.5) / 3.5;
      const alpha = Math.max(0, 1 - distance) ** 2;
      canvas.set(x, y, [255, 255, 255, Math.round(alpha * 255)]);
    }
  }
  return canvas.toPng();
}

/** Soft cloud puff used by the web and dust particles. */
function puffTexture() {
  const canvas = new Canvas(16);
  for (let y = 0; y < 16; y += 1) {
    for (let x = 0; x < 16; x += 1) {
      const wobble = Math.sin(x * 0.9) * 0.6 + Math.cos(y * 1.1) * 0.6;
      const distance = Math.hypot(x - 7.5, y - 7.5 + wobble) / 8;
      const alpha = Math.max(0, 1 - distance) ** 1.5;
      canvas.set(x, y, [255, 255, 255, Math.round(alpha * 200)]);
    }
  }
  return canvas.toPng();
}

/** Six-point arc reactor flare for the cosmic and thunder heroes. */
function flareTexture() {
  const canvas = new Canvas(16);
  drawStar(canvas, 7.5, 7.5, 7.4, 1.6, 6, [255, 255, 255, 235]);
  drawDisc(canvas, 7.5, 7.5, 2.6, [255, 255, 255, 255]);
  return canvas.toPng();
}

const generated = [
  write('resource_pack/pack_icon.png', packIcon()),
  write('behavior_pack/pack_icon.png', packIcon()),
  write('resource_pack/textures/pack_icon/msu_pack.png', packIcon()),
  write('resource_pack/textures/items/msu_hero_core.png', heroCoreIcon()),
  write('resource_pack/textures/particle/msu_spark.png', sparkTexture()),
  write('resource_pack/textures/particle/msu_puff.png', puffTexture()),
  write('resource_pack/textures/particle/msu_flare.png', flareTexture()),
];

console.log(`Generated ${generated.length} PNG assets:`);
for (const line of generated) console.log(`  - ${line}`);
