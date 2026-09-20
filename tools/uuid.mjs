/**
 * UUID generation and validation.
 *
 * Pack/module UUIDs must be stable and unique forever; this tool emits v4
 * UUIDs in the lowercase form Bedrock expects.
 *
 * Usage:
 *   node tools/uuid.mjs        # print one uuid
 *   node tools/uuid.mjs 4      # print four uuids
 */
import { randomUUID } from 'node:crypto';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export function isUuid(value) {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}

const count = Math.max(1, Number.parseInt(process.argv[2] ?? '1', 10) || 1);
for (let i = 0; i < count; i += 1) console.log(randomUUID());