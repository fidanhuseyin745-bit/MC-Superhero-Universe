/**
 * Minimal ZIP writer.
 *
 * Termux (the primary development target) has no `zip` binary and CI runners
 * should not need one either, so packs are archived here in pure JavaScript.
 * Entries use a fixed DOS timestamp, which makes builds reproducible.
 */
import { deflateRawSync } from 'node:zlib';

const DOS_TIME = 0; // 00:00:00
const DOS_DATE = 0x0021; // 1980-01-01, the earliest value the format allows
const UTF8_FLAG = 0x0800;

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

export function crc32(bytes) {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

class ZipWriter {
  constructor() {
    this.entries = [];
    this.offset = 0;
    this.parts = [];
  }

  /**
   * @param {string} name Path inside the archive, always forward-slashed.
   * @param {Buffer|string} content
   * @param {boolean} [compress] Deflate text files, store small binaries as-is.
   */
  add(name, content, compress = true) {
    const raw = Buffer.isBuffer(content) ? content : Buffer.from(content, 'utf8');
    const useDeflate = compress && raw.length > 256;
    const payload = useDeflate ? deflateRawSync(raw, { level: 9 }) : raw;
    const method = useDeflate ? 8 : 0;
    const crc = crc32(raw);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(UTF8_FLAG, 6);
    local.writeUInt16LE(method, 8);
    local.writeUInt16LE(DOS_TIME, 10);
    local.writeUInt16LE(DOS_DATE, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(payload.length, 18);
    local.writeUInt32LE(raw.length, 22);
    local.writeUInt16LE(Buffer.byteLength(name, 'utf8'), 26);
    local.writeUInt16LE(0, 28);

    const nameBytes = Buffer.from(name, 'utf8');
    this.entries.push({
      nameBytes,
      method,
      crc,
      localOffset: this.offset,
      compressed: payload.length,
      raw: raw.length,
    });
    this.offset += local.length + nameBytes.length + payload.length;
    this.parts.push(local, nameBytes, payload);
    return this;
  }

  toBuffer() {
    const central = [];
    let centralSize = 0;

    for (const entry of this.entries) {
      const header = Buffer.alloc(46);
      header.writeUInt32LE(0x02014b50, 0);
      header.writeUInt16LE(20, 4); // version made by
      header.writeUInt16LE(20, 6); // version needed
      header.writeUInt16LE(UTF8_FLAG, 8);
      header.writeUInt16LE(entry.method, 10);
      header.writeUInt16LE(DOS_TIME, 12);
      header.writeUInt16LE(DOS_DATE, 14);
      header.writeUInt32LE(entry.crc, 16);
      header.writeUInt32LE(entry.compressed, 20);
      header.writeUInt32LE(entry.raw, 24);
      header.writeUInt16LE(entry.nameBytes.length, 28);
      header.writeUInt16LE(0, 30); // extra length
      header.writeUInt16LE(0, 32); // comment length
      header.writeUInt16LE(0, 34); // disk number
      header.writeUInt16LE(0, 36); // internal attributes
      header.writeUInt32LE(0, 38); // external attributes
      header.writeUInt32LE(entry.localOffset, 42);
      central.push(header, entry.nameBytes);
      centralSize += header.length + entry.nameBytes.length;
    }

    const end = Buffer.alloc(22);
    end.writeUInt32LE(0x06054b50, 0);
    end.writeUInt16LE(0, 4);
    end.writeUInt16LE(0, 6);
    end.writeUInt16LE(this.entries.length, 8);
    end.writeUInt16LE(this.entries.length, 10);
    end.writeUInt32LE(centralSize, 12);
    end.writeUInt32LE(this.offset, 16);
    end.writeUInt16LE(0, 20);

    return Buffer.concat([...this.parts, ...central, end]);
  }
}

export function createZip() {
  return new ZipWriter();
}