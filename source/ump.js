// 参考 Apache-2.0 的 isinglever/adguard source/youtube/lib/ump.js 及对应 protobuf 定义。
import { ctr } from '@noble/ciphers/aes';
import { hmac } from '@noble/hashes/hmac';
import { sha256 } from '@noble/hashes/sha256';
import { gzipSync, gunzipSync } from 'fflate';
import { bytesField, concat, editBytes, fields, getBytes } from './wire.js';
import { transformWatch } from './policy.js';

const MAX_PART_BYTES = 32 * 1024 * 1024;
export function readParts(body) {
  let offset = 0;
  const parts = [];
  function number() {
    if (offset >= body.length) throw new Error('UMP 头部截断');
    const first = body[offset++];
    if (first >= 248) throw new Error('UMP 整数前缀无效');
    let size = 1;
    while (size < 5 && first & (128 >> (size - 1))) size++;
    let bits = size === 5 ? 0 : 8 - size;
    let value = size === 5 ? 0 : first & ((1 << bits) - 1);
    for (let i = 1; i < size; i++) {
      if (offset >= body.length) throw new Error('UMP 整数截断');
      value += body[offset++] * 2 ** bits; bits += 8;
    }
    return value;
  }
  while (offset < body.length) {
    const start = offset, type = number(), length = number();
    if (length > MAX_PART_BYTES || offset + length > body.length) throw new Error('UMP 分段长度无效');
    const data = body.subarray(offset, offset + length); offset += length;
    parts.push({ type, data, raw: body.subarray(start, offset) });
  }
  return parts;
}

export function umpNumber(value) {
  if (!Number.isInteger(value) || value < 0 || value > 0xffffffff) throw new Error('UMP 整数无效');
  let size = 1;
  while (size < 5 && value >= 2 ** (7 * size)) size++;
  const prefix = size === 5 ? 240 : (256 - 2 ** (9 - size)) & 255;
  const bits = size === 5 ? 0 : 8 - size;
  const out = [prefix | (size === 5 ? 0 : value % 2 ** bits)];
  value = Math.floor(value / 2 ** bits);
  for (let i = 1; i < size; i++) { out.push(value % 256); value = Math.floor(value / 256); }
  return Uint8Array.from(out);
}

export function writePart(type, data) {
  return concat([umpNumber(type), umpNumber(data.length), data]);
}

function equal(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}
function mac(data, iv, key) {
  return hmac(sha256, key.subarray(16), concat([data, iv]));
}

export function transformEncrypted(part, key, options, transformNext) {
  const encrypted = getBytes(part, 1), receivedMac = getBytes(part, 2), iv = getBytes(part, 3);
  const compressionField = fields(part).find((field) => field.no === 4 && field.wire === 0);
  const compression = compressionField ? compressionField.value : 0;
  if (!encrypted || receivedMac?.length !== 32 || iv?.length !== 16 || key.length !== 32) throw new Error('加密播放响应结构无效');
  if (compression !== 0 && compression !== 1) throw new Error('不支持的播放响应压缩格式');
  if (!equal(mac(encrypted, iv, key), receivedMac)) throw new Error('播放响应完整性验证失败');
  let plain = ctr(key.subarray(0, 16), iv).decrypt(encrypted);
  const compressed = plain[0] === 31 && plain[1] === 139;
  if (compression === 1 && !compressed) throw new Error('播放响应压缩声明与数据不一致');
  if (compressed) {
    // fflate 同步解压使用固定输出缓冲区，先限制 gzip 尾部声明的分配长度。
    const size = plain.length >= 18 ? new DataView(plain.buffer, plain.byteOffset + plain.length - 4, 4).getUint32(0, true) : MAX_PART_BYTES + 1;
    if (size > MAX_PART_BYTES) throw new Error('播放响应展开长度超出限制');
    plain = gunzipSync(plain);
  }
  let changed = transformWatch(plain, options, 4, transformNext);
  if (compressed) changed = gzipSync(changed, { level: 0 });
  const cipher = ctr(key.subarray(0, 16), iv).encrypt(changed);
  return editBytes(editBytes(part, 1, () => cipher), 2, () => mac(cipher, iv, key));
}

export function transformUmp(body, key, options, transformNext) {
  let headerType = -1, changed = false;
  const output = [];
  for (const part of readParts(body)) {
    if (part.type === 10) headerType = fields(part.data).find((field) => field.no === 1 && field.wire === 0)?.value;
    if (part.type === 11) {
      if (headerType === 25) {
        output.push(writePart(part.type, transformEncrypted(part.data, key, options, transformNext)));
        changed = true;
      } else output.push(part.raw);
      headerType = -1;
    } else output.push(part.raw);
  }
  return changed ? concat(output) : body;
}
