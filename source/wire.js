// 按 protobuf 字段编辑；未处理的字段保留原始字节，不解码后重新生成整个消息。
export function concat(parts) {
  const out = new Uint8Array(parts.reduce((size, part) => size + part.length, 0));
  let offset = 0;
  for (const part of parts) { out.set(part, offset); offset += part.length; }
  return out;
}

export function varint(value) {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error('无效的 protobuf 整数');
  const out = [];
  do { const byte = value % 128; value = Math.floor(value / 128); out.push(byte + (value ? 128 : 0)); } while (value);
  return Uint8Array.from(out);
}

export function bytesField(no, data) {
  return concat([varint(no * 8 + 2), varint(data.length), data]);
}

export function integerField(no, value) {
  return concat([varint(no * 8), varint(value)]);
}

export function fields(bytes) {
  const out = [];
  let offset = 0;
  function readInteger() {
    let value = 0, scale = 1;
    for (let i = 0; i < 10; i++) {
      if (offset >= bytes.length) throw new Error('protobuf 数据截断');
      const byte = bytes[offset++];
      value += (byte & 127) * scale;
      if (!(byte & 128)) {
        if (!Number.isSafeInteger(value)) throw new Error('protobuf 整数超出范围');
        return value;
      }
      scale *= 128;
    }
    throw new Error('protobuf 整数过长');
  }
  while (offset < bytes.length) {
    const start = offset, tag = readInteger(), no = Math.floor(tag / 8), wire = tag % 8;
    if (no < 1 || no > 536870911) throw new Error('protobuf 字段编号无效');
    let dataStart = offset, value;
    if (wire === 0) {
      // 未知 varint 可能是 64 位值；仅定位结束位置，保留其原始编码。
      let ended = false;
      for (let i = 0; i < 10; i++) {
        if (offset >= bytes.length) throw new Error('protobuf 数据截断');
        if (!(bytes[offset++] & 128)) { ended = true; break; }
      }
      if (!ended) throw new Error('protobuf 整数过长');
    } else if (wire === 2) {
      const size = readInteger(); dataStart = offset; offset += size;
    } else if (wire === 1 || wire === 5) {
      offset += wire === 1 ? 8 : 4;
    } else {
      throw new Error('不支持的 protobuf 字段类型');
    }
    if (offset > bytes.length) throw new Error('protobuf 字段长度越界');
    const data = bytes.subarray(dataStart, offset);
    if (wire === 0 && data.length <= 4) {
      value = [...data].reduce((sum, byte, i) => sum + (byte & 127) * 128 ** i, 0);
    }
    out.push({ no, wire, data, value, raw: bytes.subarray(start, offset) });
  }
  return out;
}

export function getBytes(bytes, no) {
  return fields(bytes).find((field) => field.no === no && field.wire === 2)?.data;
}

export function editBytes(bytes, no, transform, create = false) {
  let found = false;
  const parts = fields(bytes).map((field) => {
    if (field.no !== no || field.wire !== 2) return field.raw;
    found = true;
    return bytesField(no, transform(field.data));
  });
  if (!found && create) parts.push(bytesField(no, transform(new Uint8Array())));
  return concat(parts);
}

export function setInteger(bytes, no, value) {
  const parts = fields(bytes).filter((field) => field.no !== no).map((field) => field.raw);
  parts.push(integerField(no, value));
  return concat(parts);
}

export function normalizeBody(body) {
  if (body instanceof Uint8Array) return body;
  if (body instanceof ArrayBuffer) return new Uint8Array(body);
  if (ArrayBuffer.isView(body)) return new Uint8Array(body.buffer, body.byteOffset, body.byteLength);
  throw new Error('响应不是二进制数据');
}

export function encodeBase64(bytes) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const value = bytes[i] * 65536 + (bytes[i + 1] || 0) * 256 + (bytes[i + 2] || 0);
    out += alphabet[(value >>> 18) & 63] + alphabet[(value >>> 12) & 63] +
      (i + 1 < bytes.length ? alphabet[(value >>> 6) & 63] : '=') +
      (i + 2 < bytes.length ? alphabet[value & 63] : '=');
  }
  return out;
}

export function decodeBase64(text) {
  if (typeof text !== 'string' || !/^[A-Za-z0-9+/_-]*={0,2}$/.test(text)) throw new Error('无效的密钥编码');
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let bits = 0, value = 0;
  const out = [];
  for (const char of text.replace(/-/g, '+').replace(/_/g, '/').replace(/=+$/, '')) {
    value = (value << 6) | alphabet.indexOf(char); bits += 6;
    if (bits >= 8) { bits -= 8; out.push((value >>> bits) & 255); }
  }
  return Uint8Array.from(out);
}
