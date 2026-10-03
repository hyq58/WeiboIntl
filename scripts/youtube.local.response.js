// 个人本机播放过滤版；源码在 source/，第三方来源与许可见 NOTICE.md。
// 构建生成文件，请修改源码后重新构建。
(() => {
  var __defProp = Object.defineProperty;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

  // source/wire.js
  function concat(parts) {
    const out = new Uint8Array(parts.reduce((size, part) => size + part.length, 0));
    let offset = 0;
    for (const part of parts) {
      out.set(part, offset);
      offset += part.length;
    }
    return out;
  }
  function varint(value) {
    if (!Number.isSafeInteger(value) || value < 0) throw new Error("\u65E0\u6548\u7684 protobuf \u6574\u6570");
    const out = [];
    do {
      const byte = value % 128;
      value = Math.floor(value / 128);
      out.push(byte + (value ? 128 : 0));
    } while (value);
    return Uint8Array.from(out);
  }
  function bytesField(no, data) {
    return concat([varint(no * 8 + 2), varint(data.length), data]);
  }
  function integerField(no, value) {
    return concat([varint(no * 8), varint(value)]);
  }
  function fields(bytes) {
    const out = [];
    let offset = 0;
    function readInteger() {
      let value = 0, scale = 1;
      for (let i = 0; i < 10; i++) {
        if (offset >= bytes.length) throw new Error("protobuf \u6570\u636E\u622A\u65AD");
        const byte = bytes[offset++];
        value += (byte & 127) * scale;
        if (!(byte & 128)) {
          if (!Number.isSafeInteger(value)) throw new Error("protobuf \u6574\u6570\u8D85\u51FA\u8303\u56F4");
          return value;
        }
        scale *= 128;
      }
      throw new Error("protobuf \u6574\u6570\u8FC7\u957F");
    }
    while (offset < bytes.length) {
      const start = offset, tag = readInteger(), no = Math.floor(tag / 8), wire = tag % 8;
      if (no < 1 || no > 536870911) throw new Error("protobuf \u5B57\u6BB5\u7F16\u53F7\u65E0\u6548");
      let dataStart = offset, value;
      if (wire === 0) {
        let ended = false;
        for (let i = 0; i < 10; i++) {
          if (offset >= bytes.length) throw new Error("protobuf \u6570\u636E\u622A\u65AD");
          if (!(bytes[offset++] & 128)) {
            ended = true;
            break;
          }
        }
        if (!ended) throw new Error("protobuf \u6574\u6570\u8FC7\u957F");
      } else if (wire === 2) {
        const size = readInteger();
        dataStart = offset;
        offset += size;
      } else if (wire === 1 || wire === 5) {
        offset += wire === 1 ? 8 : 4;
      } else {
        throw new Error("\u4E0D\u652F\u6301\u7684 protobuf \u5B57\u6BB5\u7C7B\u578B");
      }
      if (offset > bytes.length) throw new Error("protobuf \u5B57\u6BB5\u957F\u5EA6\u8D8A\u754C");
      const data = bytes.subarray(dataStart, offset);
      if (wire === 0 && data.length <= 4) {
        value = [...data].reduce((sum, byte, i) => sum + (byte & 127) * 128 ** i, 0);
      }
      out.push({ no, wire, data, value, raw: bytes.subarray(start, offset) });
    }
    return out;
  }
  function getBytes(bytes, no) {
    var _a2;
    return (_a2 = fields(bytes).find((field) => field.no === no && field.wire === 2)) == null ? void 0 : _a2.data;
  }
  function editBytes(bytes, no, transform, create = false) {
    let found = false;
    const parts = fields(bytes).map((field) => {
      if (field.no !== no || field.wire !== 2) return field.raw;
      found = true;
      return bytesField(no, transform(field.data));
    });
    if (!found && create) parts.push(bytesField(no, transform(new Uint8Array())));
    return concat(parts);
  }
  function setInteger(bytes, no, value) {
    const parts = fields(bytes).filter((field) => field.no !== no).map((field) => field.raw);
    parts.push(integerField(no, value));
    return concat(parts);
  }
  function normalizeBody(body) {
    if (body instanceof Uint8Array) return body;
    if (body instanceof ArrayBuffer) return new Uint8Array(body);
    if (ArrayBuffer.isView(body)) return new Uint8Array(body.buffer, body.byteOffset, body.byteLength);
    throw new Error("\u54CD\u5E94\u4E0D\u662F\u4E8C\u8FDB\u5236\u6570\u636E");
  }
  function encodeBase64(bytes) {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let out = "";
    for (let i = 0; i < bytes.length; i += 3) {
      const value = bytes[i] * 65536 + (bytes[i + 1] || 0) * 256 + (bytes[i + 2] || 0);
      out += alphabet[value >>> 18 & 63] + alphabet[value >>> 12 & 63] + (i + 1 < bytes.length ? alphabet[value >>> 6 & 63] : "=") + (i + 2 < bytes.length ? alphabet[value & 63] : "=");
    }
    return out;
  }
  function decodeBase64(text) {
    if (typeof text !== "string" || !/^[A-Za-z0-9+/_-]*={0,2}$/.test(text)) throw new Error("\u65E0\u6548\u7684\u5BC6\u94A5\u7F16\u7801");
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let bits2 = 0, value = 0;
    const out = [];
    for (const char of text.replace(/-/g, "+").replace(/_/g, "/").replace(/=+$/, "")) {
      value = value << 6 | alphabet.indexOf(char);
      bits2 += 6;
      if (bits2 >= 8) {
        bits2 -= 8;
        out.push(value >>> bits2 & 255);
      }
    }
    return Uint8Array.from(out);
  }

  // source/policy.js
  function transformPlayer(body, options) {
    let result = options.blockAds === false ? body : concat(fields(body).filter((field) => field.no !== 7 && field.no !== 68).map((field) => field.raw));
    if (options.backgroundPlayback !== false) {
      result = editBytes(result, 2, (status) => editBytes(status, 11, (renderer) => editBytes(renderer, 64657230, (ability) => setInteger(ability, 1, 1), true), true));
    }
    return result;
  }
  function transformWatch(body, options, rootField = 1, transformNext = (value) => value) {
    return editBytes(body, rootField, (content) => editBytes(editBytes(content, 2, (player) => transformPlayer(player, options)), 3, transformNext));
  }

  // node_modules/@noble/ciphers/esm/utils.js
  /*! noble-ciphers - MIT License (c) 2023 Paul Miller (paulmillr.com) */
  function isBytes(a) {
    return a instanceof Uint8Array || ArrayBuffer.isView(a) && a.constructor.name === "Uint8Array";
  }
  function abytes(b, ...lengths) {
    if (!isBytes(b))
      throw new Error("Uint8Array expected");
    if (lengths.length > 0 && !lengths.includes(b.length))
      throw new Error("Uint8Array expected of length " + lengths + ", got length=" + b.length);
  }
  function u8(arr) {
    return new Uint8Array(arr.buffer, arr.byteOffset, arr.byteLength);
  }
  function u32(arr) {
    return new Uint32Array(arr.buffer, arr.byteOffset, Math.floor(arr.byteLength / 4));
  }
  function clean(...arrays) {
    for (let i = 0; i < arrays.length; i++) {
      arrays[i].fill(0);
    }
  }
  var isLE = /* @__PURE__ */ (() => new Uint8Array(new Uint32Array([287454020]).buffer)[0] === 68)();
  function overlapBytes(a, b) {
    return a.buffer === b.buffer && // best we can do, may fail with an obscure Proxy
    a.byteOffset < b.byteOffset + b.byteLength && // a starts before b end
    b.byteOffset < a.byteOffset + a.byteLength;
  }
  function complexOverlapBytes(input, output) {
    if (overlapBytes(input, output) && input.byteOffset < output.byteOffset)
      throw new Error("complex overlap of input and output is not supported");
  }
  var wrapCipher = /* @__NO_SIDE_EFFECTS__ */ (params, constructor) => {
    function wrappedCipher(key, ...args) {
      abytes(key);
      if (!isLE)
        throw new Error("Non little-endian hardware is not yet supported");
      if (params.nonceLength !== void 0) {
        const nonce = args[0];
        if (!nonce)
          throw new Error("nonce / iv required");
        if (params.varSizeNonce)
          abytes(nonce);
        else
          abytes(nonce, params.nonceLength);
      }
      const tagl = params.tagLength;
      if (tagl && args[1] !== void 0) {
        abytes(args[1]);
      }
      const cipher = constructor(key, ...args);
      const checkOutput = (fnLength, output) => {
        if (output !== void 0) {
          if (fnLength !== 2)
            throw new Error("cipher output not supported");
          abytes(output);
        }
      };
      let called = false;
      const wrCipher = {
        encrypt(data, output) {
          if (called)
            throw new Error("cannot encrypt() twice with same key + nonce");
          called = true;
          abytes(data);
          checkOutput(cipher.encrypt.length, output);
          return cipher.encrypt(data, output);
        },
        decrypt(data, output) {
          abytes(data);
          if (tagl && data.length < tagl)
            throw new Error("invalid ciphertext length: smaller than tagLength=" + tagl);
          checkOutput(cipher.decrypt.length, output);
          return cipher.decrypt(data, output);
        }
      };
      return wrCipher;
    }
    Object.assign(wrappedCipher, params);
    return wrappedCipher;
  };
  function getOutput(expectedLength, out, onlyAligned = true) {
    if (out === void 0)
      return new Uint8Array(expectedLength);
    if (out.length !== expectedLength)
      throw new Error("invalid output length, expected " + expectedLength + ", got: " + out.length);
    if (onlyAligned && !isAligned32(out))
      throw new Error("invalid output, must be aligned");
    return out;
  }
  function isAligned32(bytes) {
    return bytes.byteOffset % 4 === 0;
  }
  function copyBytes(bytes) {
    return Uint8Array.from(bytes);
  }

  // node_modules/@noble/ciphers/esm/aes.js
  var BLOCK_SIZE = 16;
  var BLOCK_SIZE32 = 4;
  var POLY = 283;
  function mul2(n) {
    return n << 1 ^ POLY & -(n >> 7);
  }
  function mul(a, b) {
    let res = 0;
    for (; b > 0; b >>= 1) {
      res ^= a & -(b & 1);
      a = mul2(a);
    }
    return res;
  }
  var sbox = /* @__PURE__ */ (() => {
    const t = new Uint8Array(256);
    for (let i = 0, x = 1; i < 256; i++, x ^= mul2(x))
      t[i] = x;
    const box = new Uint8Array(256);
    box[0] = 99;
    for (let i = 0; i < 255; i++) {
      let x = t[255 - i];
      x |= x << 8;
      box[t[i]] = (x ^ x >> 4 ^ x >> 5 ^ x >> 6 ^ x >> 7 ^ 99) & 255;
    }
    clean(t);
    return box;
  })();
  var rotr32_8 = (n) => n << 24 | n >>> 8;
  var rotl32_8 = (n) => n << 8 | n >>> 24;
  function genTtable(sbox2, fn) {
    if (sbox2.length !== 256)
      throw new Error("Wrong sbox length");
    const T0 = new Uint32Array(256).map((_, j) => fn(sbox2[j]));
    const T1 = T0.map(rotl32_8);
    const T2 = T1.map(rotl32_8);
    const T3 = T2.map(rotl32_8);
    const T01 = new Uint32Array(256 * 256);
    const T23 = new Uint32Array(256 * 256);
    const sbox22 = new Uint16Array(256 * 256);
    for (let i = 0; i < 256; i++) {
      for (let j = 0; j < 256; j++) {
        const idx = i * 256 + j;
        T01[idx] = T0[i] ^ T1[j];
        T23[idx] = T2[i] ^ T3[j];
        sbox22[idx] = sbox2[i] << 8 | sbox2[j];
      }
    }
    return { sbox: sbox2, sbox2: sbox22, T0, T1, T2, T3, T01, T23 };
  }
  var tableEncoding = /* @__PURE__ */ genTtable(sbox, (s) => mul(s, 3) << 24 | s << 16 | s << 8 | mul(s, 2));
  var xPowers = /* @__PURE__ */ (() => {
    const p = new Uint8Array(16);
    for (let i = 0, x = 1; i < 16; i++, x = mul2(x))
      p[i] = x;
    return p;
  })();
  function expandKeyLE(key) {
    abytes(key);
    const len = key.length;
    if (![16, 24, 32].includes(len))
      throw new Error("aes: invalid key size, should be 16, 24 or 32, got " + len);
    const { sbox2 } = tableEncoding;
    const toClean = [];
    if (!isAligned32(key))
      toClean.push(key = copyBytes(key));
    const k32 = u32(key);
    const Nk = k32.length;
    const subByte = (n) => applySbox(sbox2, n, n, n, n);
    const xk = new Uint32Array(len + 28);
    xk.set(k32);
    for (let i = Nk; i < xk.length; i++) {
      let t = xk[i - 1];
      if (i % Nk === 0)
        t = subByte(rotr32_8(t)) ^ xPowers[i / Nk - 1];
      else if (Nk > 6 && i % Nk === 4)
        t = subByte(t);
      xk[i] = xk[i - Nk] ^ t;
    }
    clean(...toClean);
    return xk;
  }
  function apply0123(T01, T23, s0, s1, s2, s3) {
    return T01[s0 << 8 & 65280 | s1 >>> 8 & 255] ^ T23[s2 >>> 8 & 65280 | s3 >>> 24 & 255];
  }
  function applySbox(sbox2, s0, s1, s2, s3) {
    return sbox2[s0 & 255 | s1 & 65280] | sbox2[s2 >>> 16 & 255 | s3 >>> 16 & 65280] << 16;
  }
  function encrypt(xk, s0, s1, s2, s3) {
    const { sbox2, T01, T23 } = tableEncoding;
    let k = 0;
    s0 ^= xk[k++], s1 ^= xk[k++], s2 ^= xk[k++], s3 ^= xk[k++];
    const rounds = xk.length / 4 - 2;
    for (let i = 0; i < rounds; i++) {
      const t02 = xk[k++] ^ apply0123(T01, T23, s0, s1, s2, s3);
      const t12 = xk[k++] ^ apply0123(T01, T23, s1, s2, s3, s0);
      const t22 = xk[k++] ^ apply0123(T01, T23, s2, s3, s0, s1);
      const t32 = xk[k++] ^ apply0123(T01, T23, s3, s0, s1, s2);
      s0 = t02, s1 = t12, s2 = t22, s3 = t32;
    }
    const t0 = xk[k++] ^ applySbox(sbox2, s0, s1, s2, s3);
    const t1 = xk[k++] ^ applySbox(sbox2, s1, s2, s3, s0);
    const t2 = xk[k++] ^ applySbox(sbox2, s2, s3, s0, s1);
    const t3 = xk[k++] ^ applySbox(sbox2, s3, s0, s1, s2);
    return { s0: t0, s1: t1, s2: t2, s3: t3 };
  }
  function ctrCounter(xk, nonce, src, dst) {
    abytes(nonce, BLOCK_SIZE);
    abytes(src);
    const srcLen = src.length;
    dst = getOutput(srcLen, dst);
    complexOverlapBytes(src, dst);
    const ctr2 = nonce;
    const c32 = u32(ctr2);
    let { s0, s1, s2, s3 } = encrypt(xk, c32[0], c32[1], c32[2], c32[3]);
    const src32 = u32(src);
    const dst32 = u32(dst);
    for (let i = 0; i + 4 <= src32.length; i += 4) {
      dst32[i + 0] = src32[i + 0] ^ s0;
      dst32[i + 1] = src32[i + 1] ^ s1;
      dst32[i + 2] = src32[i + 2] ^ s2;
      dst32[i + 3] = src32[i + 3] ^ s3;
      let carry = 1;
      for (let i2 = ctr2.length - 1; i2 >= 0; i2--) {
        carry = carry + (ctr2[i2] & 255) | 0;
        ctr2[i2] = carry & 255;
        carry >>>= 8;
      }
      ({ s0, s1, s2, s3 } = encrypt(xk, c32[0], c32[1], c32[2], c32[3]));
    }
    const start = BLOCK_SIZE * Math.floor(src32.length / BLOCK_SIZE32);
    if (start < srcLen) {
      const b32 = new Uint32Array([s0, s1, s2, s3]);
      const buf = u8(b32);
      for (let i = start, pos = 0; i < srcLen; i++, pos++)
        dst[i] = src[i] ^ buf[pos];
      clean(b32);
    }
    return dst;
  }
  var ctr = /* @__PURE__ */ wrapCipher({ blockSize: 16, nonceLength: 16 }, function aesctr(key, nonce) {
    function processCtr(buf, dst) {
      abytes(buf);
      if (dst !== void 0) {
        abytes(dst);
        if (!isAligned32(dst))
          throw new Error("unaligned destination");
      }
      const xk = expandKeyLE(key);
      const n = copyBytes(nonce);
      const toClean = [xk, n];
      if (!isAligned32(buf))
        toClean.push(buf = copyBytes(buf));
      const out = ctrCounter(xk, n, buf, dst);
      clean(...toClean);
      return out;
    }
    return {
      encrypt: (plaintext, dst) => processCtr(plaintext, dst),
      decrypt: (ciphertext, dst) => processCtr(ciphertext, dst)
    };
  });

  // node_modules/@noble/hashes/esm/utils.js
  /*! noble-hashes - MIT License (c) 2022 Paul Miller (paulmillr.com) */
  function isBytes2(a) {
    return a instanceof Uint8Array || ArrayBuffer.isView(a) && a.constructor.name === "Uint8Array";
  }
  function anumber(n) {
    if (!Number.isSafeInteger(n) || n < 0)
      throw new Error("positive integer expected, got " + n);
  }
  function abytes2(b, ...lengths) {
    if (!isBytes2(b))
      throw new Error("Uint8Array expected");
    if (lengths.length > 0 && !lengths.includes(b.length))
      throw new Error("Uint8Array expected of length " + lengths + ", got length=" + b.length);
  }
  function ahash(h) {
    if (typeof h !== "function" || typeof h.create !== "function")
      throw new Error("Hash should be wrapped by utils.createHasher");
    anumber(h.outputLen);
    anumber(h.blockLen);
  }
  function aexists(instance, checkFinished = true) {
    if (instance.destroyed)
      throw new Error("Hash instance has been destroyed");
    if (checkFinished && instance.finished)
      throw new Error("Hash#digest() has already been called");
  }
  function aoutput(out, instance) {
    abytes2(out);
    const min = instance.outputLen;
    if (out.length < min) {
      throw new Error("digestInto() expects output buffer of length at least " + min);
    }
  }
  function clean2(...arrays) {
    for (let i = 0; i < arrays.length; i++) {
      arrays[i].fill(0);
    }
  }
  function createView2(arr) {
    return new DataView(arr.buffer, arr.byteOffset, arr.byteLength);
  }
  function rotr(word, shift) {
    return word << 32 - shift | word >>> shift;
  }
  function utf8ToBytes(str) {
    if (typeof str !== "string")
      throw new Error("string expected");
    return new Uint8Array(new TextEncoder().encode(str));
  }
  function toBytes(data) {
    if (typeof data === "string")
      data = utf8ToBytes(data);
    abytes2(data);
    return data;
  }
  var Hash = class {
  };
  function createHasher(hashCons) {
    const hashC = (msg) => hashCons().update(toBytes(msg)).digest();
    const tmp = hashCons();
    hashC.outputLen = tmp.outputLen;
    hashC.blockLen = tmp.blockLen;
    hashC.create = () => hashCons();
    return hashC;
  }

  // node_modules/@noble/hashes/esm/hmac.js
  var HMAC = class extends Hash {
    constructor(hash, _key) {
      super();
      this.finished = false;
      this.destroyed = false;
      ahash(hash);
      const key = toBytes(_key);
      this.iHash = hash.create();
      if (typeof this.iHash.update !== "function")
        throw new Error("Expected instance of class which extends utils.Hash");
      this.blockLen = this.iHash.blockLen;
      this.outputLen = this.iHash.outputLen;
      const blockLen = this.blockLen;
      const pad = new Uint8Array(blockLen);
      pad.set(key.length > blockLen ? hash.create().update(key).digest() : key);
      for (let i = 0; i < pad.length; i++)
        pad[i] ^= 54;
      this.iHash.update(pad);
      this.oHash = hash.create();
      for (let i = 0; i < pad.length; i++)
        pad[i] ^= 54 ^ 92;
      this.oHash.update(pad);
      clean2(pad);
    }
    update(buf) {
      aexists(this);
      this.iHash.update(buf);
      return this;
    }
    digestInto(out) {
      aexists(this);
      abytes2(out, this.outputLen);
      this.finished = true;
      this.iHash.digestInto(out);
      this.oHash.update(out);
      this.oHash.digestInto(out);
      this.destroy();
    }
    digest() {
      const out = new Uint8Array(this.oHash.outputLen);
      this.digestInto(out);
      return out;
    }
    _cloneInto(to) {
      to || (to = Object.create(Object.getPrototypeOf(this), {}));
      const { oHash, iHash, finished, destroyed, blockLen, outputLen } = this;
      to = to;
      to.finished = finished;
      to.destroyed = destroyed;
      to.blockLen = blockLen;
      to.outputLen = outputLen;
      to.oHash = oHash._cloneInto(to.oHash);
      to.iHash = iHash._cloneInto(to.iHash);
      return to;
    }
    clone() {
      return this._cloneInto();
    }
    destroy() {
      this.destroyed = true;
      this.oHash.destroy();
      this.iHash.destroy();
    }
  };
  var hmac = (hash, key, message) => new HMAC(hash, key).update(message).digest();
  hmac.create = (hash, key) => new HMAC(hash, key);

  // node_modules/@noble/hashes/esm/_md.js
  function setBigUint642(view, byteOffset, value, isLE2) {
    if (typeof view.setBigUint64 === "function")
      return view.setBigUint64(byteOffset, value, isLE2);
    const _32n = BigInt(32);
    const _u32_max = BigInt(4294967295);
    const wh = Number(value >> _32n & _u32_max);
    const wl = Number(value & _u32_max);
    const h = isLE2 ? 4 : 0;
    const l = isLE2 ? 0 : 4;
    view.setUint32(byteOffset + h, wh, isLE2);
    view.setUint32(byteOffset + l, wl, isLE2);
  }
  function Chi(a, b, c) {
    return a & b ^ ~a & c;
  }
  function Maj(a, b, c) {
    return a & b ^ a & c ^ b & c;
  }
  var HashMD = class extends Hash {
    constructor(blockLen, outputLen, padOffset, isLE2) {
      super();
      this.finished = false;
      this.length = 0;
      this.pos = 0;
      this.destroyed = false;
      this.blockLen = blockLen;
      this.outputLen = outputLen;
      this.padOffset = padOffset;
      this.isLE = isLE2;
      this.buffer = new Uint8Array(blockLen);
      this.view = createView2(this.buffer);
    }
    update(data) {
      aexists(this);
      data = toBytes(data);
      abytes2(data);
      const { view, buffer, blockLen } = this;
      const len = data.length;
      for (let pos = 0; pos < len; ) {
        const take = Math.min(blockLen - this.pos, len - pos);
        if (take === blockLen) {
          const dataView = createView2(data);
          for (; blockLen <= len - pos; pos += blockLen)
            this.process(dataView, pos);
          continue;
        }
        buffer.set(data.subarray(pos, pos + take), this.pos);
        this.pos += take;
        pos += take;
        if (this.pos === blockLen) {
          this.process(view, 0);
          this.pos = 0;
        }
      }
      this.length += data.length;
      this.roundClean();
      return this;
    }
    digestInto(out) {
      aexists(this);
      aoutput(out, this);
      this.finished = true;
      const { buffer, view, blockLen, isLE: isLE2 } = this;
      let { pos } = this;
      buffer[pos++] = 128;
      clean2(this.buffer.subarray(pos));
      if (this.padOffset > blockLen - pos) {
        this.process(view, 0);
        pos = 0;
      }
      for (let i = pos; i < blockLen; i++)
        buffer[i] = 0;
      setBigUint642(view, blockLen - 8, BigInt(this.length * 8), isLE2);
      this.process(view, 0);
      const oview = createView2(out);
      const len = this.outputLen;
      if (len % 4)
        throw new Error("_sha2: outputLen should be aligned to 32bit");
      const outLen = len / 4;
      const state = this.get();
      if (outLen > state.length)
        throw new Error("_sha2: outputLen bigger than state");
      for (let i = 0; i < outLen; i++)
        oview.setUint32(4 * i, state[i], isLE2);
    }
    digest() {
      const { buffer, outputLen } = this;
      this.digestInto(buffer);
      const res = buffer.slice(0, outputLen);
      this.destroy();
      return res;
    }
    _cloneInto(to) {
      to || (to = new this.constructor());
      to.set(...this.get());
      const { blockLen, buffer, length, finished, destroyed, pos } = this;
      to.destroyed = destroyed;
      to.finished = finished;
      to.length = length;
      to.pos = pos;
      if (length % blockLen)
        to.buffer.set(buffer);
      return to;
    }
    clone() {
      return this._cloneInto();
    }
  };
  var SHA256_IV = /* @__PURE__ */ Uint32Array.from([
    1779033703,
    3144134277,
    1013904242,
    2773480762,
    1359893119,
    2600822924,
    528734635,
    1541459225
  ]);

  // node_modules/@noble/hashes/esm/sha2.js
  var SHA256_K = /* @__PURE__ */ Uint32Array.from([
    1116352408,
    1899447441,
    3049323471,
    3921009573,
    961987163,
    1508970993,
    2453635748,
    2870763221,
    3624381080,
    310598401,
    607225278,
    1426881987,
    1925078388,
    2162078206,
    2614888103,
    3248222580,
    3835390401,
    4022224774,
    264347078,
    604807628,
    770255983,
    1249150122,
    1555081692,
    1996064986,
    2554220882,
    2821834349,
    2952996808,
    3210313671,
    3336571891,
    3584528711,
    113926993,
    338241895,
    666307205,
    773529912,
    1294757372,
    1396182291,
    1695183700,
    1986661051,
    2177026350,
    2456956037,
    2730485921,
    2820302411,
    3259730800,
    3345764771,
    3516065817,
    3600352804,
    4094571909,
    275423344,
    430227734,
    506948616,
    659060556,
    883997877,
    958139571,
    1322822218,
    1537002063,
    1747873779,
    1955562222,
    2024104815,
    2227730452,
    2361852424,
    2428436474,
    2756734187,
    3204031479,
    3329325298
  ]);
  var SHA256_W = /* @__PURE__ */ new Uint32Array(64);
  var SHA256 = class extends HashMD {
    constructor(outputLen = 32) {
      super(64, outputLen, 8, false);
      this.A = SHA256_IV[0] | 0;
      this.B = SHA256_IV[1] | 0;
      this.C = SHA256_IV[2] | 0;
      this.D = SHA256_IV[3] | 0;
      this.E = SHA256_IV[4] | 0;
      this.F = SHA256_IV[5] | 0;
      this.G = SHA256_IV[6] | 0;
      this.H = SHA256_IV[7] | 0;
    }
    get() {
      const { A, B, C, D, E, F, G, H } = this;
      return [A, B, C, D, E, F, G, H];
    }
    // prettier-ignore
    set(A, B, C, D, E, F, G, H) {
      this.A = A | 0;
      this.B = B | 0;
      this.C = C | 0;
      this.D = D | 0;
      this.E = E | 0;
      this.F = F | 0;
      this.G = G | 0;
      this.H = H | 0;
    }
    process(view, offset) {
      for (let i = 0; i < 16; i++, offset += 4)
        SHA256_W[i] = view.getUint32(offset, false);
      for (let i = 16; i < 64; i++) {
        const W15 = SHA256_W[i - 15];
        const W2 = SHA256_W[i - 2];
        const s0 = rotr(W15, 7) ^ rotr(W15, 18) ^ W15 >>> 3;
        const s1 = rotr(W2, 17) ^ rotr(W2, 19) ^ W2 >>> 10;
        SHA256_W[i] = s1 + SHA256_W[i - 7] + s0 + SHA256_W[i - 16] | 0;
      }
      let { A, B, C, D, E, F, G, H } = this;
      for (let i = 0; i < 64; i++) {
        const sigma1 = rotr(E, 6) ^ rotr(E, 11) ^ rotr(E, 25);
        const T1 = H + sigma1 + Chi(E, F, G) + SHA256_K[i] + SHA256_W[i] | 0;
        const sigma0 = rotr(A, 2) ^ rotr(A, 13) ^ rotr(A, 22);
        const T2 = sigma0 + Maj(A, B, C) | 0;
        H = G;
        G = F;
        F = E;
        E = D + T1 | 0;
        D = C;
        C = B;
        B = A;
        A = T1 + T2 | 0;
      }
      A = A + this.A | 0;
      B = B + this.B | 0;
      C = C + this.C | 0;
      D = D + this.D | 0;
      E = E + this.E | 0;
      F = F + this.F | 0;
      G = G + this.G | 0;
      H = H + this.H | 0;
      this.set(A, B, C, D, E, F, G, H);
    }
    roundClean() {
      clean2(SHA256_W);
    }
    destroy() {
      this.set(0, 0, 0, 0, 0, 0, 0, 0);
      clean2(this.buffer);
    }
  };
  var sha256 = /* @__PURE__ */ createHasher(() => new SHA256());

  // node_modules/@noble/hashes/esm/sha256.js
  var sha2562 = sha256;

  // node_modules/fflate/esm/browser.js
  var u82 = Uint8Array;
  var u16 = Uint16Array;
  var i32 = Int32Array;
  var fleb = new u82([
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    1,
    1,
    1,
    1,
    2,
    2,
    2,
    2,
    3,
    3,
    3,
    3,
    4,
    4,
    4,
    4,
    5,
    5,
    5,
    5,
    0,
    /* unused */
    0,
    0,
    /* impossible */
    0
  ]);
  var fdeb = new u82([
    0,
    0,
    0,
    0,
    1,
    1,
    2,
    2,
    3,
    3,
    4,
    4,
    5,
    5,
    6,
    6,
    7,
    7,
    8,
    8,
    9,
    9,
    10,
    10,
    11,
    11,
    12,
    12,
    13,
    13,
    /* unused */
    0,
    0
  ]);
  var clim = new u82([16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15]);
  var freb = function(eb, start) {
    var b = new u16(31);
    for (var i = 0; i < 31; ++i) {
      b[i] = start += 1 << eb[i - 1];
    }
    var r = new i32(b[30]);
    for (var i = 1; i < 30; ++i) {
      for (var j = b[i]; j < b[i + 1]; ++j) {
        r[j] = j - b[i] << 5 | i;
      }
    }
    return { b, r };
  };
  var _a = freb(fleb, 2);
  var fl = _a.b;
  var revfl = _a.r;
  fl[28] = 258, revfl[258] = 28;
  var _b = freb(fdeb, 0);
  var fd = _b.b;
  var revfd = _b.r;
  var rev = new u16(32768);
  for (i = 0; i < 32768; ++i) {
    x = (i & 43690) >> 1 | (i & 21845) << 1;
    x = (x & 52428) >> 2 | (x & 13107) << 2;
    x = (x & 61680) >> 4 | (x & 3855) << 4;
    rev[i] = ((x & 65280) >> 8 | (x & 255) << 8) >> 1;
  }
  var x;
  var i;
  var hMap = (function(cd, mb, r) {
    var s = cd.length;
    var i = 0;
    var l = new u16(mb);
    for (; i < s; ++i) {
      if (cd[i])
        ++l[cd[i] - 1];
    }
    var le = new u16(mb);
    for (i = 1; i < mb; ++i) {
      le[i] = le[i - 1] + l[i - 1] << 1;
    }
    var co;
    if (r) {
      co = new u16(1 << mb);
      var rvb = 15 - mb;
      for (i = 0; i < s; ++i) {
        if (cd[i]) {
          var sv = i << 4 | cd[i];
          var r_1 = mb - cd[i];
          var v = le[cd[i] - 1]++ << r_1;
          for (var m = v | (1 << r_1) - 1; v <= m; ++v) {
            co[rev[v] >> rvb] = sv;
          }
        }
      }
    } else {
      co = new u16(s);
      for (i = 0; i < s; ++i) {
        if (cd[i]) {
          co[i] = rev[le[cd[i] - 1]++] >> 15 - cd[i];
        }
      }
    }
    return co;
  });
  var flt = new u82(288);
  for (i = 0; i < 144; ++i)
    flt[i] = 8;
  var i;
  for (i = 144; i < 256; ++i)
    flt[i] = 9;
  var i;
  for (i = 256; i < 280; ++i)
    flt[i] = 7;
  var i;
  for (i = 280; i < 288; ++i)
    flt[i] = 8;
  var i;
  var fdt = new u82(32);
  for (i = 0; i < 32; ++i)
    fdt[i] = 5;
  var i;
  var flm = /* @__PURE__ */ hMap(flt, 9, 0);
  var flrm = /* @__PURE__ */ hMap(flt, 9, 1);
  var fdm = /* @__PURE__ */ hMap(fdt, 5, 0);
  var fdrm = /* @__PURE__ */ hMap(fdt, 5, 1);
  var max = function(a) {
    var m = a[0];
    for (var i = 1; i < a.length; ++i) {
      if (a[i] > m)
        m = a[i];
    }
    return m;
  };
  var bits = function(d, p, m) {
    var o = p / 8 | 0;
    return (d[o] | d[o + 1] << 8) >> (p & 7) & m;
  };
  var bits16 = function(d, p) {
    var o = p / 8 | 0;
    return (d[o] | d[o + 1] << 8 | d[o + 2] << 16) >> (p & 7);
  };
  var shft = function(p) {
    return (p + 7) / 8 | 0;
  };
  var slc = function(v, s, e) {
    if (s == null || s < 0)
      s = 0;
    if (e == null || e > v.length)
      e = v.length;
    return new u82(v.subarray(s, e));
  };
  var ec = [
    "unexpected EOF",
    "invalid block type",
    "invalid length/literal",
    "invalid distance",
    "stream finished",
    "no stream handler",
    ,
    "no callback",
    "invalid UTF-8 data",
    "extra field too long",
    "date not in range 1980-2099",
    "filename too long",
    "stream finishing",
    "invalid zip data"
    // determined by unknown compression method
  ];
  var err = function(ind, msg, nt) {
    var e = new Error(msg || ec[ind]);
    e.code = ind;
    if (Error.captureStackTrace)
      Error.captureStackTrace(e, err);
    if (!nt)
      throw e;
    return e;
  };
  var inflt = function(dat, st, buf, dict) {
    var sl = dat.length, dl = dict ? dict.length : 0;
    if (!sl || st.f && !st.l)
      return buf || new u82(0);
    var noBuf = !buf;
    var resize = noBuf || st.i != 2;
    var noSt = st.i;
    if (noBuf)
      buf = new u82(sl * 3);
    var cbuf = function(l2) {
      var bl = buf.length;
      if (l2 > bl) {
        var nbuf = new u82(Math.max(bl * 2, l2));
        nbuf.set(buf);
        buf = nbuf;
      }
    };
    var final = st.f || 0, pos = st.p || 0, bt = st.b || 0, lm = st.l, dm = st.d, lbt = st.m, dbt = st.n;
    var tbts = sl * 8;
    do {
      if (!lm) {
        final = bits(dat, pos, 1);
        var type = bits(dat, pos + 1, 3);
        pos += 3;
        if (!type) {
          var s = shft(pos) + 4, l = dat[s - 4] | dat[s - 3] << 8, t = s + l;
          if (t > sl) {
            if (noSt)
              err(0);
            break;
          }
          if (resize)
            cbuf(bt + l);
          buf.set(dat.subarray(s, t), bt);
          st.b = bt += l, st.p = pos = t * 8, st.f = final;
          continue;
        } else if (type == 1)
          lm = flrm, dm = fdrm, lbt = 9, dbt = 5;
        else if (type == 2) {
          var hLit = bits(dat, pos, 31) + 257, hcLen = bits(dat, pos + 10, 15) + 4;
          var tl = hLit + bits(dat, pos + 5, 31) + 1;
          pos += 14;
          var ldt = new u82(tl);
          var clt = new u82(19);
          for (var i = 0; i < hcLen; ++i) {
            clt[clim[i]] = bits(dat, pos + i * 3, 7);
          }
          pos += hcLen * 3;
          var clb = max(clt), clbmsk = (1 << clb) - 1;
          var clm = hMap(clt, clb, 1);
          for (var i = 0; i < tl; ) {
            var r = clm[bits(dat, pos, clbmsk)];
            pos += r & 15;
            var s = r >> 4;
            if (s < 16) {
              ldt[i++] = s;
            } else {
              var c = 0, n = 0;
              if (s == 16)
                n = 3 + bits(dat, pos, 3), pos += 2, c = ldt[i - 1];
              else if (s == 17)
                n = 3 + bits(dat, pos, 7), pos += 3;
              else if (s == 18)
                n = 11 + bits(dat, pos, 127), pos += 7;
              while (n--)
                ldt[i++] = c;
            }
          }
          var lt = ldt.subarray(0, hLit), dt = ldt.subarray(hLit);
          lbt = max(lt);
          dbt = max(dt);
          lm = hMap(lt, lbt, 1);
          dm = hMap(dt, dbt, 1);
        } else
          err(1);
        if (pos > tbts) {
          if (noSt)
            err(0);
          break;
        }
      }
      if (resize)
        cbuf(bt + 131072);
      var lms = (1 << lbt) - 1, dms = (1 << dbt) - 1;
      var lpos = pos;
      for (; ; lpos = pos) {
        var c = lm[bits16(dat, pos) & lms], sym = c >> 4;
        pos += c & 15;
        if (pos > tbts) {
          if (noSt)
            err(0);
          break;
        }
        if (!c)
          err(2);
        if (sym < 256)
          buf[bt++] = sym;
        else if (sym == 256) {
          lpos = pos, lm = null;
          break;
        } else {
          var add = sym - 254;
          if (sym > 264) {
            var i = sym - 257, b = fleb[i];
            add = bits(dat, pos, (1 << b) - 1) + fl[i];
            pos += b;
          }
          var d = dm[bits16(dat, pos) & dms], dsym = d >> 4;
          if (!d)
            err(3);
          pos += d & 15;
          var dt = fd[dsym];
          if (dsym > 3) {
            var b = fdeb[dsym];
            dt += bits16(dat, pos) & (1 << b) - 1, pos += b;
          }
          if (pos > tbts) {
            if (noSt)
              err(0);
            break;
          }
          if (resize)
            cbuf(bt + 131072);
          var end = bt + add;
          if (bt < dt) {
            var shift = dl - dt, dend = Math.min(dt, end);
            if (shift + bt < 0)
              err(3);
            for (; bt < dend; ++bt)
              buf[bt] = dict[shift + bt];
          }
          for (; bt < end; ++bt)
            buf[bt] = buf[bt - dt];
        }
      }
      st.l = lm, st.p = lpos, st.b = bt, st.f = final;
      if (lm)
        final = 1, st.m = lbt, st.d = dm, st.n = dbt;
    } while (!final);
    return bt != buf.length && noBuf ? slc(buf, 0, bt) : buf.subarray(0, bt);
  };
  var wbits = function(d, p, v) {
    v <<= p & 7;
    var o = p / 8 | 0;
    d[o] |= v;
    d[o + 1] |= v >> 8;
  };
  var wbits16 = function(d, p, v) {
    v <<= p & 7;
    var o = p / 8 | 0;
    d[o] |= v;
    d[o + 1] |= v >> 8;
    d[o + 2] |= v >> 16;
  };
  var hTree = function(d, mb) {
    var t = [];
    for (var i = 0; i < d.length; ++i) {
      if (d[i])
        t.push({ s: i, f: d[i] });
    }
    var s = t.length;
    var t2 = t.slice();
    if (!s)
      return { t: et, l: 0 };
    if (s == 1) {
      var v = new u82(t[0].s + 1);
      v[t[0].s] = 1;
      return { t: v, l: 1 };
    }
    t.sort(function(a, b) {
      return a.f - b.f;
    });
    t.push({ s: -1, f: 25001 });
    var l = t[0], r = t[1], i0 = 0, i1 = 1, i2 = 2;
    t[0] = { s: -1, f: l.f + r.f, l, r };
    while (i1 != s - 1) {
      l = t[t[i0].f < t[i2].f ? i0++ : i2++];
      r = t[i0 != i1 && t[i0].f < t[i2].f ? i0++ : i2++];
      t[i1++] = { s: -1, f: l.f + r.f, l, r };
    }
    var maxSym = t2[0].s;
    for (var i = 1; i < s; ++i) {
      if (t2[i].s > maxSym)
        maxSym = t2[i].s;
    }
    var tr = new u16(maxSym + 1);
    var mbt = ln(t[i1 - 1], tr, 0);
    if (mbt > mb) {
      var i = 0, dt = 0;
      var lft = mbt - mb, cst = 1 << lft;
      t2.sort(function(a, b) {
        return tr[b.s] - tr[a.s] || a.f - b.f;
      });
      for (; i < s; ++i) {
        var i2_1 = t2[i].s;
        if (tr[i2_1] > mb) {
          dt += cst - (1 << mbt - tr[i2_1]);
          tr[i2_1] = mb;
        } else
          break;
      }
      dt >>= lft;
      while (dt > 0) {
        var i2_2 = t2[i].s;
        if (tr[i2_2] < mb)
          dt -= 1 << mb - tr[i2_2]++ - 1;
        else
          ++i;
      }
      for (; i >= 0 && dt; --i) {
        var i2_3 = t2[i].s;
        if (tr[i2_3] == mb) {
          --tr[i2_3];
          ++dt;
        }
      }
      mbt = mb;
    }
    return { t: new u82(tr), l: mbt };
  };
  var ln = function(n, l, d) {
    return n.s == -1 ? Math.max(ln(n.l, l, d + 1), ln(n.r, l, d + 1)) : l[n.s] = d;
  };
  var lc = function(c) {
    var s = c.length;
    while (s && !c[--s])
      ;
    var cl = new u16(++s);
    var cli = 0, cln = c[0], cls = 1;
    var w = function(v) {
      cl[cli++] = v;
    };
    for (var i = 1; i <= s; ++i) {
      if (c[i] == cln && i != s)
        ++cls;
      else {
        if (!cln && cls > 2) {
          for (; cls > 138; cls -= 138)
            w(32754);
          if (cls > 2) {
            w(cls > 10 ? cls - 11 << 5 | 28690 : cls - 3 << 5 | 12305);
            cls = 0;
          }
        } else if (cls > 3) {
          w(cln), --cls;
          for (; cls > 6; cls -= 6)
            w(8304);
          if (cls > 2)
            w(cls - 3 << 5 | 8208), cls = 0;
        }
        while (cls--)
          w(cln);
        cls = 1;
        cln = c[i];
      }
    }
    return { c: cl.subarray(0, cli), n: s };
  };
  var clen = function(cf, cl) {
    var l = 0;
    for (var i = 0; i < cl.length; ++i)
      l += cf[i] * cl[i];
    return l;
  };
  var wfblk = function(out, pos, dat) {
    var s = dat.length;
    var o = shft(pos + 2);
    out[o] = s & 255;
    out[o + 1] = s >> 8;
    out[o + 2] = out[o] ^ 255;
    out[o + 3] = out[o + 1] ^ 255;
    for (var i = 0; i < s; ++i)
      out[o + i + 4] = dat[i];
    return (o + 4 + s) * 8;
  };
  var wblk = function(dat, out, final, syms, lf, df, eb, li, bs, bl, p) {
    wbits(out, p++, final);
    ++lf[256];
    var _a2 = hTree(lf, 15), dlt = _a2.t, mlb = _a2.l;
    var _b2 = hTree(df, 15), ddt = _b2.t, mdb = _b2.l;
    var _c = lc(dlt), lclt = _c.c, nlc = _c.n;
    var _d = lc(ddt), lcdt = _d.c, ndc = _d.n;
    var lcfreq = new u16(19);
    for (var i = 0; i < lclt.length; ++i)
      ++lcfreq[lclt[i] & 31];
    for (var i = 0; i < lcdt.length; ++i)
      ++lcfreq[lcdt[i] & 31];
    var _e = hTree(lcfreq, 7), lct = _e.t, mlcb = _e.l;
    var nlcc = 19;
    for (; nlcc > 4 && !lct[clim[nlcc - 1]]; --nlcc)
      ;
    var flen = bl + 5 << 3;
    var ftlen = clen(lf, flt) + clen(df, fdt) + eb;
    var dtlen = clen(lf, dlt) + clen(df, ddt) + eb + 14 + 3 * nlcc + clen(lcfreq, lct) + 2 * lcfreq[16] + 3 * lcfreq[17] + 7 * lcfreq[18];
    if (bs >= 0 && flen <= ftlen && flen <= dtlen)
      return wfblk(out, p, dat.subarray(bs, bs + bl));
    var lm, ll, dm, dl;
    wbits(out, p, 1 + (dtlen < ftlen)), p += 2;
    if (dtlen < ftlen) {
      lm = hMap(dlt, mlb, 0), ll = dlt, dm = hMap(ddt, mdb, 0), dl = ddt;
      var llm = hMap(lct, mlcb, 0);
      wbits(out, p, nlc - 257);
      wbits(out, p + 5, ndc - 1);
      wbits(out, p + 10, nlcc - 4);
      p += 14;
      for (var i = 0; i < nlcc; ++i)
        wbits(out, p + 3 * i, lct[clim[i]]);
      p += 3 * nlcc;
      var lcts = [lclt, lcdt];
      for (var it = 0; it < 2; ++it) {
        var clct = lcts[it];
        for (var i = 0; i < clct.length; ++i) {
          var len = clct[i] & 31;
          wbits(out, p, llm[len]), p += lct[len];
          if (len > 15)
            wbits(out, p, clct[i] >> 5 & 127), p += clct[i] >> 12;
        }
      }
    } else {
      lm = flm, ll = flt, dm = fdm, dl = fdt;
    }
    for (var i = 0; i < li; ++i) {
      var sym = syms[i];
      if (sym > 255) {
        var len = sym >> 18 & 31;
        wbits16(out, p, lm[len + 257]), p += ll[len + 257];
        if (len > 7)
          wbits(out, p, sym >> 23 & 31), p += fleb[len];
        var dst = sym & 31;
        wbits16(out, p, dm[dst]), p += dl[dst];
        if (dst > 3)
          wbits16(out, p, sym >> 5 & 8191), p += fdeb[dst];
      } else {
        wbits16(out, p, lm[sym]), p += ll[sym];
      }
    }
    wbits16(out, p, lm[256]);
    return p + ll[256];
  };
  var deo = /* @__PURE__ */ new i32([65540, 131080, 131088, 131104, 262176, 1048704, 1048832, 2114560, 2117632]);
  var et = /* @__PURE__ */ new u82(0);
  var dflt = function(dat, lvl, plvl, pre, post, st) {
    var s = st.z || dat.length;
    var o = new u82(pre + s + 5 * (1 + Math.ceil(s / 7e3)) + post);
    var w = o.subarray(pre, o.length - post);
    var lst = st.l;
    var pos = (st.r || 0) & 7;
    if (lvl) {
      if (pos)
        w[0] = st.r >> 3;
      var opt = deo[lvl - 1];
      var n = opt >> 13, c = opt & 8191;
      var msk_1 = (1 << plvl) - 1;
      var prev = st.p || new u16(32768), head = st.h || new u16(msk_1 + 1);
      var bs1_1 = Math.ceil(plvl / 3), bs2_1 = 2 * bs1_1;
      var hsh = function(i2) {
        return (dat[i2] ^ dat[i2 + 1] << bs1_1 ^ dat[i2 + 2] << bs2_1) & msk_1;
      };
      var syms = new i32(25e3);
      var lf = new u16(288), df = new u16(32);
      var lc_1 = 0, eb = 0, i = st.i || 0, li = 0, wi = st.w || 0, bs = 0;
      for (; i + 2 < s; ++i) {
        var hv = hsh(i);
        var imod = i & 32767, pimod = head[hv];
        prev[imod] = pimod;
        head[hv] = imod;
        if (wi <= i) {
          var rem = s - i;
          if ((lc_1 > 7e3 || li > 24576) && (rem > 423 || !lst)) {
            pos = wblk(dat, w, 0, syms, lf, df, eb, li, bs, i - bs, pos);
            li = lc_1 = eb = 0, bs = i;
            for (var j = 0; j < 286; ++j)
              lf[j] = 0;
            for (var j = 0; j < 30; ++j)
              df[j] = 0;
          }
          var l = 2, d = 0, ch_1 = c, dif = imod - pimod & 32767;
          if (rem > 2 && hv == hsh(i - dif)) {
            var maxn = Math.min(n, rem) - 1;
            var maxd = Math.min(32767, i);
            var ml = Math.min(258, rem);
            while (dif <= maxd && --ch_1 && imod != pimod) {
              if (dat[i + l] == dat[i + l - dif]) {
                var nl = 0;
                for (; nl < ml && dat[i + nl] == dat[i + nl - dif]; ++nl)
                  ;
                if (nl > l) {
                  l = nl, d = dif;
                  if (nl > maxn)
                    break;
                  var mmd = Math.min(dif, nl - 2);
                  var md = 0;
                  for (var j = 0; j < mmd; ++j) {
                    var ti = i - dif + j & 32767;
                    var pti = prev[ti];
                    var cd = ti - pti & 32767;
                    if (cd > md)
                      md = cd, pimod = ti;
                  }
                }
              }
              imod = pimod, pimod = prev[imod];
              dif += imod - pimod & 32767;
            }
          }
          if (d) {
            syms[li++] = 268435456 | revfl[l] << 18 | revfd[d];
            var lin = revfl[l] & 31, din = revfd[d] & 31;
            eb += fleb[lin] + fdeb[din];
            ++lf[257 + lin];
            ++df[din];
            wi = i + l;
            ++lc_1;
          } else {
            syms[li++] = dat[i];
            ++lf[dat[i]];
          }
        }
      }
      for (i = Math.max(i, wi); i < s; ++i) {
        syms[li++] = dat[i];
        ++lf[dat[i]];
      }
      pos = wblk(dat, w, lst, syms, lf, df, eb, li, bs, i - bs, pos);
      if (!lst) {
        st.r = pos & 7 | w[pos / 8 | 0] << 3;
        pos -= 7;
        st.h = head, st.p = prev, st.i = i, st.w = wi;
      }
    } else {
      for (var i = st.w || 0; i < s + lst; i += 65535) {
        var e = i + 65535;
        if (e >= s) {
          w[pos / 8 | 0] = lst;
          e = s;
        }
        pos = wfblk(w, pos + 1, dat.subarray(i, e));
      }
      st.i = s;
    }
    return slc(o, 0, pre + shft(pos) + post);
  };
  var crct = /* @__PURE__ */ (function() {
    var t = new Int32Array(256);
    for (var i = 0; i < 256; ++i) {
      var c = i, k = 9;
      while (--k)
        c = (c & 1 && -306674912) ^ c >>> 1;
      t[i] = c;
    }
    return t;
  })();
  var crc = function() {
    var c = -1;
    return {
      p: function(d) {
        var cr = c;
        for (var i = 0; i < d.length; ++i)
          cr = crct[cr & 255 ^ d[i]] ^ cr >>> 8;
        c = cr;
      },
      d: function() {
        return ~c;
      }
    };
  };
  var dopt = function(dat, opt, pre, post, st) {
    if (!st) {
      st = { l: 1 };
      if (opt.dictionary) {
        var dict = opt.dictionary.subarray(-32768);
        var newDat = new u82(dict.length + dat.length);
        newDat.set(dict);
        newDat.set(dat, dict.length);
        dat = newDat;
        st.w = dict.length;
      }
    }
    return dflt(dat, opt.level == null ? 6 : opt.level, opt.mem == null ? st.l ? Math.ceil(Math.max(8, Math.min(13, Math.log(dat.length))) * 1.5) : 20 : 12 + opt.mem, pre, post, st);
  };
  var wbytes = function(d, b, v) {
    for (; v; ++b)
      d[b] = v, v >>>= 8;
  };
  var gzh = function(c, o) {
    var fn = o.filename;
    c[0] = 31, c[1] = 139, c[2] = 8, c[8] = o.level < 2 ? 4 : o.level == 9 ? 2 : 0, c[9] = 3;
    if (o.mtime != 0)
      wbytes(c, 4, Math.floor(new Date(o.mtime || Date.now()) / 1e3));
    if (fn) {
      c[3] = 8;
      for (var i = 0; i <= fn.length; ++i)
        c[i + 10] = fn.charCodeAt(i);
    }
  };
  var gzs = function(d) {
    if (d[0] != 31 || d[1] != 139 || d[2] != 8)
      err(6, "invalid gzip data");
    var flg = d[3];
    var st = 10;
    if (flg & 4)
      st += (d[10] | d[11] << 8) + 2;
    for (var zs = (flg >> 3 & 1) + (flg >> 4 & 1); zs > 0; zs -= !d[st++])
      ;
    return st + (flg & 2);
  };
  var gzl = function(d) {
    var l = d.length;
    return (d[l - 4] | d[l - 3] << 8 | d[l - 2] << 16 | d[l - 1] << 24) >>> 0;
  };
  var gzhl = function(o) {
    return 10 + (o.filename ? o.filename.length + 1 : 0);
  };
  function gzipSync(data, opts) {
    if (!opts)
      opts = {};
    var c = crc(), l = data.length;
    c.p(data);
    var d = dopt(data, opts, gzhl(opts), 8), s = d.length;
    return gzh(d, opts), wbytes(d, s - 8, c.d()), wbytes(d, s - 4, l), d;
  }
  function gunzipSync(data, opts) {
    var st = gzs(data);
    if (st + 8 > data.length)
      err(6, "invalid gzip data");
    return inflt(data.subarray(st, -8), { i: 2 }, opts && opts.out || new u82(gzl(data)), opts && opts.dictionary);
  }
  var td = typeof TextDecoder != "undefined" && /* @__PURE__ */ new TextDecoder();
  var tds = 0;
  try {
    td.decode(et, { stream: true });
    tds = 1;
  } catch (e) {
  }

  // source/ump.js
  var MAX_PART_BYTES = 32 * 1024 * 1024;
  function readParts(body) {
    let offset = 0;
    const parts = [];
    function number() {
      if (offset >= body.length) throw new Error("UMP \u5934\u90E8\u622A\u65AD");
      const first = body[offset++];
      if (first >= 248) throw new Error("UMP \u6574\u6570\u524D\u7F00\u65E0\u6548");
      let size = 1;
      while (size < 5 && first & 128 >> size - 1) size++;
      let bits2 = size === 5 ? 0 : 8 - size;
      let value = size === 5 ? 0 : first & (1 << bits2) - 1;
      for (let i = 1; i < size; i++) {
        if (offset >= body.length) throw new Error("UMP \u6574\u6570\u622A\u65AD");
        value += body[offset++] * 2 ** bits2;
        bits2 += 8;
      }
      return value;
    }
    while (offset < body.length) {
      const start = offset, type = number(), length = number();
      if (length > MAX_PART_BYTES || offset + length > body.length) throw new Error("UMP \u5206\u6BB5\u957F\u5EA6\u65E0\u6548");
      const data = body.subarray(offset, offset + length);
      offset += length;
      parts.push({ type, data, raw: body.subarray(start, offset) });
    }
    return parts;
  }
  function umpNumber(value) {
    if (!Number.isInteger(value) || value < 0 || value > 4294967295) throw new Error("UMP \u6574\u6570\u65E0\u6548");
    let size = 1;
    while (size < 5 && value >= 2 ** (7 * size)) size++;
    const prefix = size === 5 ? 240 : 256 - 2 ** (9 - size) & 255;
    const bits2 = size === 5 ? 0 : 8 - size;
    const out = [prefix | (size === 5 ? 0 : value % 2 ** bits2)];
    value = Math.floor(value / 2 ** bits2);
    for (let i = 1; i < size; i++) {
      out.push(value % 256);
      value = Math.floor(value / 256);
    }
    return Uint8Array.from(out);
  }
  function writePart(type, data) {
    return concat([umpNumber(type), umpNumber(data.length), data]);
  }
  function equal(a, b) {
    if (a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
    return diff === 0;
  }
  function mac(data, iv, key) {
    return hmac(sha2562, key.subarray(16), concat([data, iv]));
  }
  function transformEncrypted(part, key, options, transformNext) {
    const encrypted = getBytes(part, 1), receivedMac = getBytes(part, 2), iv = getBytes(part, 3);
    const compressionField = fields(part).find((field) => field.no === 4 && field.wire === 0);
    const compression = compressionField ? compressionField.value : 0;
    if (!encrypted || (receivedMac == null ? void 0 : receivedMac.length) !== 32 || (iv == null ? void 0 : iv.length) !== 16 || key.length !== 32) throw new Error("\u52A0\u5BC6\u64AD\u653E\u54CD\u5E94\u7ED3\u6784\u65E0\u6548");
    if (compression !== 0 && compression !== 1) throw new Error("\u4E0D\u652F\u6301\u7684\u64AD\u653E\u54CD\u5E94\u538B\u7F29\u683C\u5F0F");
    if (!equal(mac(encrypted, iv, key), receivedMac)) throw new Error("\u64AD\u653E\u54CD\u5E94\u5B8C\u6574\u6027\u9A8C\u8BC1\u5931\u8D25");
    let plain = ctr(key.subarray(0, 16), iv).decrypt(encrypted);
    const compressed = plain[0] === 31 && plain[1] === 139;
    if (compression === 1 && !compressed) throw new Error("\u64AD\u653E\u54CD\u5E94\u538B\u7F29\u58F0\u660E\u4E0E\u6570\u636E\u4E0D\u4E00\u81F4");
    if (compressed) {
      const size = plain.length >= 18 ? new DataView(plain.buffer, plain.byteOffset + plain.length - 4, 4).getUint32(0, true) : MAX_PART_BYTES + 1;
      if (size > MAX_PART_BYTES) throw new Error("\u64AD\u653E\u54CD\u5E94\u5C55\u5F00\u957F\u5EA6\u8D85\u51FA\u9650\u5236");
      plain = gunzipSync(plain);
    }
    let changed = transformWatch(plain, options, 4, transformNext);
    if (compressed) changed = gzipSync(changed, { level: 0 });
    const cipher = ctr(key.subarray(0, 16), iv).encrypt(changed);
    return editBytes(editBytes(part, 1, () => cipher), 2, () => mac(cipher, iv, key));
  }
  function transformUmp(body, key, options, transformNext) {
    var _a2;
    let headerType = -1, changed = false;
    const output = [];
    for (const part of readParts(body)) {
      if (part.type === 10) headerType = (_a2 = fields(part.data).find((field) => field.no === 1 && field.wire === 0)) == null ? void 0 : _a2.value;
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

  // source/state.js
  var CONFIG_KEY = "YouTubeLocalConfig-v1";
  function platform(request) {
    return Object.entries(request.headers || {}).some(([key, value]) => key.toLowerCase() === "user-agent" && /music/i.test(String(value))) ? "youtubeMusic" : "youtube";
  }
  function readConfig(store) {
    try {
      const value = JSON.parse(store.read(CONFIG_KEY) || "{}");
      return value && typeof value === "object" && !Array.isArray(value) ? value : {};
    } catch (e) {
      return {};
    }
  }
  function clearConfig(store, name) {
    const config = readConfig(store);
    delete config[name];
    store.write(JSON.stringify(config), CONFIG_KEY);
  }
  function captureConfig(body, store, name) {
    let current = body;
    for (const no of [1, 16, 7, 138536474, 146311580]) {
      current = getBytes(current, no);
      if (!current) return;
    }
    const clientKey = getBytes(current, 1), encryptKey = getBytes(current, 2);
    if ((clientKey == null ? void 0 : clientKey.length) !== 32 || !(encryptKey == null ? void 0 : encryptKey.length)) return;
    const config = readConfig(store);
    config[name] = { clientKey: encodeBase64(clientKey), encryptKey: encodeBase64(encryptKey) };
    store.write(JSON.stringify(config), CONFIG_KEY);
  }
  function getClientKey(store, name) {
    var _a2;
    const encoded = (_a2 = readConfig(store)[name]) == null ? void 0 : _a2.clientKey;
    if (!encoded) throw new Error("\u7F3A\u5C11\u672C\u673A\u64AD\u653E\u914D\u7F6E");
    const key = decodeBase64(encoded);
    if (key.length !== 32) throw new Error("\u672C\u673A\u64AD\u653E\u914D\u7F6E\u957F\u5EA6\u65E0\u6548");
    return key;
  }

  // local:core
  function processApi(endpoint, body, headers, store, options) {
    const $request2 = { url: "https://youtubei.googleapis.com/youtubei/v1/" + endpoint, headers };
    const $response2 = { body };
    const $argument2 = JSON.stringify(options);
    const $task = void 0, $loon = void 0;
    const $persistentStore2 = {
      read: (key) => store.read(key === "YouTubeAdvertiseInfo" ? "YouTubeLocalAdvertiseInfo-v1" : key),
      write: (value, key) => store.write(value, key === "YouTubeAdvertiseInfo" ? "YouTubeLocalAdvertiseInfo-v1" : key)
    };
    const $notification = { post() {
    } };
    const $httpClient = new Proxy({}, { get() {
      return () => {
        throw new Error("\u672C\u673A\u6838\u5FC3\u4E0D\u5141\u8BB8\u5916\u90E8\u8BF7\u6C42");
      };
    } });
    let result;
    const $done2 = (value) => {
      result = value;
    };
    (() => {
      var fi = Object.create;
      var Me = Object.defineProperty;
      var di = Object.getOwnPropertyDescriptor;
      var pi = Object.getOwnPropertyNames;
      var yi = Object.getPrototypeOf, hi = Object.prototype.hasOwnProperty;
      var mi = (l, e, t) => e in l ? Me(l, e, { enumerable: true, configurable: true, writable: true, value: t }) : l[e] = t;
      var gi = (l, e) => () => (e || l((e = { exports: {} }).exports, e), e.exports);
      var bi = (l, e, t, n) => {
        if (e && typeof e == "object" || typeof e == "function") for (let i of pi(e)) !hi.call(l, i) && i !== t && Me(l, i, { get: () => e[i], enumerable: !(n = di(e, i)) || n.enumerable });
        return l;
      };
      var g = (l, e, t) => (t = l != null ? fi(yi(l)) : {}, bi(e || !l || !l.__esModule ? Me(t, "default", { value: l, enumerable: true }) : t, l));
      var pe = (l, e, t) => (mi(l, typeof e != "symbol" ? e + "" : e, t), t);
      var h = gi((Nr) => {
        "use strict";
        (function(l) {
          function e() {
          }
          function t() {
          }
          var n = String.fromCharCode, i = {}.toString, r = i.call(l.SharedArrayBuffer), c = i(), o = l.Uint8Array, s = o || Array, a = o ? ArrayBuffer : s, u = a.isView || function(I) {
            return I && "length" in I;
          }, B = i.call(a.prototype);
          a = t.prototype;
          var w = l.TextEncoder, b = new (o ? Uint16Array : s)(32);
          e.prototype.decode = function(I) {
            if (!u(I)) {
              var $ = i.call(I);
              if ($ !== B && $ !== r && $ !== c) throw TypeError("Failed to execute 'decode' on 'TextDecoder': The provided value is not of type '(ArrayBuffer or ArrayBufferView)'");
              I = o ? new s(I) : I || [];
            }
            for (var N = $ = "", k = 0, C = I.length | 0, de = C - 32 | 0, U, S, A = 0, J = 0, V, j = 0, M = -1; k < C; ) {
              for (U = k <= de ? 32 : C - k | 0; j < U; k = k + 1 | 0, j = j + 1 | 0) {
                switch (S = I[k] & 255, S >> 4) {
                  case 15:
                    if (V = I[k = k + 1 | 0] & 255, V >> 6 !== 2 || 247 < S) {
                      k = k - 1 | 0;
                      break;
                    }
                    A = (S & 7) << 6 | V & 63, J = 5, S = 256;
                  case 14:
                    V = I[k = k + 1 | 0] & 255, A <<= 6, A |= (S & 15) << 6 | V & 63, J = V >> 6 === 2 ? J + 4 | 0 : 24, S = S + 256 & 768;
                  case 13:
                  case 12:
                    V = I[k = k + 1 | 0] & 255, A <<= 6, A |= (S & 31) << 6 | V & 63, J = J + 7 | 0, k < C && V >> 6 === 2 && A >> J && 1114112 > A ? (S = A, A = A - 65536 | 0, 0 <= A && (M = (A >> 10) + 55296 | 0, S = (A & 1023) + 56320 | 0, 31 > j ? (b[j] = M, j = j + 1 | 0, M = -1) : (V = M, M = S, S = V))) : (S >>= 8, k = k - S - 1 | 0, S = 65533), A = J = 0, U = k <= de ? 32 : C - k | 0;
                  default:
                    b[j] = S;
                    continue;
                  case 11:
                  case 10:
                  case 9:
                  case 8:
                }
                b[j] = 65533;
              }
              if (N += n(b[0], b[1], b[2], b[3], b[4], b[5], b[6], b[7], b[8], b[9], b[10], b[11], b[12], b[13], b[14], b[15], b[16], b[17], b[18], b[19], b[20], b[21], b[22], b[23], b[24], b[25], b[26], b[27], b[28], b[29], b[30], b[31]), 32 > j && (N = N.slice(0, j - 32 | 0)), k < C) {
                if (b[0] = M, j = ~M >>> 31, M = -1, N.length < $.length) continue;
              } else M !== -1 && (N += n(M));
              $ += N, N = "";
            }
            return $;
          }, a.encode = function(I) {
            I = I === void 0 ? "" : "" + I;
            var $ = I.length | 0, N = new s(($ << 1) + 8 | 0), k, C = 0, de = !o;
            for (k = 0; k < $; k = k + 1 | 0, C = C + 1 | 0) {
              var U = I.charCodeAt(k) | 0;
              if (127 >= U) N[C] = U;
              else {
                if (2047 >= U) N[C] = 192 | U >> 6;
                else {
                  e: {
                    if (55296 <= U) if (56319 >= U) {
                      var S = I.charCodeAt(k = k + 1 | 0) | 0;
                      if (56320 <= S && 57343 >= S) {
                        if (U = (U << 10) + S - 56613888 | 0, 65535 < U) {
                          N[C] = 240 | U >> 18, N[C = C + 1 | 0] = 128 | U >> 12 & 63, N[C = C + 1 | 0] = 128 | U >> 6 & 63, N[C = C + 1 | 0] = 128 | U & 63;
                          continue;
                        }
                        break e;
                      }
                      U = 65533;
                    } else 57343 >= U && (U = 65533);
                    !de && k << 1 < C && k << 1 < (C - 7 | 0) && (de = true, S = new s(3 * $), S.set(N), N = S);
                  }
                  N[C] = 224 | U >> 12, N[C = C + 1 | 0] = 128 | U >> 6 & 63;
                }
                N[C = C + 1 | 0] = 128 | U & 63;
              }
            }
            return o ? N.subarray(0, C) : N.slice(0, C);
          }, w || (l.TextDecoder = e, l.TextEncoder = t);
        })("undefined" == typeof global ? "undefined" == typeof globalThis ? Nr : globalThis : global);
      });
      var Wc = g(h(), 1);
      var tc = g(h(), 1);
      var jo = g(h());
      var Xi = g(h());
      function Be(l) {
        let e = typeof l;
        if (e == "object") {
          if (Array.isArray(l)) return "array";
          if (l === null) return "null";
        }
        return e;
      }
      function Sr(l) {
        return l !== null && typeof l == "object" && !Array.isArray(l);
      }
      var Yi = g(h()), v = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/".split(""), Ie = [];
      for (let l = 0; l < v.length; l++) Ie[v[l].charCodeAt(0)] = l;
      Ie["-".charCodeAt(0)] = v.indexOf("+");
      Ie["_".charCodeAt(0)] = v.indexOf("/");
      function Te(l) {
        let e = l.length * 3 / 4;
        l[l.length - 2] == "=" ? e -= 2 : l[l.length - 1] == "=" && (e -= 1);
        let t = new Uint8Array(e), n = 0, i = 0, r, c = 0;
        for (let o = 0; o < l.length; o++) {
          if (r = Ie[l.charCodeAt(o)], r === void 0) switch (l[o]) {
            case "=":
              i = 0;
            case `
`:
            case "\r":
            case "	":
            case " ":
              continue;
            default:
              throw Error("invalid base64 string.");
          }
          switch (i) {
            case 0:
              c = r, i = 1;
              break;
            case 1:
              t[n++] = c << 2 | (r & 48) >> 4, c = r, i = 2;
              break;
            case 2:
              t[n++] = (c & 15) << 4 | (r & 60) >> 2, c = r, i = 3;
              break;
            case 3:
              t[n++] = (c & 3) << 6 | r, i = 0;
              break;
          }
        }
        if (i == 1) throw Error("invalid base64 string.");
        return t.subarray(0, n);
      }
      function Q(l) {
        let e = "", t = 0, n, i = 0;
        for (let r = 0; r < l.length; r++) switch (n = l[r], t) {
          case 0:
            e += v[n >> 2], i = (n & 3) << 4, t = 1;
            break;
          case 1:
            e += v[i | n >> 4], i = (n & 15) << 2, t = 2;
            break;
          case 2:
            e += v[i | n >> 6], e += v[n & 63], t = 0;
            break;
        }
        return t && (e += v[i], e += "=", t == 1 && (e += "=")), e;
      }
      var Zi = g(h()), d;
      (function(l) {
        l.symbol = Symbol.for("protobuf-ts/unknown"), l.onRead = (t, n, i, r, c) => {
          (e(n) ? n[l.symbol] : n[l.symbol] = []).push({ no: i, wireType: r, data: c });
        }, l.onWrite = (t, n, i) => {
          for (let { no: r, wireType: c, data: o } of l.list(n)) i.tag(r, c).raw(o);
        }, l.list = (t, n) => {
          if (e(t)) {
            let i = t[l.symbol];
            return n ? i.filter((r) => r.no == n) : i;
          }
          return [];
        }, l.last = (t, n) => l.list(t, n).slice(-1)[0];
        let e = (t) => t && Array.isArray(t[l.symbol]);
      })(d || (d = {}));
      var f;
      (function(l) {
        l[l.Varint = 0] = "Varint", l[l.Bit64 = 1] = "Bit64", l[l.LengthDelimited = 2] = "LengthDelimited", l[l.StartGroup = 3] = "StartGroup", l[l.EndGroup = 4] = "EndGroup", l[l.Bit32 = 5] = "Bit32";
      })(f || (f = {}));
      var la = g(h());
      var ra = g(h());
      var ea = g(h());
      function Or() {
        let l = 0, e = 0;
        for (let n = 0; n < 28; n += 7) {
          let i = this.buf[this.pos++];
          if (l |= (i & 127) << n, !(i & 128)) return this.assertBounds(), [l, e];
        }
        let t = this.buf[this.pos++];
        if (l |= (t & 15) << 28, e = (t & 112) >> 4, !(t & 128)) return this.assertBounds(), [l, e];
        for (let n = 3; n <= 31; n += 7) {
          let i = this.buf[this.pos++];
          if (e |= (i & 127) << n, !(i & 128)) return this.assertBounds(), [l, e];
        }
        throw new Error("invalid varint");
      }
      function xe(l, e, t) {
        for (let r = 0; r < 28; r = r + 7) {
          let c = l >>> r, o = !(!(c >>> 7) && e == 0), s = (o ? c | 128 : c) & 255;
          if (t.push(s), !o) return;
        }
        let n = l >>> 28 & 15 | (e & 7) << 4, i = !!(e >> 3);
        if (t.push((i ? n | 128 : n) & 255), !!i) {
          for (let r = 3; r < 31; r = r + 7) {
            let c = e >>> r, o = !!(c >>> 7), s = (o ? c | 128 : c) & 255;
            if (t.push(s), !o) return;
          }
          t.push(e >>> 31 & 1);
        }
      }
      var Ce = (1 << 16) * (1 << 16);
      function ve(l) {
        let e = l[0] == "-";
        e && (l = l.slice(1));
        let t = 1e6, n = 0, i = 0;
        function r(c, o) {
          let s = Number(l.slice(c, o));
          i *= t, n = n * t + s, n >= Ce && (i = i + (n / Ce | 0), n = n % Ce);
        }
        return r(-24, -18), r(-18, -12), r(-12, -6), r(-6), [e, n, i];
      }
      function We(l, e) {
        if (e >>> 0 <= 2097151) return "" + (Ce * e + (l >>> 0));
        let t = l & 16777215, n = (l >>> 24 | e << 8) >>> 0 & 16777215, i = e >> 16 & 65535, r = t + n * 6777216 + i * 6710656, c = n + i * 8147497, o = i * 2, s = 1e7;
        r >= s && (c += Math.floor(r / s), r %= s), c >= s && (o += Math.floor(c / s), c %= s);
        function a(u, B) {
          let w = u ? String(u) : "";
          return B ? "0000000".slice(w.length) + w : w;
        }
        return a(o, 0) + a(c, o) + a(r, 1);
      }
      function Ge(l, e) {
        if (l >= 0) {
          for (; l > 127; ) e.push(l & 127 | 128), l = l >>> 7;
          e.push(l);
        } else {
          for (let t = 0; t < 9; t++) e.push(l & 127 | 128), l = l >> 7;
          e.push(1);
        }
      }
      function Pr() {
        let l = this.buf[this.pos++], e = l & 127;
        if (!(l & 128)) return this.assertBounds(), e;
        if (l = this.buf[this.pos++], e |= (l & 127) << 7, !(l & 128)) return this.assertBounds(), e;
        if (l = this.buf[this.pos++], e |= (l & 127) << 14, !(l & 128)) return this.assertBounds(), e;
        if (l = this.buf[this.pos++], e |= (l & 127) << 21, !(l & 128)) return this.assertBounds(), e;
        l = this.buf[this.pos++], e |= (l & 15) << 28;
        for (let t = 5; l & 128 && t < 10; t++) l = this.buf[this.pos++];
        if (l & 128) throw new Error("invalid varint");
        return this.assertBounds(), e >>> 0;
      }
      var x;
      function ki() {
        let l = new DataView(new ArrayBuffer(8));
        x = globalThis.BigInt !== void 0 && typeof l.getBigInt64 == "function" && typeof l.getBigUint64 == "function" && typeof l.setBigInt64 == "function" && typeof l.setBigUint64 == "function" ? { MIN: BigInt("-9223372036854775808"), MAX: BigInt("9223372036854775807"), UMIN: BigInt("0"), UMAX: BigInt("18446744073709551615"), C: BigInt, V: l } : void 0;
      }
      ki();
      function Ur(l) {
        if (!l) throw new Error("BigInt unavailable, see https://github.com/timostamm/protobuf-ts/blob/v1.0.8/MANUAL.md#bigint-support");
      }
      var Er = /^-?[0-9]+$/, Se = 4294967296, Ne = 2147483648, Oe = class {
        constructor(e, t) {
          this.lo = e | 0, this.hi = t | 0;
        }
        isZero() {
          return this.lo == 0 && this.hi == 0;
        }
        toNumber() {
          let e = this.hi * Se + (this.lo >>> 0);
          if (!Number.isSafeInteger(e)) throw new Error("cannot convert to safe number");
          return e;
        }
      }, O = class extends Oe {
        static from(e) {
          if (x) switch (typeof e) {
            case "string":
              if (e == "0") return this.ZERO;
              if (e == "") throw new Error("string is no integer");
              e = x.C(e);
            case "number":
              if (e === 0) return this.ZERO;
              e = x.C(e);
            case "bigint":
              if (!e) return this.ZERO;
              if (e < x.UMIN) throw new Error("signed value for ulong");
              if (e > x.UMAX) throw new Error("ulong too large");
              return x.V.setBigUint64(0, e, true), new O(x.V.getInt32(0, true), x.V.getInt32(4, true));
          }
          else switch (typeof e) {
            case "string":
              if (e == "0") return this.ZERO;
              if (e = e.trim(), !Er.test(e)) throw new Error("string is no integer");
              let [t, n, i] = ve(e);
              if (t) throw new Error("signed value for ulong");
              return new O(n, i);
            case "number":
              if (e == 0) return this.ZERO;
              if (!Number.isSafeInteger(e)) throw new Error("number is no integer");
              if (e < 0) throw new Error("signed value for ulong");
              return new O(e, e / Se);
          }
          throw new Error("unknown value " + typeof e);
        }
        toString() {
          return x ? this.toBigInt().toString() : We(this.lo, this.hi);
        }
        toBigInt() {
          return Ur(x), x.V.setInt32(0, this.lo, true), x.V.setInt32(4, this.hi, true), x.V.getBigUint64(0, true);
        }
      };
      O.ZERO = new O(0, 0);
      var T = class extends Oe {
        static from(e) {
          if (x) switch (typeof e) {
            case "string":
              if (e == "0") return this.ZERO;
              if (e == "") throw new Error("string is no integer");
              e = x.C(e);
            case "number":
              if (e === 0) return this.ZERO;
              e = x.C(e);
            case "bigint":
              if (!e) return this.ZERO;
              if (e < x.MIN) throw new Error("signed long too small");
              if (e > x.MAX) throw new Error("signed long too large");
              return x.V.setBigInt64(0, e, true), new T(x.V.getInt32(0, true), x.V.getInt32(4, true));
          }
          else switch (typeof e) {
            case "string":
              if (e == "0") return this.ZERO;
              if (e = e.trim(), !Er.test(e)) throw new Error("string is no integer");
              let [t, n, i] = ve(e);
              if (t) {
                if (i > Ne || i == Ne && n != 0) throw new Error("signed long too small");
              } else if (i >= Ne) throw new Error("signed long too large");
              let r = new T(n, i);
              return t ? r.negate() : r;
            case "number":
              if (e == 0) return this.ZERO;
              if (!Number.isSafeInteger(e)) throw new Error("number is no integer");
              return e > 0 ? new T(e, e / Se) : new T(-e, -e / Se).negate();
          }
          throw new Error("unknown value " + typeof e);
        }
        isNegative() {
          return (this.hi & Ne) !== 0;
        }
        negate() {
          let e = ~this.hi, t = this.lo;
          return t ? t = ~t + 1 : e += 1, new T(t, e);
        }
        toString() {
          if (x) return this.toBigInt().toString();
          if (this.isNegative()) {
            let e = this.negate();
            return "-" + We(e.lo, e.hi);
          }
          return We(this.lo, this.hi);
        }
        toBigInt() {
          return Ur(x), x.V.setInt32(0, this.lo, true), x.V.setInt32(4, this.hi, true), x.V.getBigInt64(0, true);
        }
      };
      T.ZERO = new T(0, 0);
      var Fr = { readUnknownField: true, readerFactory: (l) => new Ke(l) };
      function Lr(l) {
        return l ? Object.assign(Object.assign({}, Fr), l) : Fr;
      }
      var Ke = class {
        constructor(e, t) {
          this.varint64 = Or, this.uint32 = Pr, this.buf = e, this.len = e.length, this.pos = 0, this.view = new DataView(e.buffer, e.byteOffset, e.byteLength), this.textDecoder = t != null ? t : new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });
        }
        tag() {
          let e = this.uint32(), t = e >>> 3, n = e & 7;
          if (t <= 0 || n < 0 || n > 5) throw new Error("illegal tag: field no " + t + " wire type " + n);
          return [t, n];
        }
        skip(e) {
          let t = this.pos;
          switch (e) {
            case f.Varint:
              for (; this.buf[this.pos++] & 128; ) ;
              break;
            case f.Bit64:
              this.pos += 4;
            case f.Bit32:
              this.pos += 4;
              break;
            case f.LengthDelimited:
              let n = this.uint32();
              this.pos += n;
              break;
            case f.StartGroup:
              let i;
              for (; (i = this.tag()[1]) !== f.EndGroup; ) this.skip(i);
              break;
            default:
              throw new Error("cant skip wire type " + e);
          }
          return this.assertBounds(), this.buf.subarray(t, this.pos);
        }
        assertBounds() {
          if (this.pos > this.len) throw new RangeError("premature EOF");
        }
        int32() {
          return this.uint32() | 0;
        }
        sint32() {
          let e = this.uint32();
          return e >>> 1 ^ -(e & 1);
        }
        int64() {
          return new T(...this.varint64());
        }
        uint64() {
          return new O(...this.varint64());
        }
        sint64() {
          let [e, t] = this.varint64(), n = -(e & 1);
          return e = (e >>> 1 | (t & 1) << 31) ^ n, t = t >>> 1 ^ n, new T(e, t);
        }
        bool() {
          let [e, t] = this.varint64();
          return e !== 0 || t !== 0;
        }
        fixed32() {
          return this.view.getUint32((this.pos += 4) - 4, true);
        }
        sfixed32() {
          return this.view.getInt32((this.pos += 4) - 4, true);
        }
        fixed64() {
          return new O(this.sfixed32(), this.sfixed32());
        }
        sfixed64() {
          return new T(this.sfixed32(), this.sfixed32());
        }
        float() {
          return this.view.getFloat32((this.pos += 4) - 4, true);
        }
        double() {
          return this.view.getFloat64((this.pos += 8) - 8, true);
        }
        bytes() {
          let e = this.uint32(), t = this.pos;
          return this.pos += e, this.assertBounds(), this.buf.subarray(t, t + e);
        }
        string() {
          return this.textDecoder.decode(this.bytes());
        }
      };
      var ha = g(h());
      var ua = g(h());
      function R(l, e) {
        if (!l) throw new Error(e);
      }
      var Ri = 34028234663852886e22, wi = -34028234663852886e22, Bi = 4294967295, Ii = 2147483647, Ti = -2147483648;
      function H(l) {
        if (typeof l != "number") throw new Error("invalid int 32: " + typeof l);
        if (!Number.isInteger(l) || l > Ii || l < Ti) throw new Error("invalid int 32: " + l);
      }
      function X(l) {
        if (typeof l != "number") throw new Error("invalid uint 32: " + typeof l);
        if (!Number.isInteger(l) || l > Bi || l < 0) throw new Error("invalid uint 32: " + l);
      }
      function ee(l) {
        if (typeof l != "number") throw new Error("invalid float 32: " + typeof l);
        if (Number.isFinite(l) && (l > Ri || l < wi)) throw new Error("invalid float 32: " + l);
      }
      var Ar = { writeUnknownFields: true, writerFactory: () => new He() };
      function Dr(l) {
        return l ? Object.assign(Object.assign({}, Ar), l) : Ar;
      }
      var He = class {
        constructor(e) {
          this.stack = [], this.textEncoder = e != null ? e : new TextEncoder(), this.chunks = [], this.buf = [];
        }
        finish() {
          this.chunks.push(new Uint8Array(this.buf));
          let e = 0;
          for (let i = 0; i < this.chunks.length; i++) e += this.chunks[i].length;
          let t = new Uint8Array(e), n = 0;
          for (let i = 0; i < this.chunks.length; i++) t.set(this.chunks[i], n), n += this.chunks[i].length;
          return this.chunks = [], t;
        }
        fork() {
          return this.stack.push({ chunks: this.chunks, buf: this.buf }), this.chunks = [], this.buf = [], this;
        }
        join() {
          let e = this.finish(), t = this.stack.pop();
          if (!t) throw new Error("invalid state, fork stack empty");
          return this.chunks = t.chunks, this.buf = t.buf, this.uint32(e.byteLength), this.raw(e);
        }
        tag(e, t) {
          return this.uint32((e << 3 | t) >>> 0);
        }
        raw(e) {
          return this.buf.length && (this.chunks.push(new Uint8Array(this.buf)), this.buf = []), this.chunks.push(e), this;
        }
        uint32(e) {
          for (X(e); e > 127; ) this.buf.push(e & 127 | 128), e = e >>> 7;
          return this.buf.push(e), this;
        }
        int32(e) {
          return H(e), Ge(e, this.buf), this;
        }
        bool(e) {
          return this.buf.push(e ? 1 : 0), this;
        }
        bytes(e) {
          return this.uint32(e.byteLength), this.raw(e);
        }
        string(e) {
          let t = this.textEncoder.encode(e);
          return this.uint32(t.byteLength), this.raw(t);
        }
        float(e) {
          ee(e);
          let t = new Uint8Array(4);
          return new DataView(t.buffer).setFloat32(0, e, true), this.raw(t);
        }
        double(e) {
          let t = new Uint8Array(8);
          return new DataView(t.buffer).setFloat64(0, e, true), this.raw(t);
        }
        fixed32(e) {
          X(e);
          let t = new Uint8Array(4);
          return new DataView(t.buffer).setUint32(0, e, true), this.raw(t);
        }
        sfixed32(e) {
          H(e);
          let t = new Uint8Array(4);
          return new DataView(t.buffer).setInt32(0, e, true), this.raw(t);
        }
        sint32(e) {
          return H(e), e = (e << 1 ^ e >> 31) >>> 0, Ge(e, this.buf), this;
        }
        sfixed64(e) {
          let t = new Uint8Array(8), n = new DataView(t.buffer), i = T.from(e);
          return n.setInt32(0, i.lo, true), n.setInt32(4, i.hi, true), this.raw(t);
        }
        fixed64(e) {
          let t = new Uint8Array(8), n = new DataView(t.buffer), i = O.from(e);
          return n.setInt32(0, i.lo, true), n.setInt32(4, i.hi, true), this.raw(t);
        }
        int64(e) {
          let t = T.from(e);
          return xe(t.lo, t.hi, this.buf), this;
        }
        sint64(e) {
          let t = T.from(e), n = t.hi >> 31, i = t.lo << 1 ^ n, r = (t.hi << 1 | t.lo >>> 31) ^ n;
          return xe(i, r, this.buf), this;
        }
        uint64(e) {
          let t = O.from(e);
          return xe(t.lo, t.hi, this.buf), this;
        }
      };
      var ga = g(h()), $r = { emitDefaultValues: false, enumAsInteger: false, useProtoFieldName: false, prettySpaces: 0 }, jr = { ignoreUnknownFields: false };
      function Vr(l) {
        return l ? Object.assign(Object.assign({}, jr), l) : jr;
      }
      function Mr(l) {
        return l ? Object.assign(Object.assign({}, $r), l) : $r;
      }
      var ka = g(h()), Pe = Symbol.for("protobuf-ts/message-type");
      var Ao = g(h());
      var Ta = g(h());
      var wa = g(h());
      function _e(l) {
        let e = false, t = [];
        for (let n = 0; n < l.length; n++) {
          let i = l.charAt(n);
          i == "_" ? e = true : /\d/.test(i) ? (t.push(i), e = true) : e ? (t.push(i.toUpperCase()), e = false) : n == 0 ? t.push(i.toLowerCase()) : t.push(i);
        }
        return t.join("");
      }
      var p;
      (function(l) {
        l[l.DOUBLE = 1] = "DOUBLE", l[l.FLOAT = 2] = "FLOAT", l[l.INT64 = 3] = "INT64", l[l.UINT64 = 4] = "UINT64", l[l.INT32 = 5] = "INT32", l[l.FIXED64 = 6] = "FIXED64", l[l.FIXED32 = 7] = "FIXED32", l[l.BOOL = 8] = "BOOL", l[l.STRING = 9] = "STRING", l[l.BYTES = 12] = "BYTES", l[l.UINT32 = 13] = "UINT32", l[l.SFIXED32 = 15] = "SFIXED32", l[l.SFIXED64 = 16] = "SFIXED64", l[l.SINT32 = 17] = "SINT32", l[l.SINT64 = 18] = "SINT64";
      })(p || (p = {}));
      var L;
      (function(l) {
        l[l.BIGINT = 0] = "BIGINT", l[l.STRING = 1] = "STRING", l[l.NUMBER = 2] = "NUMBER";
      })(L || (L = {}));
      var ye;
      (function(l) {
        l[l.NO = 0] = "NO", l[l.PACKED = 1] = "PACKED", l[l.UNPACKED = 2] = "UNPACKED";
      })(ye || (ye = {}));
      function vr(l) {
        var e, t, n, i;
        return l.localName = (e = l.localName) !== null && e !== void 0 ? e : _e(l.name), l.jsonName = (t = l.jsonName) !== null && t !== void 0 ? t : _e(l.name), l.repeat = (n = l.repeat) !== null && n !== void 0 ? n : ye.NO, l.opt = (i = l.opt) !== null && i !== void 0 ? i : l.repeat || l.oneof ? false : l.kind == "message", l;
      }
      var Oa = g(h());
      var xa = g(h());
      function Gr(l) {
        if (typeof l != "object" || l === null || !l.hasOwnProperty("oneofKind")) return false;
        switch (typeof l.oneofKind) {
          case "string":
            return l[l.oneofKind] === void 0 ? false : Object.keys(l).length == 2;
          case "undefined":
            return Object.keys(l).length == 1;
          default:
            return false;
        }
      }
      var Ue = class {
        constructor(e) {
          var t;
          this.fields = (t = e.fields) !== null && t !== void 0 ? t : [];
        }
        prepare() {
          if (this.data) return;
          let e = [], t = [], n = [];
          for (let i of this.fields) if (i.oneof) n.includes(i.oneof) || (n.push(i.oneof), e.push(i.oneof), t.push(i.oneof));
          else switch (t.push(i.localName), i.kind) {
            case "scalar":
            case "enum":
              (!i.opt || i.repeat) && e.push(i.localName);
              break;
            case "message":
              i.repeat && e.push(i.localName);
              break;
            case "map":
              e.push(i.localName);
              break;
          }
          this.data = { req: e, known: t, oneofs: Object.values(n) };
        }
        is(e, t, n = false) {
          if (t < 0) return true;
          if (e == null || typeof e != "object") return false;
          this.prepare();
          let i = Object.keys(e), r = this.data;
          if (i.length < r.req.length || r.req.some((c) => !i.includes(c)) || !n && i.some((c) => !r.known.includes(c))) return false;
          if (t < 1) return true;
          for (let c of r.oneofs) {
            let o = e[c];
            if (!Gr(o)) return false;
            if (o.oneofKind === void 0) continue;
            let s = this.fields.find((a) => a.localName === o.oneofKind);
            if (!s || !this.field(o[o.oneofKind], s, n, t)) return false;
          }
          for (let c of this.fields) if (c.oneof === void 0 && !this.field(e[c.localName], c, n, t)) return false;
          return true;
        }
        field(e, t, n, i) {
          let r = t.repeat;
          switch (t.kind) {
            case "scalar":
              return e === void 0 ? t.opt : r ? this.scalars(e, t.T, i, t.L) : this.scalar(e, t.T, t.L);
            case "enum":
              return e === void 0 ? t.opt : r ? this.scalars(e, p.INT32, i) : this.scalar(e, p.INT32);
            case "message":
              return e === void 0 ? true : r ? this.messages(e, t.T(), n, i) : this.message(e, t.T(), n, i);
            case "map":
              if (typeof e != "object" || e === null) return false;
              if (i < 2) return true;
              if (!this.mapKeys(e, t.K, i)) return false;
              switch (t.V.kind) {
                case "scalar":
                  return this.scalars(Object.values(e), t.V.T, i, t.V.L);
                case "enum":
                  return this.scalars(Object.values(e), p.INT32, i);
                case "message":
                  return this.messages(Object.values(e), t.V.T(), n, i);
              }
              break;
          }
          return true;
        }
        message(e, t, n, i) {
          return n ? t.isAssignable(e, i) : t.is(e, i);
        }
        messages(e, t, n, i) {
          if (!Array.isArray(e)) return false;
          if (i < 2) return true;
          if (n) {
            for (let r = 0; r < e.length && r < i; r++) if (!t.isAssignable(e[r], i - 1)) return false;
          } else for (let r = 0; r < e.length && r < i; r++) if (!t.is(e[r], i - 1)) return false;
          return true;
        }
        scalar(e, t, n) {
          let i = typeof e;
          switch (t) {
            case p.UINT64:
            case p.FIXED64:
            case p.INT64:
            case p.SFIXED64:
            case p.SINT64:
              switch (n) {
                case L.BIGINT:
                  return i == "bigint";
                case L.NUMBER:
                  return i == "number" && !isNaN(e);
                default:
                  return i == "string";
              }
            case p.BOOL:
              return i == "boolean";
            case p.STRING:
              return i == "string";
            case p.BYTES:
              return e instanceof Uint8Array;
            case p.DOUBLE:
            case p.FLOAT:
              return i == "number" && !isNaN(e);
            default:
              return i == "number" && Number.isInteger(e);
          }
        }
        scalars(e, t, n, i) {
          if (!Array.isArray(e)) return false;
          if (n < 2) return true;
          if (Array.isArray(e)) {
            for (let r = 0; r < e.length && r < n; r++) if (!this.scalar(e[r], t, i)) return false;
          }
          return true;
        }
        mapKeys(e, t, n) {
          let i = Object.keys(e);
          switch (t) {
            case p.INT32:
            case p.FIXED32:
            case p.SFIXED32:
            case p.SINT32:
            case p.UINT32:
              return this.scalars(i.slice(0, n).map((r) => parseInt(r)), t, n);
            case p.BOOL:
              return this.scalars(i.slice(0, n).map((r) => r == "true" ? true : r == "false" ? false : r), t, n);
            default:
              return this.scalars(i, t, n, L.STRING);
          }
        }
      };
      var Ma = g(h());
      var Ea = g(h());
      function D(l, e) {
        switch (e) {
          case L.BIGINT:
            return l.toBigInt();
          case L.NUMBER:
            return l.toNumber();
          default:
            return l.toString();
        }
      }
      var Ee = class {
        constructor(e) {
          this.info = e;
        }
        prepare() {
          var e;
          if (this.fMap === void 0) {
            this.fMap = {};
            let t = (e = this.info.fields) !== null && e !== void 0 ? e : [];
            for (let n of t) this.fMap[n.name] = n, this.fMap[n.jsonName] = n, this.fMap[n.localName] = n;
          }
        }
        assert(e, t, n) {
          if (!e) {
            let i = Be(n);
            throw (i == "number" || i == "boolean") && (i = n.toString()), new Error(`Cannot parse JSON ${i} for ${this.info.typeName}#${t}`);
          }
        }
        read(e, t, n) {
          this.prepare();
          let i = [];
          for (let [r, c] of Object.entries(e)) {
            let o = this.fMap[r];
            if (!o) {
              if (!n.ignoreUnknownFields) throw new Error(`Found unknown field while reading ${this.info.typeName} from JSON format. JSON key: ${r}`);
              continue;
            }
            let s = o.localName, a;
            if (o.oneof) {
              if (c === null && (o.kind !== "enum" || o.T()[0] !== "google.protobuf.NullValue")) continue;
              if (i.includes(o.oneof)) throw new Error(`Multiple members of the oneof group "${o.oneof}" of ${this.info.typeName} are present in JSON.`);
              i.push(o.oneof), a = t[o.oneof] = { oneofKind: s };
            } else a = t;
            if (o.kind == "map") {
              if (c === null) continue;
              this.assert(Sr(c), o.name, c);
              let u = a[s];
              for (let [B, w] of Object.entries(c)) {
                this.assert(w !== null, o.name + " map value", null);
                let b;
                switch (o.V.kind) {
                  case "message":
                    b = o.V.T().internalJsonRead(w, n);
                    break;
                  case "enum":
                    if (b = this.enum(o.V.T(), w, o.name, n.ignoreUnknownFields), b === false) continue;
                    break;
                  case "scalar":
                    b = this.scalar(w, o.V.T, o.V.L, o.name);
                    break;
                }
                this.assert(b !== void 0, o.name + " map value", w);
                let I = B;
                o.K == p.BOOL && (I = I == "true" ? true : I == "false" ? false : I), I = this.scalar(I, o.K, L.STRING, o.name).toString(), u[I] = b;
              }
            } else if (o.repeat) {
              if (c === null) continue;
              this.assert(Array.isArray(c), o.name, c);
              let u = a[s];
              for (let B of c) {
                this.assert(B !== null, o.name, null);
                let w;
                switch (o.kind) {
                  case "message":
                    w = o.T().internalJsonRead(B, n);
                    break;
                  case "enum":
                    if (w = this.enum(o.T(), B, o.name, n.ignoreUnknownFields), w === false) continue;
                    break;
                  case "scalar":
                    w = this.scalar(B, o.T, o.L, o.name);
                    break;
                }
                this.assert(w !== void 0, o.name, c), u.push(w);
              }
            } else switch (o.kind) {
              case "message":
                if (c === null && o.T().typeName != "google.protobuf.Value") {
                  this.assert(o.oneof === void 0, o.name + " (oneof member)", null);
                  continue;
                }
                a[s] = o.T().internalJsonRead(c, n, a[s]);
                break;
              case "enum":
                let u = this.enum(o.T(), c, o.name, n.ignoreUnknownFields);
                if (u === false) continue;
                a[s] = u;
                break;
              case "scalar":
                a[s] = this.scalar(c, o.T, o.L, o.name);
                break;
            }
          }
        }
        enum(e, t, n, i) {
          if (e[0] == "google.protobuf.NullValue" && R(t === null || t === "NULL_VALUE", `Unable to parse field ${this.info.typeName}#${n}, enum ${e[0]} only accepts null.`), t === null) return 0;
          switch (typeof t) {
            case "number":
              return R(Number.isInteger(t), `Unable to parse field ${this.info.typeName}#${n}, enum can only be integral number, got ${t}.`), t;
            case "string":
              let r = t;
              e[2] && t.substring(0, e[2].length) === e[2] && (r = t.substring(e[2].length));
              let c = e[1][r];
              return typeof c > "u" && i ? false : (R(typeof c == "number", `Unable to parse field ${this.info.typeName}#${n}, enum ${e[0]} has no value for "${t}".`), c);
          }
          R(false, `Unable to parse field ${this.info.typeName}#${n}, cannot parse enum value from ${typeof t}".`);
        }
        scalar(e, t, n, i) {
          let r;
          try {
            switch (t) {
              case p.DOUBLE:
              case p.FLOAT:
                if (e === null) return 0;
                if (e === "NaN") return Number.NaN;
                if (e === "Infinity") return Number.POSITIVE_INFINITY;
                if (e === "-Infinity") return Number.NEGATIVE_INFINITY;
                if (e === "") {
                  r = "empty string";
                  break;
                }
                if (typeof e == "string" && e.trim().length !== e.length) {
                  r = "extra whitespace";
                  break;
                }
                if (typeof e != "string" && typeof e != "number") break;
                let c = Number(e);
                if (Number.isNaN(c)) {
                  r = "not a number";
                  break;
                }
                if (!Number.isFinite(c)) {
                  r = "too large or small";
                  break;
                }
                return t == p.FLOAT && ee(c), c;
              case p.INT32:
              case p.FIXED32:
              case p.SFIXED32:
              case p.SINT32:
              case p.UINT32:
                if (e === null) return 0;
                let o;
                if (typeof e == "number" ? o = e : e === "" ? r = "empty string" : typeof e == "string" && (e.trim().length !== e.length ? r = "extra whitespace" : o = Number(e)), o === void 0) break;
                return t == p.UINT32 ? X(o) : H(o), o;
              case p.INT64:
              case p.SFIXED64:
              case p.SINT64:
                if (e === null) return D(T.ZERO, n);
                if (typeof e != "number" && typeof e != "string") break;
                return D(T.from(e), n);
              case p.FIXED64:
              case p.UINT64:
                if (e === null) return D(O.ZERO, n);
                if (typeof e != "number" && typeof e != "string") break;
                return D(O.from(e), n);
              case p.BOOL:
                if (e === null) return false;
                if (typeof e != "boolean") break;
                return e;
              case p.STRING:
                if (e === null) return "";
                if (typeof e != "string") {
                  r = "extra whitespace";
                  break;
                }
                try {
                  encodeURIComponent(e);
                } catch (s) {
                  s = "invalid UTF8";
                  break;
                }
                return e;
              case p.BYTES:
                if (e === null || e === "") return new Uint8Array(0);
                if (typeof e != "string") break;
                return Te(e);
            }
          } catch (c) {
            r = c.message;
          }
          this.assert(false, i + (r ? " - " + r : ""), e);
        }
      };
      var Ja = g(h());
      var Fe = class {
        constructor(e) {
          var t;
          this.fields = (t = e.fields) !== null && t !== void 0 ? t : [];
        }
        write(e, t) {
          let n = {}, i = e;
          for (let r of this.fields) {
            if (!r.oneof) {
              let a = this.field(r, i[r.localName], t);
              a !== void 0 && (n[t.useProtoFieldName ? r.name : r.jsonName] = a);
              continue;
            }
            let c = i[r.oneof];
            if (c.oneofKind !== r.localName) continue;
            let o = r.kind == "scalar" || r.kind == "enum" ? Object.assign(Object.assign({}, t), { emitDefaultValues: true }) : t, s = this.field(r, c[r.localName], o);
            R(s !== void 0), n[t.useProtoFieldName ? r.name : r.jsonName] = s;
          }
          return n;
        }
        field(e, t, n) {
          let i;
          if (e.kind == "map") {
            R(typeof t == "object" && t !== null);
            let r = {};
            switch (e.V.kind) {
              case "scalar":
                for (let [s, a] of Object.entries(t)) {
                  let u = this.scalar(e.V.T, a, e.name, false, true);
                  R(u !== void 0), r[s.toString()] = u;
                }
                break;
              case "message":
                let c = e.V.T();
                for (let [s, a] of Object.entries(t)) {
                  let u = this.message(c, a, e.name, n);
                  R(u !== void 0), r[s.toString()] = u;
                }
                break;
              case "enum":
                let o = e.V.T();
                for (let [s, a] of Object.entries(t)) {
                  R(a === void 0 || typeof a == "number");
                  let u = this.enum(o, a, e.name, false, true, n.enumAsInteger);
                  R(u !== void 0), r[s.toString()] = u;
                }
                break;
            }
            (n.emitDefaultValues || Object.keys(r).length > 0) && (i = r);
          } else if (e.repeat) {
            R(Array.isArray(t));
            let r = [];
            switch (e.kind) {
              case "scalar":
                for (let s = 0; s < t.length; s++) {
                  let a = this.scalar(e.T, t[s], e.name, e.opt, true);
                  R(a !== void 0), r.push(a);
                }
                break;
              case "enum":
                let c = e.T();
                for (let s = 0; s < t.length; s++) {
                  R(t[s] === void 0 || typeof t[s] == "number");
                  let a = this.enum(c, t[s], e.name, e.opt, true, n.enumAsInteger);
                  R(a !== void 0), r.push(a);
                }
                break;
              case "message":
                let o = e.T();
                for (let s = 0; s < t.length; s++) {
                  let a = this.message(o, t[s], e.name, n);
                  R(a !== void 0), r.push(a);
                }
                break;
            }
            (n.emitDefaultValues || r.length > 0 || n.emitDefaultValues) && (i = r);
          } else switch (e.kind) {
            case "scalar":
              i = this.scalar(e.T, t, e.name, e.opt, n.emitDefaultValues);
              break;
            case "enum":
              i = this.enum(e.T(), t, e.name, e.opt, n.emitDefaultValues, n.enumAsInteger);
              break;
            case "message":
              i = this.message(e.T(), t, e.name, n);
              break;
          }
          return i;
        }
        enum(e, t, n, i, r, c) {
          if (e[0] == "google.protobuf.NullValue") return !r && !i ? void 0 : null;
          if (t === void 0) {
            R(i);
            return;
          }
          if (!(t === 0 && !r && !i)) return R(typeof t == "number"), R(Number.isInteger(t)), c || !e[1].hasOwnProperty(t) ? t : e[2] ? e[2] + e[1][t] : e[1][t];
        }
        message(e, t, n, i) {
          return t === void 0 ? i.emitDefaultValues ? null : void 0 : e.internalJsonWrite(t, i);
        }
        scalar(e, t, n, i, r) {
          if (t === void 0) {
            R(i);
            return;
          }
          let c = r || i;
          switch (e) {
            case p.INT32:
            case p.SFIXED32:
            case p.SINT32:
              return t === 0 ? c ? 0 : void 0 : (H(t), t);
            case p.FIXED32:
            case p.UINT32:
              return t === 0 ? c ? 0 : void 0 : (X(t), t);
            case p.FLOAT:
              ee(t);
            case p.DOUBLE:
              return t === 0 ? c ? 0 : void 0 : (R(typeof t == "number"), Number.isNaN(t) ? "NaN" : t === Number.POSITIVE_INFINITY ? "Infinity" : t === Number.NEGATIVE_INFINITY ? "-Infinity" : t);
            case p.STRING:
              return t === "" ? c ? "" : void 0 : (R(typeof t == "string"), t);
            case p.BOOL:
              return t === false ? c ? false : void 0 : (R(typeof t == "boolean"), t);
            case p.UINT64:
            case p.FIXED64:
              R(typeof t == "number" || typeof t == "string" || typeof t == "bigint");
              let o = O.from(t);
              return o.isZero() && !c ? void 0 : o.toString();
            case p.INT64:
            case p.SFIXED64:
            case p.SINT64:
              R(typeof t == "number" || typeof t == "string" || typeof t == "bigint");
              let s = T.from(t);
              return s.isZero() && !c ? void 0 : s.toString();
            case p.BYTES:
              return R(t instanceof Uint8Array), t.byteLength ? Q(t) : c ? "" : void 0;
          }
        }
      };
      var io = g(h());
      var Za = g(h());
      function he(l, e = L.STRING) {
        switch (l) {
          case p.BOOL:
            return false;
          case p.UINT64:
          case p.FIXED64:
            return D(O.ZERO, e);
          case p.INT64:
          case p.SFIXED64:
          case p.SINT64:
            return D(T.ZERO, e);
          case p.DOUBLE:
          case p.FLOAT:
            return 0;
          case p.BYTES:
            return new Uint8Array(0);
          case p.STRING:
            return "";
          default:
            return 0;
        }
      }
      var Le = class {
        constructor(e) {
          this.info = e;
        }
        prepare() {
          var e;
          if (!this.fieldNoToField) {
            let t = (e = this.info.fields) !== null && e !== void 0 ? e : [];
            this.fieldNoToField = new Map(t.map((n) => [n.no, n]));
          }
        }
        read(e, t, n, i) {
          this.prepare();
          let r = i === void 0 ? e.len : e.pos + i;
          for (; e.pos < r; ) {
            let [c, o] = e.tag(), s = this.fieldNoToField.get(c);
            if (!s) {
              let w = n.readUnknownField;
              if (w == "throw") throw new Error(`Unknown field ${c} (wire type ${o}) for ${this.info.typeName}`);
              let b = e.skip(o);
              w !== false && (w === true ? d.onRead : w)(this.info.typeName, t, c, o, b);
              continue;
            }
            let a = t, u = s.repeat, B = s.localName;
            switch (s.oneof && (a = a[s.oneof], a.oneofKind !== B && (a = t[s.oneof] = { oneofKind: B })), s.kind) {
              case "scalar":
              case "enum":
                let w = s.kind == "enum" ? p.INT32 : s.T, b = s.kind == "scalar" ? s.L : void 0;
                if (u) {
                  let N = a[B];
                  if (o == f.LengthDelimited && w != p.STRING && w != p.BYTES) {
                    let k = e.uint32() + e.pos;
                    for (; e.pos < k; ) N.push(this.scalar(e, w, b));
                  } else N.push(this.scalar(e, w, b));
                } else a[B] = this.scalar(e, w, b);
                break;
              case "message":
                if (u) {
                  let N = a[B], k = s.T().internalBinaryRead(e, e.uint32(), n);
                  N.push(k);
                } else a[B] = s.T().internalBinaryRead(e, e.uint32(), n, a[B]);
                break;
              case "map":
                let [I, $] = this.mapEntry(s, e, n);
                a[B][I] = $;
                break;
            }
          }
        }
        mapEntry(e, t, n) {
          let i = t.uint32(), r = t.pos + i, c, o;
          for (; t.pos < r; ) {
            let [s, a] = t.tag();
            switch (s) {
              case 1:
                e.K == p.BOOL ? c = t.bool().toString() : c = this.scalar(t, e.K, L.STRING);
                break;
              case 2:
                switch (e.V.kind) {
                  case "scalar":
                    o = this.scalar(t, e.V.T, e.V.L);
                    break;
                  case "enum":
                    o = t.int32();
                    break;
                  case "message":
                    o = e.V.T().internalBinaryRead(t, t.uint32(), n);
                    break;
                }
                break;
              default:
                throw new Error(`Unknown field ${s} (wire type ${a}) in map entry for ${this.info.typeName}#${e.name}`);
            }
          }
          if (c === void 0) {
            let s = he(e.K);
            c = e.K == p.BOOL ? s.toString() : s;
          }
          if (o === void 0) switch (e.V.kind) {
            case "scalar":
              o = he(e.V.T, e.V.L);
              break;
            case "enum":
              o = 0;
              break;
            case "message":
              o = e.V.T().create();
              break;
          }
          return [c, o];
        }
        scalar(e, t, n) {
          switch (t) {
            case p.INT32:
              return e.int32();
            case p.STRING:
              return e.string();
            case p.BOOL:
              return e.bool();
            case p.DOUBLE:
              return e.double();
            case p.FLOAT:
              return e.float();
            case p.INT64:
              return D(e.int64(), n);
            case p.UINT64:
              return D(e.uint64(), n);
            case p.FIXED64:
              return D(e.fixed64(), n);
            case p.FIXED32:
              return e.fixed32();
            case p.BYTES:
              return e.bytes();
            case p.UINT32:
              return e.uint32();
            case p.SFIXED32:
              return e.sfixed32();
            case p.SFIXED64:
              return D(e.sfixed64(), n);
            case p.SINT32:
              return e.sint32();
            case p.SINT64:
              return D(e.sint64(), n);
          }
        }
      };
      var uo = g(h());
      var Ae = class {
        constructor(e) {
          this.info = e;
        }
        prepare() {
          if (!this.fields) {
            let e = this.info.fields ? this.info.fields.concat() : [];
            this.fields = e.sort((t, n) => t.no - n.no);
          }
        }
        write(e, t, n) {
          this.prepare();
          for (let r of this.fields) {
            let c, o, s = r.repeat, a = r.localName;
            if (r.oneof) {
              let u = e[r.oneof];
              if (u.oneofKind !== a) continue;
              c = u[a], o = true;
            } else c = e[a], o = false;
            switch (r.kind) {
              case "scalar":
              case "enum":
                let u = r.kind == "enum" ? p.INT32 : r.T;
                if (s) if (R(Array.isArray(c)), s == ye.PACKED) this.packed(t, u, r.no, c);
                else for (let B of c) this.scalar(t, u, r.no, B, true);
                else c === void 0 ? R(r.opt) : this.scalar(t, u, r.no, c, o || r.opt);
                break;
              case "message":
                if (s) {
                  R(Array.isArray(c));
                  for (let B of c) this.message(t, n, r.T(), r.no, B);
                } else this.message(t, n, r.T(), r.no, c);
                break;
              case "map":
                R(typeof c == "object" && c !== null);
                for (let [B, w] of Object.entries(c)) this.mapEntry(t, n, r, B, w);
                break;
            }
          }
          let i = n.writeUnknownFields;
          i !== false && (i === true ? d.onWrite : i)(this.info.typeName, e, t);
        }
        mapEntry(e, t, n, i, r) {
          e.tag(n.no, f.LengthDelimited), e.fork();
          let c = i;
          switch (n.K) {
            case p.INT32:
            case p.FIXED32:
            case p.UINT32:
            case p.SFIXED32:
            case p.SINT32:
              c = Number.parseInt(i);
              break;
            case p.BOOL:
              R(i == "true" || i == "false"), c = i == "true";
              break;
          }
          switch (this.scalar(e, n.K, 1, c, true), n.V.kind) {
            case "scalar":
              this.scalar(e, n.V.T, 2, r, true);
              break;
            case "enum":
              this.scalar(e, p.INT32, 2, r, true);
              break;
            case "message":
              this.message(e, t, n.V.T(), 2, r);
              break;
          }
          e.join();
        }
        message(e, t, n, i, r) {
          r !== void 0 && (n.internalBinaryWrite(r, e.tag(i, f.LengthDelimited).fork(), t), e.join());
        }
        scalar(e, t, n, i, r) {
          let [c, o, s] = this.scalarInfo(t, i);
          (!s || r) && (e.tag(n, c), e[o](i));
        }
        packed(e, t, n, i) {
          if (!i.length) return;
          R(t !== p.BYTES && t !== p.STRING), e.tag(n, f.LengthDelimited), e.fork();
          let [, r] = this.scalarInfo(t);
          for (let c = 0; c < i.length; c++) e[r](i[c]);
          e.join();
        }
        scalarInfo(e, t) {
          let n = f.Varint, i, r = t === void 0, c = t === 0;
          switch (e) {
            case p.INT32:
              i = "int32";
              break;
            case p.STRING:
              c = r || !t.length, n = f.LengthDelimited, i = "string";
              break;
            case p.BOOL:
              c = t === false, i = "bool";
              break;
            case p.UINT32:
              i = "uint32";
              break;
            case p.DOUBLE:
              n = f.Bit64, i = "double";
              break;
            case p.FLOAT:
              n = f.Bit32, i = "float";
              break;
            case p.INT64:
              c = r || T.from(t).isZero(), i = "int64";
              break;
            case p.UINT64:
              c = r || O.from(t).isZero(), i = "uint64";
              break;
            case p.FIXED64:
              c = r || O.from(t).isZero(), n = f.Bit64, i = "fixed64";
              break;
            case p.BYTES:
              c = r || !t.byteLength, n = f.LengthDelimited, i = "bytes";
              break;
            case p.FIXED32:
              n = f.Bit32, i = "fixed32";
              break;
            case p.SFIXED32:
              n = f.Bit32, i = "sfixed32";
              break;
            case p.SFIXED64:
              c = r || T.from(t).isZero(), n = f.Bit64, i = "sfixed64";
              break;
            case p.SINT32:
              i = "sint32";
              break;
            case p.SINT64:
              c = r || T.from(t).isZero(), i = "sint64";
              break;
          }
          return [n, i, r || c];
        }
      };
      var ho = g(h());
      function Kr(l) {
        let e = l.messagePrototype ? Object.create(l.messagePrototype) : Object.defineProperty({}, Pe, { value: l });
        for (let t of l.fields) {
          let n = t.localName;
          if (!t.opt) if (t.oneof) e[t.oneof] = { oneofKind: void 0 };
          else if (t.repeat) e[n] = [];
          else switch (t.kind) {
            case "scalar":
              e[n] = he(t.T, t.L);
              break;
            case "enum":
              e[n] = 0;
              break;
            case "map":
              e[n] = {};
              break;
          }
        }
        return e;
      }
      var go = g(h());
      function y(l, e, t) {
        let n, i = t, r;
        for (let c of l.fields) {
          let o = c.localName;
          if (c.oneof) {
            let s = i[c.oneof];
            if ((s == null ? void 0 : s.oneofKind) == null) continue;
            if (n = s[o], r = e[c.oneof], r.oneofKind = s.oneofKind, n == null) {
              delete r[o];
              continue;
            }
          } else if (n = i[o], r = e, n == null) continue;
          switch (c.repeat && (r[o].length = n.length), c.kind) {
            case "scalar":
            case "enum":
              if (c.repeat) for (let a = 0; a < n.length; a++) r[o][a] = n[a];
              else r[o] = n;
              break;
            case "message":
              let s = c.T();
              if (c.repeat) for (let a = 0; a < n.length; a++) r[o][a] = s.create(n[a]);
              else r[o] === void 0 ? r[o] = s.create(n) : s.mergePartial(r[o], n);
              break;
            case "map":
              switch (c.V.kind) {
                case "scalar":
                case "enum":
                  Object.assign(r[o], n);
                  break;
                case "message":
                  let a = c.V.T();
                  for (let u of Object.keys(n)) r[o][u] = a.create(n[u]);
                  break;
              }
              break;
          }
        }
      }
      var Ro = g(h());
      function Jr(l, e, t) {
        if (e === t) return true;
        if (!e || !t) return false;
        for (let n of l.fields) {
          let i = n.localName, r = n.oneof ? e[n.oneof][i] : e[i], c = n.oneof ? t[n.oneof][i] : t[i];
          switch (n.kind) {
            case "enum":
            case "scalar":
              let o = n.kind == "enum" ? p.INT32 : n.T;
              if (!(n.repeat ? Hr(o, r, c) : Xr(o, r, c))) return false;
              break;
            case "map":
              if (!(n.V.kind == "message" ? _r(n.V.T(), De(r), De(c)) : Hr(n.V.kind == "enum" ? p.INT32 : n.V.T, De(r), De(c)))) return false;
              break;
            case "message":
              let s = n.T();
              if (!(n.repeat ? _r(s, r, c) : s.equals(r, c))) return false;
              break;
          }
        }
        return true;
      }
      var De = Object.values;
      function Xr(l, e, t) {
        if (e === t) return true;
        if (l !== p.BYTES) return false;
        let n = e, i = t;
        if (n.length !== i.length) return false;
        for (let r = 0; r < n.length; r++) if (n[r] != i[r]) return false;
        return true;
      }
      function Hr(l, e, t) {
        if (e.length !== t.length) return false;
        for (let n = 0; n < e.length; n++) if (!Xr(l, e[n], t[n])) return false;
        return true;
      }
      function _r(l, e, t) {
        if (e.length !== t.length) return false;
        for (let n = 0; n < e.length; n++) if (!l.equals(e[n], t[n])) return false;
        return true;
      }
      var Ci = Object.getOwnPropertyDescriptors(Object.getPrototypeOf({})), m = class {
        constructor(e, t, n) {
          this.defaultCheckDepth = 16, this.typeName = e, this.fields = t.map(vr), this.options = n != null ? n : {}, this.messagePrototype = Object.create(null, Object.assign(Object.assign({}, Ci), { [Pe]: { value: this } })), this.refTypeCheck = new Ue(this), this.refJsonReader = new Ee(this), this.refJsonWriter = new Fe(this), this.refBinReader = new Le(this), this.refBinWriter = new Ae(this);
        }
        create(e) {
          let t = Kr(this);
          return e !== void 0 && y(this, t, e), t;
        }
        clone(e) {
          let t = this.create();
          return y(this, t, e), t;
        }
        equals(e, t) {
          return Jr(this, e, t);
        }
        is(e, t = this.defaultCheckDepth) {
          return this.refTypeCheck.is(e, t, false);
        }
        isAssignable(e, t = this.defaultCheckDepth) {
          return this.refTypeCheck.is(e, t, true);
        }
        mergePartial(e, t) {
          y(this, e, t);
        }
        fromBinary(e, t) {
          let n = Lr(t);
          return this.internalBinaryRead(n.readerFactory(e), e.byteLength, n);
        }
        fromJson(e, t) {
          return this.internalJsonRead(e, Vr(t));
        }
        fromJsonString(e, t) {
          let n = JSON.parse(e);
          return this.fromJson(n, t);
        }
        toJson(e, t) {
          return this.internalJsonWrite(e, Mr(t));
        }
        toJsonString(e, t) {
          var n;
          let i = this.toJson(e, t);
          return JSON.stringify(i, null, (n = t == null ? void 0 : t.prettySpaces) !== null && n !== void 0 ? n : 0);
        }
        toBinary(e, t) {
          let n = Dr(t);
          return this.internalBinaryWrite(e, n.writerFactory(), n).finish();
        }
        internalJsonRead(e, t, n) {
          if (e !== null && typeof e == "object" && !Array.isArray(e)) {
            let i = n != null ? n : this.create();
            return this.refJsonReader.read(e, i, t), i;
          }
          throw new Error(`Unable to parse message ${this.typeName} from JSON ${Be(e)}.`);
        }
        internalJsonWrite(e, t) {
          return this.refJsonWriter.write(e, t);
        }
        internalBinaryWrite(e, t, n) {
          return this.refBinWriter.write(e, t, n), t;
        }
        internalBinaryRead(e, t, n, i) {
          let r = i != null ? i : this.create();
          return this.refBinReader.read(e, r, n, t), r;
        }
      };
      var us = g(h(), 1);
      var qo = g(h(), 1);
      var Je = class extends m {
        constructor() {
          super("youtube.component.Label", [{ no: 1, name: "runs", kind: "message", repeat: 1, T: () => q }]);
        }
        create(e) {
          let t = globalThis.Object.create(this.messagePrototype);
          return t.runs = [], e !== void 0 && y(this, t, e), t;
        }
        internalBinaryRead(e, t, n, i) {
          let r = i != null ? i : this.create(), c = e.pos + t;
          for (; e.pos < c; ) {
            let [o, s] = e.tag();
            switch (o) {
              case 1:
                r.runs.push(q.internalBinaryRead(e, e.uint32(), n));
                break;
              default:
                let a = n.readUnknownField;
                if (a === "throw") throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);
                let u = e.skip(s);
                a !== false && (a === true ? d.onRead : a)(this.typeName, r, o, s, u);
            }
          }
          return r;
        }
        internalBinaryWrite(e, t, n) {
          for (let r = 0; r < e.runs.length; r++) q.internalBinaryWrite(e.runs[r], t.tag(1, f.LengthDelimited).fork(), n).join();
          let i = n.writeUnknownFields;
          return i !== false && (i == true ? d.onWrite : i)(this.typeName, e, t), t;
        }
      }, W = new Je(), Xe = class extends m {
        constructor() {
          super("youtube.component.Run", [{ no: 1, name: "text", kind: "scalar", T: 9 }]);
        }
        create(e) {
          let t = globalThis.Object.create(this.messagePrototype);
          return t.text = "", e !== void 0 && y(this, t, e), t;
        }
        internalBinaryRead(e, t, n, i) {
          let r = i != null ? i : this.create(), c = e.pos + t;
          for (; e.pos < c; ) {
            let [o, s] = e.tag();
            switch (o) {
              case 1:
                r.text = e.string();
                break;
              default:
                let a = n.readUnknownField;
                if (a === "throw") throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);
                let u = e.skip(s);
                a !== false && (a === true ? d.onRead : a)(this.typeName, r, o, s, u);
            }
          }
          return r;
        }
        internalBinaryWrite(e, t, n) {
          e.text !== "" && t.tag(1, f.LengthDelimited).string(e.text);
          let i = n.writeUnknownFields;
          return i !== false && (i == true ? d.onWrite : i)(this.typeName, e, t), t;
        }
      }, q = new Xe();
      var ts = g(h(), 1);
      var ze = class extends m {
        constructor() {
          super("youtube.component.ResponseContext", [{ no: 6, name: "serviceTrackingParams", kind: "message", repeat: 1, T: () => qe }]);
        }
        create(e) {
          let t = globalThis.Object.create(this.messagePrototype);
          return t.serviceTrackingParams = [], e !== void 0 && y(this, t, e), t;
        }
        internalBinaryRead(e, t, n, i) {
          let r = i != null ? i : this.create(), c = e.pos + t;
          for (; e.pos < c; ) {
            let [o, s] = e.tag();
            switch (o) {
              case 6:
                r.serviceTrackingParams.push(qe.internalBinaryRead(e, e.uint32(), n));
                break;
              default:
                let a = n.readUnknownField;
                if (a === "throw") throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);
                let u = e.skip(s);
                a !== false && (a === true ? d.onRead : a)(this.typeName, r, o, s, u);
            }
          }
          return r;
        }
        internalBinaryWrite(e, t, n) {
          for (let r = 0; r < e.serviceTrackingParams.length; r++) qe.internalBinaryWrite(e.serviceTrackingParams[r], t.tag(6, f.LengthDelimited).fork(), n).join();
          let i = n.writeUnknownFields;
          return i !== false && (i == true ? d.onWrite : i)(this.typeName, e, t), t;
        }
      }, $e = new ze(), Ze = class extends m {
        constructor() {
          super("youtube.component.ServiceTrackingParam", [{ no: 1, name: "service", kind: "scalar", T: 5 }, { no: 2, name: "params", kind: "message", repeat: 1, T: () => Ye }]);
        }
        create(e) {
          let t = globalThis.Object.create(this.messagePrototype);
          return t.service = 0, t.params = [], e !== void 0 && y(this, t, e), t;
        }
        internalBinaryRead(e, t, n, i) {
          let r = i != null ? i : this.create(), c = e.pos + t;
          for (; e.pos < c; ) {
            let [o, s] = e.tag();
            switch (o) {
              case 1:
                r.service = e.int32();
                break;
              case 2:
                r.params.push(Ye.internalBinaryRead(e, e.uint32(), n));
                break;
              default:
                let a = n.readUnknownField;
                if (a === "throw") throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);
                let u = e.skip(s);
                a !== false && (a === true ? d.onRead : a)(this.typeName, r, o, s, u);
            }
          }
          return r;
        }
        internalBinaryWrite(e, t, n) {
          e.service !== 0 && t.tag(1, f.Varint).int32(e.service);
          for (let r = 0; r < e.params.length; r++) Ye.internalBinaryWrite(e.params[r], t.tag(2, f.LengthDelimited).fork(), n).join();
          let i = n.writeUnknownFields;
          return i !== false && (i == true ? d.onWrite : i)(this.typeName, e, t), t;
        }
      }, qe = new Ze(), Qe = class extends m {
        constructor() {
          super("youtube.component.Param", [{ no: 1, name: "key", kind: "scalar", T: 9 }, { no: 2, name: "value", kind: "scalar", T: 9 }]);
        }
        create(e) {
          let t = globalThis.Object.create(this.messagePrototype);
          return t.key = "", t.value = "", e !== void 0 && y(this, t, e), t;
        }
        internalBinaryRead(e, t, n, i) {
          let r = i != null ? i : this.create(), c = e.pos + t;
          for (; e.pos < c; ) {
            let [o, s] = e.tag();
            switch (o) {
              case 1:
                r.key = e.string();
                break;
              case 2:
                r.value = e.string();
                break;
              default:
                let a = n.readUnknownField;
                if (a === "throw") throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);
                let u = e.skip(s);
                a !== false && (a === true ? d.onRead : a)(this.typeName, r, o, s, u);
            }
          }
          return r;
        }
        internalBinaryWrite(e, t, n) {
          e.key !== "" && t.tag(1, f.LengthDelimited).string(e.key), e.value !== "" && t.tag(2, f.LengthDelimited).string(e.value);
          let i = n.writeUnknownFields;
          return i !== false && (i == true ? d.onWrite : i)(this.typeName, e, t), t;
        }
      }, Ye = new Qe();
      var mt = class extends m {
        constructor() {
          super("youtube.response.browse.Browse", [{ no: 1, name: "responseContext", kind: "message", T: () => $e }, { no: 9, name: "content", kind: "message", T: () => E }, { no: 10, name: "onResponseReceivedAction", kind: "message", T: () => E }]);
        }
        create(e) {
          let t = globalThis.Object.create(this.messagePrototype);
          return e !== void 0 && y(this, t, e), t;
        }
        internalBinaryRead(e, t, n, i) {
          let r = i != null ? i : this.create(), c = e.pos + t;
          for (; e.pos < c; ) {
            let [o, s] = e.tag();
            switch (o) {
              case 1:
                r.responseContext = $e.internalBinaryRead(e, e.uint32(), n, r.responseContext);
                break;
              case 9:
                r.content = E.internalBinaryRead(e, e.uint32(), n, r.content);
                break;
              case 10:
                r.onResponseReceivedAction = E.internalBinaryRead(e, e.uint32(), n, r.onResponseReceivedAction);
                break;
              default:
                let a = n.readUnknownField;
                if (a === "throw") throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);
                let u = e.skip(s);
                a !== false && (a === true ? d.onRead : a)(this.typeName, r, o, s, u);
            }
          }
          return r;
        }
        internalBinaryWrite(e, t, n) {
          e.responseContext && $e.internalBinaryWrite(e.responseContext, t.tag(1, f.LengthDelimited).fork(), n).join(), e.content && E.internalBinaryWrite(e.content, t.tag(9, f.LengthDelimited).fork(), n).join(), e.onResponseReceivedAction && E.internalBinaryWrite(e.onResponseReceivedAction, t.tag(10, f.LengthDelimited).fork(), n).join();
          let i = n.writeUnknownFields;
          return i !== false && (i == true ? d.onWrite : i)(this.typeName, e, t), t;
        }
      }, qr = new mt(), gt = class extends m {
        constructor() {
          super("youtube.response.browse.Content", [{ no: 58173949, name: "singleColumnResultsRenderer", kind: "message", T: () => et2 }, { no: 153515154, name: "elementRenderer", kind: "message", T: () => ne }, { no: 49399797, name: "sectionListRenderer", kind: "message", T: () => Y }]);
        }
        create(e) {
          let t = globalThis.Object.create(this.messagePrototype);
          return e !== void 0 && y(this, t, e), t;
        }
        internalBinaryRead(e, t, n, i) {
          let r = i != null ? i : this.create(), c = e.pos + t;
          for (; e.pos < c; ) {
            let [o, s] = e.tag();
            switch (o) {
              case 58173949:
                r.singleColumnResultsRenderer = et2.internalBinaryRead(e, e.uint32(), n, r.singleColumnResultsRenderer);
                break;
              case 153515154:
                r.elementRenderer = ne.internalBinaryRead(e, e.uint32(), n, r.elementRenderer);
                break;
              case 49399797:
                r.sectionListRenderer = Y.internalBinaryRead(e, e.uint32(), n, r.sectionListRenderer);
                break;
              default:
                let a = n.readUnknownField;
                if (a === "throw") throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);
                let u = e.skip(s);
                a !== false && (a === true ? d.onRead : a)(this.typeName, r, o, s, u);
            }
          }
          return r;
        }
        internalBinaryWrite(e, t, n) {
          e.singleColumnResultsRenderer && et2.internalBinaryWrite(e.singleColumnResultsRenderer, t.tag(58173949, f.LengthDelimited).fork(), n).join(), e.elementRenderer && ne.internalBinaryWrite(e.elementRenderer, t.tag(153515154, f.LengthDelimited).fork(), n).join(), e.sectionListRenderer && Y.internalBinaryWrite(e.sectionListRenderer, t.tag(49399797, f.LengthDelimited).fork(), n).join();
          let i = n.writeUnknownFields;
          return i !== false && (i == true ? d.onWrite : i)(this.typeName, e, t), t;
        }
      }, E = new gt(), bt = class extends m {
        constructor() {
          super("youtube.response.browse.SingleColumnResultsRenderer", [{ no: 1, name: "tabs", kind: "message", repeat: 1, T: () => tt }]);
        }
        create(e) {
          let t = globalThis.Object.create(this.messagePrototype);
          return t.tabs = [], e !== void 0 && y(this, t, e), t;
        }
        internalBinaryRead(e, t, n, i) {
          let r = i != null ? i : this.create(), c = e.pos + t;
          for (; e.pos < c; ) {
            let [o, s] = e.tag();
            switch (o) {
              case 1:
                r.tabs.push(tt.internalBinaryRead(e, e.uint32(), n));
                break;
              default:
                let a = n.readUnknownField;
                if (a === "throw") throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);
                let u = e.skip(s);
                a !== false && (a === true ? d.onRead : a)(this.typeName, r, o, s, u);
            }
          }
          return r;
        }
        internalBinaryWrite(e, t, n) {
          for (let r = 0; r < e.tabs.length; r++) tt.internalBinaryWrite(e.tabs[r], t.tag(1, f.LengthDelimited).fork(), n).join();
          let i = n.writeUnknownFields;
          return i !== false && (i == true ? d.onWrite : i)(this.typeName, e, t), t;
        }
      }, et2 = new bt(), kt = class extends m {
        constructor() {
          super("youtube.response.browse.BrowseTabSupportedRenderer", [{ no: 58174010, name: "tabRenderer", kind: "message", T: () => nt }]);
        }
        create(e) {
          let t = globalThis.Object.create(this.messagePrototype);
          return e !== void 0 && y(this, t, e), t;
        }
        internalBinaryRead(e, t, n, i) {
          let r = i != null ? i : this.create(), c = e.pos + t;
          for (; e.pos < c; ) {
            let [o, s] = e.tag();
            switch (o) {
              case 58174010:
                r.tabRenderer = nt.internalBinaryRead(e, e.uint32(), n, r.tabRenderer);
                break;
              default:
                let a = n.readUnknownField;
                if (a === "throw") throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);
                let u = e.skip(s);
                a !== false && (a === true ? d.onRead : a)(this.typeName, r, o, s, u);
            }
          }
          return r;
        }
        internalBinaryWrite(e, t, n) {
          e.tabRenderer && nt.internalBinaryWrite(e.tabRenderer, t.tag(58174010, f.LengthDelimited).fork(), n).join();
          let i = n.writeUnknownFields;
          return i !== false && (i == true ? d.onWrite : i)(this.typeName, e, t), t;
        }
      }, tt = new kt(), Rt = class extends m {
        constructor() {
          super("youtube.response.browse.TabRenderer", [{ no: 4, name: "content", kind: "message", T: () => E }]);
        }
        create(e) {
          let t = globalThis.Object.create(this.messagePrototype);
          return e !== void 0 && y(this, t, e), t;
        }
        internalBinaryRead(e, t, n, i) {
          let r = i != null ? i : this.create(), c = e.pos + t;
          for (; e.pos < c; ) {
            let [o, s] = e.tag();
            switch (o) {
              case 4:
                r.content = E.internalBinaryRead(e, e.uint32(), n, r.content);
                break;
              default:
                let a = n.readUnknownField;
                if (a === "throw") throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);
                let u = e.skip(s);
                a !== false && (a === true ? d.onRead : a)(this.typeName, r, o, s, u);
            }
          }
          return r;
        }
        internalBinaryWrite(e, t, n) {
          e.content && E.internalBinaryWrite(e.content, t.tag(4, f.LengthDelimited).fork(), n).join();
          let i = n.writeUnknownFields;
          return i !== false && (i == true ? d.onWrite : i)(this.typeName, e, t), t;
        }
      }, nt = new Rt(), wt = class extends m {
        constructor() {
          super("youtube.response.browse.SectionListRenderer", [{ no: 1, name: "sectionListSupportedRenderers", kind: "message", repeat: 1, T: () => rt }]);
        }
        create(e) {
          let t = globalThis.Object.create(this.messagePrototype);
          return t.sectionListSupportedRenderers = [], e !== void 0 && y(this, t, e), t;
        }
        internalBinaryRead(e, t, n, i) {
          let r = i != null ? i : this.create(), c = e.pos + t;
          for (; e.pos < c; ) {
            let [o, s] = e.tag();
            switch (o) {
              case 1:
                r.sectionListSupportedRenderers.push(rt.internalBinaryRead(e, e.uint32(), n));
                break;
              default:
                let a = n.readUnknownField;
                if (a === "throw") throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);
                let u = e.skip(s);
                a !== false && (a === true ? d.onRead : a)(this.typeName, r, o, s, u);
            }
          }
          return r;
        }
        internalBinaryWrite(e, t, n) {
          for (let r = 0; r < e.sectionListSupportedRenderers.length; r++) rt.internalBinaryWrite(e.sectionListSupportedRenderers[r], t.tag(1, f.LengthDelimited).fork(), n).join();
          let i = n.writeUnknownFields;
          return i !== false && (i == true ? d.onWrite : i)(this.typeName, e, t), t;
        }
      }, Y = new wt(), Bt = class extends m {
        constructor() {
          super("youtube.response.browse.SectionListSupportedRenderer", [{ no: 50195462, name: "itemSectionRenderer", kind: "message", T: () => z }, { no: 51845067, name: "shelfRenderer", kind: "message", T: () => dt }, { no: 221496734, name: "musicDescriptionShelfRenderer", kind: "message", T: () => ht }]);
        }
        create(e) {
          let t = globalThis.Object.create(this.messagePrototype);
          return e !== void 0 && y(this, t, e), t;
        }
        internalBinaryRead(e, t, n, i) {
          let r = i != null ? i : this.create(), c = e.pos + t;
          for (; e.pos < c; ) {
            let [o, s] = e.tag();
            switch (o) {
              case 50195462:
                r.itemSectionRenderer = z.internalBinaryRead(e, e.uint32(), n, r.itemSectionRenderer);
                break;
              case 51845067:
                r.shelfRenderer = dt.internalBinaryRead(e, e.uint32(), n, r.shelfRenderer);
                break;
              case 221496734:
                r.musicDescriptionShelfRenderer = ht.internalBinaryRead(e, e.uint32(), n, r.musicDescriptionShelfRenderer);
                break;
              default:
                let a = n.readUnknownField;
                if (a === "throw") throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);
                let u = e.skip(s);
                a !== false && (a === true ? d.onRead : a)(this.typeName, r, o, s, u);
            }
          }
          return r;
        }
        internalBinaryWrite(e, t, n) {
          e.itemSectionRenderer && z.internalBinaryWrite(e.itemSectionRenderer, t.tag(50195462, f.LengthDelimited).fork(), n).join(), e.shelfRenderer && dt.internalBinaryWrite(e.shelfRenderer, t.tag(51845067, f.LengthDelimited).fork(), n).join(), e.musicDescriptionShelfRenderer && ht.internalBinaryWrite(e.musicDescriptionShelfRenderer, t.tag(221496734, f.LengthDelimited).fork(), n).join();
          let i = n.writeUnknownFields;
          return i !== false && (i == true ? d.onWrite : i)(this.typeName, e, t), t;
        }
      }, rt = new Bt(), It = class extends m {
        constructor() {
          super("youtube.response.browse.ItemSectionRenderer", [{ no: 1, name: "richItemContents", kind: "message", repeat: 1, T: () => te }]);
        }
        create(e) {
          let t = globalThis.Object.create(this.messagePrototype);
          return t.richItemContents = [], e !== void 0 && y(this, t, e), t;
        }
        internalBinaryRead(e, t, n, i) {
          let r = i != null ? i : this.create(), c = e.pos + t;
          for (; e.pos < c; ) {
            let [o, s] = e.tag();
            switch (o) {
              case 1:
                r.richItemContents.push(te.internalBinaryRead(e, e.uint32(), n));
                break;
              default:
                let a = n.readUnknownField;
                if (a === "throw") throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);
                let u = e.skip(s);
                a !== false && (a === true ? d.onRead : a)(this.typeName, r, o, s, u);
            }
          }
          return r;
        }
        internalBinaryWrite(e, t, n) {
          for (let r = 0; r < e.richItemContents.length; r++) te.internalBinaryWrite(e.richItemContents[r], t.tag(1, f.LengthDelimited).fork(), n).join();
          let i = n.writeUnknownFields;
          return i !== false && (i == true ? d.onWrite : i)(this.typeName, e, t), t;
        }
      }, z = new It(), Tt = class extends m {
        constructor() {
          super("youtube.response.browse.RichItemContent", [{ no: 153515154, name: "videoWithContextRenderer", kind: "message", T: () => ne }]);
        }
        create(e) {
          let t = globalThis.Object.create(this.messagePrototype);
          return e !== void 0 && y(this, t, e), t;
        }
        internalBinaryRead(e, t, n, i) {
          let r = i != null ? i : this.create(), c = e.pos + t;
          for (; e.pos < c; ) {
            let [o, s] = e.tag();
            switch (o) {
              case 153515154:
                r.videoWithContextRenderer = ne.internalBinaryRead(e, e.uint32(), n, r.videoWithContextRenderer);
                break;
              default:
                let a = n.readUnknownField;
                if (a === "throw") throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);
                let u = e.skip(s);
                a !== false && (a === true ? d.onRead : a)(this.typeName, r, o, s, u);
            }
          }
          return r;
        }
        internalBinaryWrite(e, t, n) {
          e.videoWithContextRenderer && ne.internalBinaryWrite(e.videoWithContextRenderer, t.tag(153515154, f.LengthDelimited).fork(), n).join();
          let i = n.writeUnknownFields;
          return i !== false && (i == true ? d.onWrite : i)(this.typeName, e, t), t;
        }
      }, te = new Tt(), Ct = class extends m {
        constructor() {
          super("youtube.response.browse.ElementRenderer", [{ no: 172660663, name: "videoRendererContent", kind: "message", T: () => it }]);
        }
        create(e) {
          let t = globalThis.Object.create(this.messagePrototype);
          return e !== void 0 && y(this, t, e), t;
        }
        internalBinaryRead(e, t, n, i) {
          let r = i != null ? i : this.create(), c = e.pos + t;
          for (; e.pos < c; ) {
            let [o, s] = e.tag();
            switch (o) {
              case 172660663:
                r.videoRendererContent = it.internalBinaryRead(e, e.uint32(), n, r.videoRendererContent);
                break;
              default:
                let a = n.readUnknownField;
                if (a === "throw") throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);
                let u = e.skip(s);
                a !== false && (a === true ? d.onRead : a)(this.typeName, r, o, s, u);
            }
          }
          return r;
        }
        internalBinaryWrite(e, t, n) {
          e.videoRendererContent && it.internalBinaryWrite(e.videoRendererContent, t.tag(172660663, f.LengthDelimited).fork(), n).join();
          let i = n.writeUnknownFields;
          return i !== false && (i == true ? d.onWrite : i)(this.typeName, e, t), t;
        }
      }, ne = new Ct(), xt = class extends m {
        constructor() {
          super("youtube.response.browse.VideoRendererContent", [{ no: 1, name: "videoInfo", kind: "message", T: () => at }, { no: 2, name: "renderInfo", kind: "message", T: () => ut }]);
        }
        create(e) {
          let t = globalThis.Object.create(this.messagePrototype);
          return e !== void 0 && y(this, t, e), t;
        }
        internalBinaryRead(e, t, n, i) {
          let r = i != null ? i : this.create(), c = e.pos + t;
          for (; e.pos < c; ) {
            let [o, s] = e.tag();
            switch (o) {
              case 1:
                r.videoInfo = at.internalBinaryRead(e, e.uint32(), n, r.videoInfo);
                break;
              case 2:
                r.renderInfo = ut.internalBinaryRead(e, e.uint32(), n, r.renderInfo);
                break;
              default:
                let a = n.readUnknownField;
                if (a === "throw") throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);
                let u = e.skip(s);
                a !== false && (a === true ? d.onRead : a)(this.typeName, r, o, s, u);
            }
          }
          return r;
        }
        internalBinaryWrite(e, t, n) {
          e.videoInfo && at.internalBinaryWrite(e.videoInfo, t.tag(1, f.LengthDelimited).fork(), n).join(), e.renderInfo && ut.internalBinaryWrite(e.renderInfo, t.tag(2, f.LengthDelimited).fork(), n).join();
          let i = n.writeUnknownFields;
          return i !== false && (i == true ? d.onWrite : i)(this.typeName, e, t), t;
        }
      }, it = new xt(), Wt = class extends m {
        constructor() {
          super("youtube.response.browse.VideoInfo", [{ no: 168777401, name: "videoContext", kind: "message", T: () => ot }]);
        }
        create(e) {
          let t = globalThis.Object.create(this.messagePrototype);
          return e !== void 0 && y(this, t, e), t;
        }
        internalBinaryRead(e, t, n, i) {
          let r = i != null ? i : this.create(), c = e.pos + t;
          for (; e.pos < c; ) {
            let [o, s] = e.tag();
            switch (o) {
              case 168777401:
                r.videoContext = ot.internalBinaryRead(e, e.uint32(), n, r.videoContext);
                break;
              default:
                let a = n.readUnknownField;
                if (a === "throw") throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);
                let u = e.skip(s);
                a !== false && (a === true ? d.onRead : a)(this.typeName, r, o, s, u);
            }
          }
          return r;
        }
        internalBinaryWrite(e, t, n) {
          e.videoContext && ot.internalBinaryWrite(e.videoContext, t.tag(168777401, f.LengthDelimited).fork(), n).join();
          let i = n.writeUnknownFields;
          return i !== false && (i == true ? d.onWrite : i)(this.typeName, e, t), t;
        }
      }, at = new Wt(), Nt = class extends m {
        constructor() {
          super("youtube.response.browse.VideoContext", [{ no: 5, name: "videoContent", kind: "message", T: () => st }]);
        }
        create(e) {
          let t = globalThis.Object.create(this.messagePrototype);
          return e !== void 0 && y(this, t, e), t;
        }
        internalBinaryRead(e, t, n, i) {
          let r = i != null ? i : this.create(), c = e.pos + t;
          for (; e.pos < c; ) {
            let [o, s] = e.tag();
            switch (o) {
              case 5:
                r.videoContent = st.internalBinaryRead(e, e.uint32(), n, r.videoContent);
                break;
              default:
                let a = n.readUnknownField;
                if (a === "throw") throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);
                let u = e.skip(s);
                a !== false && (a === true ? d.onRead : a)(this.typeName, r, o, s, u);
            }
          }
          return r;
        }
        internalBinaryWrite(e, t, n) {
          e.videoContent && st.internalBinaryWrite(e.videoContent, t.tag(5, f.LengthDelimited).fork(), n).join();
          let i = n.writeUnknownFields;
          return i !== false && (i == true ? d.onWrite : i)(this.typeName, e, t), t;
        }
      }, ot = new Nt(), St = class extends m {
        constructor() {
          super("youtube.response.browse.VideoContent", [{ no: 465160965, name: "timedLyricsRender", kind: "message", T: () => lt }]);
        }
        create(e) {
          let t = globalThis.Object.create(this.messagePrototype);
          return e !== void 0 && y(this, t, e), t;
        }
        internalBinaryRead(e, t, n, i) {
          let r = i != null ? i : this.create(), c = e.pos + t;
          for (; e.pos < c; ) {
            let [o, s] = e.tag();
            switch (o) {
              case 465160965:
                r.timedLyricsRender = lt.internalBinaryRead(e, e.uint32(), n, r.timedLyricsRender);
                break;
              default:
                let a = n.readUnknownField;
                if (a === "throw") throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);
                let u = e.skip(s);
                a !== false && (a === true ? d.onRead : a)(this.typeName, r, o, s, u);
            }
          }
          return r;
        }
        internalBinaryWrite(e, t, n) {
          e.timedLyricsRender && lt.internalBinaryWrite(e.timedLyricsRender, t.tag(465160965, f.LengthDelimited).fork(), n).join();
          let i = n.writeUnknownFields;
          return i !== false && (i == true ? d.onWrite : i)(this.typeName, e, t), t;
        }
      }, st = new St(), Ot = class extends m {
        constructor() {
          super("youtube.response.browse.TimedLyricsRender", [{ no: 4, name: "timedLyricsContent", kind: "message", T: () => ct }]);
        }
        create(e) {
          let t = globalThis.Object.create(this.messagePrototype);
          return e !== void 0 && y(this, t, e), t;
        }
        internalBinaryRead(e, t, n, i) {
          let r = i != null ? i : this.create(), c = e.pos + t;
          for (; e.pos < c; ) {
            let [o, s] = e.tag();
            switch (o) {
              case 4:
                r.timedLyricsContent = ct.internalBinaryRead(e, e.uint32(), n, r.timedLyricsContent);
                break;
              default:
                let a = n.readUnknownField;
                if (a === "throw") throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);
                let u = e.skip(s);
                a !== false && (a === true ? d.onRead : a)(this.typeName, r, o, s, u);
            }
          }
          return r;
        }
        internalBinaryWrite(e, t, n) {
          e.timedLyricsContent && ct.internalBinaryWrite(e.timedLyricsContent, t.tag(4, f.LengthDelimited).fork(), n).join();
          let i = n.writeUnknownFields;
          return i !== false && (i == true ? d.onWrite : i)(this.typeName, e, t), t;
        }
      }, lt = new Ot(), Pt = class extends m {
        constructor() {
          super("youtube.response.browse.TimedLyricsContent", [{ no: 1, name: "runs", kind: "message", repeat: 1, T: () => q }, { no: 2, name: "footerLabel", kind: "scalar", T: 9 }]);
        }
        create(e) {
          let t = globalThis.Object.create(this.messagePrototype);
          return t.runs = [], t.footerLabel = "", e !== void 0 && y(this, t, e), t;
        }
        internalBinaryRead(e, t, n, i) {
          let r = i != null ? i : this.create(), c = e.pos + t;
          for (; e.pos < c; ) {
            let [o, s] = e.tag();
            switch (o) {
              case 1:
                r.runs.push(q.internalBinaryRead(e, e.uint32(), n));
                break;
              case 2:
                r.footerLabel = e.string();
                break;
              default:
                let a = n.readUnknownField;
                if (a === "throw") throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);
                let u = e.skip(s);
                a !== false && (a === true ? d.onRead : a)(this.typeName, r, o, s, u);
            }
          }
          return r;
        }
        internalBinaryWrite(e, t, n) {
          for (let r = 0; r < e.runs.length; r++) q.internalBinaryWrite(e.runs[r], t.tag(1, f.LengthDelimited).fork(), n).join();
          e.footerLabel !== "" && t.tag(2, f.LengthDelimited).string(e.footerLabel);
          let i = n.writeUnknownFields;
          return i !== false && (i == true ? d.onWrite : i)(this.typeName, e, t), t;
        }
      }, ct = new Pt(), Ut = class extends m {
        constructor() {
          super("youtube.response.browse.RenderInfo", [{ no: 183314536, name: "layoutRender", kind: "message", T: () => ft }]);
        }
        create(e) {
          let t = globalThis.Object.create(this.messagePrototype);
          return e !== void 0 && y(this, t, e), t;
        }
        internalBinaryRead(e, t, n, i) {
          let r = i != null ? i : this.create(), c = e.pos + t;
          for (; e.pos < c; ) {
            let [o, s] = e.tag();
            switch (o) {
              case 183314536:
                r.layoutRender = ft.internalBinaryRead(e, e.uint32(), n, r.layoutRender);
                break;
              default:
                let a = n.readUnknownField;
                if (a === "throw") throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);
                let u = e.skip(s);
                a !== false && (a === true ? d.onRead : a)(this.typeName, r, o, s, u);
            }
          }
          return r;
        }
        internalBinaryWrite(e, t, n) {
          e.layoutRender && ft.internalBinaryWrite(e.layoutRender, t.tag(183314536, f.LengthDelimited).fork(), n).join();
          let i = n.writeUnknownFields;
          return i !== false && (i == true ? d.onWrite : i)(this.typeName, e, t), t;
        }
      }, ut = new Ut(), Et = class extends m {
        constructor() {
          super("youtube.response.browse.LayoutRender", [{ no: 1, name: "eml", kind: "scalar", T: 9 }]);
        }
        create(e) {
          let t = globalThis.Object.create(this.messagePrototype);
          return t.eml = "", e !== void 0 && y(this, t, e), t;
        }
        internalBinaryRead(e, t, n, i) {
          let r = i != null ? i : this.create(), c = e.pos + t;
          for (; e.pos < c; ) {
            let [o, s] = e.tag();
            switch (o) {
              case 1:
                r.eml = e.string();
                break;
              default:
                let a = n.readUnknownField;
                if (a === "throw") throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);
                let u = e.skip(s);
                a !== false && (a === true ? d.onRead : a)(this.typeName, r, o, s, u);
            }
          }
          return r;
        }
        internalBinaryWrite(e, t, n) {
          e.eml !== "" && t.tag(1, f.LengthDelimited).string(e.eml);
          let i = n.writeUnknownFields;
          return i !== false && (i == true ? d.onWrite : i)(this.typeName, e, t), t;
        }
      }, ft = new Et(), Ft = class extends m {
        constructor() {
          super("youtube.response.browse.ShelfRenderer", [{ no: 5, name: "richSectionContent", kind: "message", T: () => pt }]);
        }
        create(e) {
          let t = globalThis.Object.create(this.messagePrototype);
          return e !== void 0 && y(this, t, e), t;
        }
        internalBinaryRead(e, t, n, i) {
          let r = i != null ? i : this.create(), c = e.pos + t;
          for (; e.pos < c; ) {
            let [o, s] = e.tag();
            switch (o) {
              case 5:
                r.richSectionContent = pt.internalBinaryRead(e, e.uint32(), n, r.richSectionContent);
                break;
              default:
                let a = n.readUnknownField;
                if (a === "throw") throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);
                let u = e.skip(s);
                a !== false && (a === true ? d.onRead : a)(this.typeName, r, o, s, u);
            }
          }
          return r;
        }
        internalBinaryWrite(e, t, n) {
          e.richSectionContent && pt.internalBinaryWrite(e.richSectionContent, t.tag(5, f.LengthDelimited).fork(), n).join();
          let i = n.writeUnknownFields;
          return i !== false && (i == true ? d.onWrite : i)(this.typeName, e, t), t;
        }
      }, dt = new Ft(), Lt = class extends m {
        constructor() {
          super("youtube.response.browse.RichSectionContent", [{ no: 51431404, name: "reelShelfRenderer", kind: "message", T: () => yt }]);
        }
        create(e) {
          let t = globalThis.Object.create(this.messagePrototype);
          return e !== void 0 && y(this, t, e), t;
        }
        internalBinaryRead(e, t, n, i) {
          let r = i != null ? i : this.create(), c = e.pos + t;
          for (; e.pos < c; ) {
            let [o, s] = e.tag();
            switch (o) {
              case 51431404:
                r.reelShelfRenderer = yt.internalBinaryRead(e, e.uint32(), n, r.reelShelfRenderer);
                break;
              default:
                let a = n.readUnknownField;
                if (a === "throw") throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);
                let u = e.skip(s);
                a !== false && (a === true ? d.onRead : a)(this.typeName, r, o, s, u);
            }
          }
          return r;
        }
        internalBinaryWrite(e, t, n) {
          e.reelShelfRenderer && yt.internalBinaryWrite(e.reelShelfRenderer, t.tag(51431404, f.LengthDelimited).fork(), n).join();
          let i = n.writeUnknownFields;
          return i !== false && (i == true ? d.onWrite : i)(this.typeName, e, t), t;
        }
      }, pt = new Lt(), At = class extends m {
        constructor() {
          super("youtube.response.browse.ReelShelfRenderer", [{ no: 1, name: "richItemContents", kind: "message", repeat: 1, T: () => te }]);
        }
        create(e) {
          let t = globalThis.Object.create(this.messagePrototype);
          return t.richItemContents = [], e !== void 0 && y(this, t, e), t;
        }
        internalBinaryRead(e, t, n, i) {
          let r = i != null ? i : this.create(), c = e.pos + t;
          for (; e.pos < c; ) {
            let [o, s] = e.tag();
            switch (o) {
              case 1:
                r.richItemContents.push(te.internalBinaryRead(e, e.uint32(), n));
                break;
              default:
                let a = n.readUnknownField;
                if (a === "throw") throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);
                let u = e.skip(s);
                a !== false && (a === true ? d.onRead : a)(this.typeName, r, o, s, u);
            }
          }
          return r;
        }
        internalBinaryWrite(e, t, n) {
          for (let r = 0; r < e.richItemContents.length; r++) te.internalBinaryWrite(e.richItemContents[r], t.tag(1, f.LengthDelimited).fork(), n).join();
          let i = n.writeUnknownFields;
          return i !== false && (i == true ? d.onWrite : i)(this.typeName, e, t), t;
        }
      }, yt = new At(), Dt = class extends m {
        constructor() {
          super("youtube.response.browse.MusicDescriptionShelfRenderer", [{ no: 3, name: "description", kind: "message", T: () => W }, { no: 10, name: "footer", kind: "message", T: () => W }]);
        }
        create(e) {
          let t = globalThis.Object.create(this.messagePrototype);
          return e !== void 0 && y(this, t, e), t;
        }
        internalBinaryRead(e, t, n, i) {
          let r = i != null ? i : this.create(), c = e.pos + t;
          for (; e.pos < c; ) {
            let [o, s] = e.tag();
            switch (o) {
              case 3:
                r.description = W.internalBinaryRead(e, e.uint32(), n, r.description);
                break;
              case 10:
                r.footer = W.internalBinaryRead(e, e.uint32(), n, r.footer);
                break;
              default:
                let a = n.readUnknownField;
                if (a === "throw") throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);
                let u = e.skip(s);
                a !== false && (a === true ? d.onRead : a)(this.typeName, r, o, s, u);
            }
          }
          return r;
        }
        internalBinaryWrite(e, t, n) {
          e.description && W.internalBinaryWrite(e.description, t.tag(3, f.LengthDelimited).fork(), n).join(), e.footer && W.internalBinaryWrite(e.footer, t.tag(10, f.LengthDelimited).fork(), n).join();
          let i = n.writeUnknownFields;
          return i !== false && (i == true ? d.onWrite : i)(this.typeName, e, t), t;
        }
      }, ht = new Dt();
      var gs = g(h(), 1);
      var Vt = class extends m {
        constructor() {
          super("youtube.response.next.Next", [{ no: 7, name: "content", kind: "message", T: () => $t }, { no: 8, name: "onResponseReceivedAction", kind: "message", T: () => E }]);
        }
        create(e) {
          let t = globalThis.Object.create(this.messagePrototype);
          return e !== void 0 && y(this, t, e), t;
        }
        internalBinaryRead(e, t, n, i) {
          let r = i != null ? i : this.create(), c = e.pos + t;
          for (; e.pos < c; ) {
            let [o, s] = e.tag();
            switch (o) {
              case 7:
                r.content = $t.internalBinaryRead(e, e.uint32(), n, r.content);
                break;
              case 8:
                r.onResponseReceivedAction = E.internalBinaryRead(e, e.uint32(), n, r.onResponseReceivedAction);
                break;
              default:
                let a = n.readUnknownField;
                if (a === "throw") throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);
                let u = e.skip(s);
                a !== false && (a === true ? d.onRead : a)(this.typeName, r, o, s, u);
            }
          }
          return r;
        }
        internalBinaryWrite(e, t, n) {
          e.content && $t.internalBinaryWrite(e.content, t.tag(7, f.LengthDelimited).fork(), n).join(), e.onResponseReceivedAction && E.internalBinaryWrite(e.onResponseReceivedAction, t.tag(8, f.LengthDelimited).fork(), n).join();
          let i = n.writeUnknownFields;
          return i !== false && (i == true ? d.onWrite : i)(this.typeName, e, t), t;
        }
      }, re = new Vt(), Mt = class extends m {
        constructor() {
          super("youtube.response.next.Content", [{ no: 51779735, name: "nextResult", kind: "message", T: () => jt }]);
        }
        create(e) {
          let t = globalThis.Object.create(this.messagePrototype);
          return e !== void 0 && y(this, t, e), t;
        }
        internalBinaryRead(e, t, n, i) {
          let r = i != null ? i : this.create(), c = e.pos + t;
          for (; e.pos < c; ) {
            let [o, s] = e.tag();
            switch (o) {
              case 51779735:
                r.nextResult = jt.internalBinaryRead(e, e.uint32(), n, r.nextResult);
                break;
              default:
                let a = n.readUnknownField;
                if (a === "throw") throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);
                let u = e.skip(s);
                a !== false && (a === true ? d.onRead : a)(this.typeName, r, o, s, u);
            }
          }
          return r;
        }
        internalBinaryWrite(e, t, n) {
          e.nextResult && jt.internalBinaryWrite(e.nextResult, t.tag(51779735, f.LengthDelimited).fork(), n).join();
          let i = n.writeUnknownFields;
          return i !== false && (i == true ? d.onWrite : i)(this.typeName, e, t), t;
        }
      }, $t = new Mt(), vt = class extends m {
        constructor() {
          super("youtube.response.next.NextResult", [{ no: 1, name: "content", kind: "message", T: () => E }]);
        }
        create(e) {
          let t = globalThis.Object.create(this.messagePrototype);
          return e !== void 0 && y(this, t, e), t;
        }
        internalBinaryRead(e, t, n, i) {
          let r = i != null ? i : this.create(), c = e.pos + t;
          for (; e.pos < c; ) {
            let [o, s] = e.tag();
            switch (o) {
              case 1:
                r.content = E.internalBinaryRead(e, e.uint32(), n, r.content);
                break;
              default:
                let a = n.readUnknownField;
                if (a === "throw") throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);
                let u = e.skip(s);
                a !== false && (a === true ? d.onRead : a)(this.typeName, r, o, s, u);
            }
          }
          return r;
        }
        internalBinaryWrite(e, t, n) {
          e.content && E.internalBinaryWrite(e.content, t.tag(1, f.LengthDelimited).fork(), n).join();
          let i = n.writeUnknownFields;
          return i !== false && (i == true ? d.onWrite : i)(this.typeName, e, t), t;
        }
      }, jt = new vt();
      var xs = g(h(), 1);
      var Kt = class extends m {
        constructor() {
          super("youtube.response.search.Search", [{ no: 4, name: "content", kind: "message", T: () => E }, { no: 7, name: "onResponseReceivedCommand", kind: "message", T: () => Gt }]);
        }
        create(e) {
          let t = globalThis.Object.create(this.messagePrototype);
          return e !== void 0 && y(this, t, e), t;
        }
        internalBinaryRead(e, t, n, i) {
          let r = i != null ? i : this.create(), c = e.pos + t;
          for (; e.pos < c; ) {
            let [o, s] = e.tag();
            switch (o) {
              case 4:
                r.content = E.internalBinaryRead(e, e.uint32(), n, r.content);
                break;
              case 7:
                r.onResponseReceivedCommand = Gt.internalBinaryRead(e, e.uint32(), n, r.onResponseReceivedCommand);
                break;
              default:
                let a = n.readUnknownField;
                if (a === "throw") throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);
                let u = e.skip(s);
                a !== false && (a === true ? d.onRead : a)(this.typeName, r, o, s, u);
            }
          }
          return r;
        }
        internalBinaryWrite(e, t, n) {
          e.content && E.internalBinaryWrite(e.content, t.tag(4, f.LengthDelimited).fork(), n).join(), e.onResponseReceivedCommand && Gt.internalBinaryWrite(e.onResponseReceivedCommand, t.tag(7, f.LengthDelimited).fork(), n).join();
          let i = n.writeUnknownFields;
          return i !== false && (i == true ? d.onWrite : i)(this.typeName, e, t), t;
        }
      }, Yr = new Kt(), Ht = class extends m {
        constructor() {
          super("youtube.response.search.OnResponseReceivedCommand", [{ no: 50195462, name: "itemSectionRenderer", kind: "message", T: () => z }, { no: 49399797, name: "appendContinuationItemsAction", kind: "message", T: () => Y }]);
        }
        create(e) {
          let t = globalThis.Object.create(this.messagePrototype);
          return e !== void 0 && y(this, t, e), t;
        }
        internalBinaryRead(e, t, n, i) {
          let r = i != null ? i : this.create(), c = e.pos + t;
          for (; e.pos < c; ) {
            let [o, s] = e.tag();
            switch (o) {
              case 50195462:
                r.itemSectionRenderer = z.internalBinaryRead(e, e.uint32(), n, r.itemSectionRenderer);
                break;
              case 49399797:
                r.appendContinuationItemsAction = Y.internalBinaryRead(e, e.uint32(), n, r.appendContinuationItemsAction);
                break;
              default:
                let a = n.readUnknownField;
                if (a === "throw") throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);
                let u = e.skip(s);
                a !== false && (a === true ? d.onRead : a)(this.typeName, r, o, s, u);
            }
          }
          return r;
        }
        internalBinaryWrite(e, t, n) {
          e.itemSectionRenderer && z.internalBinaryWrite(e.itemSectionRenderer, t.tag(50195462, f.LengthDelimited).fork(), n).join(), e.appendContinuationItemsAction && Y.internalBinaryWrite(e.appendContinuationItemsAction, t.tag(49399797, f.LengthDelimited).fork(), n).join();
          let i = n.writeUnknownFields;
          return i !== false && (i == true ? d.onWrite : i)(this.typeName, e, t), t;
        }
      }, Gt = new Ht();
      var Us = g(h(), 1);
      var Zt = class extends m {
        constructor() {
          super("youtube.response.shorts.Shorts", [{ no: 2, name: "entries", kind: "message", repeat: 2, T: () => _t }]);
        }
        create(e) {
          let t = globalThis.Object.create(this.messagePrototype);
          return t.entries = [], e !== void 0 && y(this, t, e), t;
        }
        internalBinaryRead(e, t, n, i) {
          let r = i != null ? i : this.create(), c = e.pos + t;
          for (; e.pos < c; ) {
            let [o, s] = e.tag();
            switch (o) {
              case 2:
                r.entries.push(_t.internalBinaryRead(e, e.uint32(), n));
                break;
              default:
                let a = n.readUnknownField;
                if (a === "throw") throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);
                let u = e.skip(s);
                a !== false && (a === true ? d.onRead : a)(this.typeName, r, o, s, u);
            }
          }
          return r;
        }
        internalBinaryWrite(e, t, n) {
          for (let r = 0; r < e.entries.length; r++) _t.internalBinaryWrite(e.entries[r], t.tag(2, f.LengthDelimited).fork(), n).join();
          let i = n.writeUnknownFields;
          return i !== false && (i == true ? d.onWrite : i)(this.typeName, e, t), t;
        }
      }, zr = new Zt(), Qt = class extends m {
        constructor() {
          super("youtube.response.shorts.Entry", [{ no: 1, name: "command", kind: "message", T: () => Jt }]);
        }
        create(e) {
          let t = globalThis.Object.create(this.messagePrototype);
          return e !== void 0 && y(this, t, e), t;
        }
        internalBinaryRead(e, t, n, i) {
          let r = i != null ? i : this.create(), c = e.pos + t;
          for (; e.pos < c; ) {
            let [o, s] = e.tag();
            switch (o) {
              case 1:
                r.command = Jt.internalBinaryRead(e, e.uint32(), n, r.command);
                break;
              default:
                let a = n.readUnknownField;
                if (a === "throw") throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);
                let u = e.skip(s);
                a !== false && (a === true ? d.onRead : a)(this.typeName, r, o, s, u);
            }
          }
          return r;
        }
        internalBinaryWrite(e, t, n) {
          e.command && Jt.internalBinaryWrite(e.command, t.tag(1, f.LengthDelimited).fork(), n).join();
          let i = n.writeUnknownFields;
          return i !== false && (i == true ? d.onWrite : i)(this.typeName, e, t), t;
        }
      }, _t = new Qt(), en = class extends m {
        constructor() {
          super("youtube.response.shorts.Command", [{ no: 139608561, name: "reelWatchEndpoint", kind: "message", T: () => Xt }]);
        }
        create(e) {
          let t = globalThis.Object.create(this.messagePrototype);
          return e !== void 0 && y(this, t, e), t;
        }
        internalBinaryRead(e, t, n, i) {
          let r = i != null ? i : this.create(), c = e.pos + t;
          for (; e.pos < c; ) {
            let [o, s] = e.tag();
            switch (o) {
              case 139608561:
                r.reelWatchEndpoint = Xt.internalBinaryRead(e, e.uint32(), n, r.reelWatchEndpoint);
                break;
              default:
                let a = n.readUnknownField;
                if (a === "throw") throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);
                let u = e.skip(s);
                a !== false && (a === true ? d.onRead : a)(this.typeName, r, o, s, u);
            }
          }
          return r;
        }
        internalBinaryWrite(e, t, n) {
          e.reelWatchEndpoint && Xt.internalBinaryWrite(e.reelWatchEndpoint, t.tag(139608561, f.LengthDelimited).fork(), n).join();
          let i = n.writeUnknownFields;
          return i !== false && (i == true ? d.onWrite : i)(this.typeName, e, t), t;
        }
      }, Jt = new en(), tn = class extends m {
        constructor() {
          super("youtube.response.shorts.ReelWatchEndpoint", [{ no: 8, name: "overlay", kind: "message", T: () => Yt }, { no: 16, name: "adClientParams", kind: "message", T: () => qt }]);
        }
        create(e) {
          let t = globalThis.Object.create(this.messagePrototype);
          return e !== void 0 && y(this, t, e), t;
        }
        internalBinaryRead(e, t, n, i) {
          let r = i != null ? i : this.create(), c = e.pos + t;
          for (; e.pos < c; ) {
            let [o, s] = e.tag();
            switch (o) {
              case 8:
                r.overlay = Yt.internalBinaryRead(e, e.uint32(), n, r.overlay);
                break;
              case 16:
                r.adClientParams = qt.internalBinaryRead(e, e.uint32(), n, r.adClientParams);
                break;
              default:
                let a = n.readUnknownField;
                if (a === "throw") throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);
                let u = e.skip(s);
                a !== false && (a === true ? d.onRead : a)(this.typeName, r, o, s, u);
            }
          }
          return r;
        }
        internalBinaryWrite(e, t, n) {
          e.overlay && Yt.internalBinaryWrite(e.overlay, t.tag(8, f.LengthDelimited).fork(), n).join(), e.adClientParams && qt.internalBinaryWrite(e.adClientParams, t.tag(16, f.LengthDelimited).fork(), n).join();
          let i = n.writeUnknownFields;
          return i !== false && (i == true ? d.onWrite : i)(this.typeName, e, t), t;
        }
      }, Xt = new tn(), nn = class extends m {
        constructor() {
          super("youtube.response.shorts.AdClientParams", [{ no: 1, name: "isAd", kind: "scalar", T: 8 }]);
        }
        create(e) {
          let t = globalThis.Object.create(this.messagePrototype);
          return t.isAd = false, e !== void 0 && y(this, t, e), t;
        }
        internalBinaryRead(e, t, n, i) {
          let r = i != null ? i : this.create(), c = e.pos + t;
          for (; e.pos < c; ) {
            let [o, s] = e.tag();
            switch (o) {
              case 1:
                r.isAd = e.bool();
                break;
              default:
                let a = n.readUnknownField;
                if (a === "throw") throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);
                let u = e.skip(s);
                a !== false && (a === true ? d.onRead : a)(this.typeName, r, o, s, u);
            }
          }
          return r;
        }
        internalBinaryWrite(e, t, n) {
          e.isAd !== false && t.tag(1, f.Varint).bool(e.isAd);
          let i = n.writeUnknownFields;
          return i !== false && (i == true ? d.onWrite : i)(this.typeName, e, t), t;
        }
      }, qt = new nn(), rn = class extends m {
        constructor() {
          super("youtube.response.shorts.Overlay", [{ no: 139970731, name: "reelPlayerOverlayRenderer", kind: "message", T: () => zt }]);
        }
        create(e) {
          let t = globalThis.Object.create(this.messagePrototype);
          return e !== void 0 && y(this, t, e), t;
        }
        internalBinaryRead(e, t, n, i) {
          let r = i != null ? i : this.create(), c = e.pos + t;
          for (; e.pos < c; ) {
            let [o, s] = e.tag();
            switch (o) {
              case 139970731:
                r.reelPlayerOverlayRenderer = zt.internalBinaryRead(e, e.uint32(), n, r.reelPlayerOverlayRenderer);
                break;
              default:
                let a = n.readUnknownField;
                if (a === "throw") throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);
                let u = e.skip(s);
                a !== false && (a === true ? d.onRead : a)(this.typeName, r, o, s, u);
            }
          }
          return r;
        }
        internalBinaryWrite(e, t, n) {
          e.reelPlayerOverlayRenderer && zt.internalBinaryWrite(e.reelPlayerOverlayRenderer, t.tag(139970731, f.LengthDelimited).fork(), n).join();
          let i = n.writeUnknownFields;
          return i !== false && (i == true ? d.onWrite : i)(this.typeName, e, t), t;
        }
      }, Yt = new rn(), an = class extends m {
        constructor() {
          super("youtube.response.shorts.ReelPlayerOverlayRenderer", [{ no: 12, name: "style", kind: "scalar", T: 5 }]);
        }
        create(e) {
          let t = globalThis.Object.create(this.messagePrototype);
          return t.style = 0, e !== void 0 && y(this, t, e), t;
        }
        internalBinaryRead(e, t, n, i) {
          let r = i != null ? i : this.create(), c = e.pos + t;
          for (; e.pos < c; ) {
            let [o, s] = e.tag();
            switch (o) {
              case 12:
                r.style = e.int32();
                break;
              default:
                let a = n.readUnknownField;
                if (a === "throw") throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);
                let u = e.skip(s);
                a !== false && (a === true ? d.onRead : a)(this.typeName, r, o, s, u);
            }
          }
          return r;
        }
        internalBinaryWrite(e, t, n) {
          e.style !== 0 && t.tag(12, f.Varint).int32(e.style);
          let i = n.writeUnknownFields;
          return i !== false && (i == true ? d.onWrite : i)(this.typeName, e, t), t;
        }
      }, zt = new an();
      var $s = g(h(), 1);
      var ln2 = class extends m {
        constructor() {
          super("youtube.response.guide.Guide", [{ no: 4, name: "labelItems", kind: "message", repeat: 1, T: () => ie }, { no: 6, name: "iconItems", kind: "message", repeat: 1, T: () => ie }]);
        }
        create(e) {
          let t = globalThis.Object.create(this.messagePrototype);
          return t.labelItems = [], t.iconItems = [], e !== void 0 && y(this, t, e), t;
        }
        internalBinaryRead(e, t, n, i) {
          let r = i != null ? i : this.create(), c = e.pos + t;
          for (; e.pos < c; ) {
            let [o, s] = e.tag();
            switch (o) {
              case 4:
                r.labelItems.push(ie.internalBinaryRead(e, e.uint32(), n));
                break;
              case 6:
                r.iconItems.push(ie.internalBinaryRead(e, e.uint32(), n));
                break;
              default:
                let a = n.readUnknownField;
                if (a === "throw") throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);
                let u = e.skip(s);
                a !== false && (a === true ? d.onRead : a)(this.typeName, r, o, s, u);
            }
          }
          return r;
        }
        internalBinaryWrite(e, t, n) {
          for (let r = 0; r < e.labelItems.length; r++) ie.internalBinaryWrite(e.labelItems[r], t.tag(4, f.LengthDelimited).fork(), n).join();
          for (let r = 0; r < e.iconItems.length; r++) ie.internalBinaryWrite(e.iconItems[r], t.tag(6, f.LengthDelimited).fork(), n).join();
          let i = n.writeUnknownFields;
          return i !== false && (i == true ? d.onWrite : i)(this.typeName, e, t), t;
        }
      }, Zr = new ln2(), cn = class extends m {
        constructor() {
          super("youtube.response.guide.Item", [{ no: 117866661, name: "guideSectionRenderer", kind: "message", T: () => on }]);
        }
        create(e) {
          let t = globalThis.Object.create(this.messagePrototype);
          return e !== void 0 && y(this, t, e), t;
        }
        internalBinaryRead(e, t, n, i) {
          let r = i != null ? i : this.create(), c = e.pos + t;
          for (; e.pos < c; ) {
            let [o, s] = e.tag();
            switch (o) {
              case 117866661:
                r.guideSectionRenderer = on.internalBinaryRead(e, e.uint32(), n, r.guideSectionRenderer);
                break;
              default:
                let a = n.readUnknownField;
                if (a === "throw") throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);
                let u = e.skip(s);
                a !== false && (a === true ? d.onRead : a)(this.typeName, r, o, s, u);
            }
          }
          return r;
        }
        internalBinaryWrite(e, t, n) {
          e.guideSectionRenderer && on.internalBinaryWrite(e.guideSectionRenderer, t.tag(117866661, f.LengthDelimited).fork(), n).join();
          let i = n.writeUnknownFields;
          return i !== false && (i == true ? d.onWrite : i)(this.typeName, e, t), t;
        }
      }, ie = new cn(), un = class extends m {
        constructor() {
          super("youtube.response.guide.GuideSectionRenderer", [{ no: 1, name: "rendererItems", kind: "message", repeat: 1, T: () => sn }]);
        }
        create(e) {
          let t = globalThis.Object.create(this.messagePrototype);
          return t.rendererItems = [], e !== void 0 && y(this, t, e), t;
        }
        internalBinaryRead(e, t, n, i) {
          let r = i != null ? i : this.create(), c = e.pos + t;
          for (; e.pos < c; ) {
            let [o, s] = e.tag();
            switch (o) {
              case 1:
                r.rendererItems.push(sn.internalBinaryRead(e, e.uint32(), n));
                break;
              default:
                let a = n.readUnknownField;
                if (a === "throw") throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);
                let u = e.skip(s);
                a !== false && (a === true ? d.onRead : a)(this.typeName, r, o, s, u);
            }
          }
          return r;
        }
        internalBinaryWrite(e, t, n) {
          for (let r = 0; r < e.rendererItems.length; r++) sn.internalBinaryWrite(e.rendererItems[r], t.tag(1, f.LengthDelimited).fork(), n).join();
          let i = n.writeUnknownFields;
          return i !== false && (i == true ? d.onWrite : i)(this.typeName, e, t), t;
        }
      }, on = new un(), fn = class extends m {
        constructor() {
          super("youtube.response.guide.RendererItem", [{ no: 318370163, name: "iconRender", kind: "message", T: () => ae }, { no: 117501096, name: "labelRender", kind: "message", T: () => ae }]);
        }
        create(e) {
          let t = globalThis.Object.create(this.messagePrototype);
          return e !== void 0 && y(this, t, e), t;
        }
        internalBinaryRead(e, t, n, i) {
          let r = i != null ? i : this.create(), c = e.pos + t;
          for (; e.pos < c; ) {
            let [o, s] = e.tag();
            switch (o) {
              case 318370163:
                r.iconRender = ae.internalBinaryRead(e, e.uint32(), n, r.iconRender);
                break;
              case 117501096:
                r.labelRender = ae.internalBinaryRead(e, e.uint32(), n, r.labelRender);
                break;
              default:
                let a = n.readUnknownField;
                if (a === "throw") throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);
                let u = e.skip(s);
                a !== false && (a === true ? d.onRead : a)(this.typeName, r, o, s, u);
            }
          }
          return r;
        }
        internalBinaryWrite(e, t, n) {
          e.iconRender && ae.internalBinaryWrite(e.iconRender, t.tag(318370163, f.LengthDelimited).fork(), n).join(), e.labelRender && ae.internalBinaryWrite(e.labelRender, t.tag(117501096, f.LengthDelimited).fork(), n).join();
          let i = n.writeUnknownFields;
          return i !== false && (i == true ? d.onWrite : i)(this.typeName, e, t), t;
        }
      }, sn = new fn(), dn = class extends m {
        constructor() {
          super("youtube.response.guide.guideEntryRenderer", [{ no: 1, name: "browseId", kind: "scalar", T: 9 }]);
        }
        create(e) {
          let t = globalThis.Object.create(this.messagePrototype);
          return t.browseId = "", e !== void 0 && y(this, t, e), t;
        }
        internalBinaryRead(e, t, n, i) {
          let r = i != null ? i : this.create(), c = e.pos + t;
          for (; e.pos < c; ) {
            let [o, s] = e.tag();
            switch (o) {
              case 1:
                r.browseId = e.string();
                break;
              default:
                let a = n.readUnknownField;
                if (a === "throw") throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);
                let u = e.skip(s);
                a !== false && (a === true ? d.onRead : a)(this.typeName, r, o, s, u);
            }
          }
          return r;
        }
        internalBinaryWrite(e, t, n) {
          e.browseId !== "" && t.tag(1, f.LengthDelimited).string(e.browseId);
          let i = n.writeUnknownFields;
          return i !== false && (i == true ? d.onWrite : i)(this.typeName, e, t), t;
        }
      }, ae = new dn();
      var Hs = g(h(), 1);
      var Tn = class extends m {
        constructor() {
          super("youtube.response.player.Player", [{ no: 7, name: "adPlacements", kind: "message", repeat: 1, T: () => pn }, { no: 2, name: "playabilityStatus", kind: "message", T: () => hn }, { no: 9, name: "playbackTracking", kind: "message", T: () => bn }, { no: 10, name: "captions", kind: "message", T: () => kn }, { no: 68, name: "adSlots", kind: "message", repeat: 1, T: () => Bn }]);
        }
        create(e) {
          let t = globalThis.Object.create(this.messagePrototype);
          return t.adPlacements = [], t.adSlots = [], e !== void 0 && y(this, t, e), t;
        }
        internalBinaryRead(e, t, n, i) {
          let r = i != null ? i : this.create(), c = e.pos + t;
          for (; e.pos < c; ) {
            let [o, s] = e.tag();
            switch (o) {
              case 7:
                r.adPlacements.push(pn.internalBinaryRead(e, e.uint32(), n));
                break;
              case 2:
                r.playabilityStatus = hn.internalBinaryRead(e, e.uint32(), n, r.playabilityStatus);
                break;
              case 9:
                r.playbackTracking = bn.internalBinaryRead(e, e.uint32(), n, r.playbackTracking);
                break;
              case 10:
                r.captions = kn.internalBinaryRead(e, e.uint32(), n, r.captions);
                break;
              case 68:
                r.adSlots.push(Bn.internalBinaryRead(e, e.uint32(), n));
                break;
              default:
                let a = n.readUnknownField;
                if (a === "throw") throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);
                let u = e.skip(s);
                a !== false && (a === true ? d.onRead : a)(this.typeName, r, o, s, u);
            }
          }
          return r;
        }
        internalBinaryWrite(e, t, n) {
          for (let r = 0; r < e.adPlacements.length; r++) pn.internalBinaryWrite(e.adPlacements[r], t.tag(7, f.LengthDelimited).fork(), n).join();
          e.playabilityStatus && hn.internalBinaryWrite(e.playabilityStatus, t.tag(2, f.LengthDelimited).fork(), n).join(), e.playbackTracking && bn.internalBinaryWrite(e.playbackTracking, t.tag(9, f.LengthDelimited).fork(), n).join(), e.captions && kn.internalBinaryWrite(e.captions, t.tag(10, f.LengthDelimited).fork(), n).join();
          for (let r = 0; r < e.adSlots.length; r++) Bn.internalBinaryWrite(e.adSlots[r], t.tag(68, f.LengthDelimited).fork(), n).join();
          let i = n.writeUnknownFields;
          return i !== false && (i == true ? d.onWrite : i)(this.typeName, e, t), t;
        }
      }, oe = new Tn(), Cn = class extends m {
        constructor() {
          super("youtube.response.player.AdPlacement", [{ no: 84813246, name: "adPlacementRenderer", kind: "message", T: () => yn }]);
        }
        create(e) {
          let t = globalThis.Object.create(this.messagePrototype);
          return e !== void 0 && y(this, t, e), t;
        }
        internalBinaryRead(e, t, n, i) {
          let r = i != null ? i : this.create(), c = e.pos + t;
          for (; e.pos < c; ) {
            let [o, s] = e.tag();
            switch (o) {
              case 84813246:
                r.adPlacementRenderer = yn.internalBinaryRead(e, e.uint32(), n, r.adPlacementRenderer);
                break;
              default:
                let a = n.readUnknownField;
                if (a === "throw") throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);
                let u = e.skip(s);
                a !== false && (a === true ? d.onRead : a)(this.typeName, r, o, s, u);
            }
          }
          return r;
        }
        internalBinaryWrite(e, t, n) {
          e.adPlacementRenderer && yn.internalBinaryWrite(e.adPlacementRenderer, t.tag(84813246, f.LengthDelimited).fork(), n).join();
          let i = n.writeUnknownFields;
          return i !== false && (i == true ? d.onWrite : i)(this.typeName, e, t), t;
        }
      }, pn = new Cn(), xn = class extends m {
        constructor() {
          super("youtube.response.player.AdPlacementRenderer", [{ no: 4, name: "params", kind: "scalar", T: 9 }]);
        }
        create(e) {
          let t = globalThis.Object.create(this.messagePrototype);
          return t.params = "", e !== void 0 && y(this, t, e), t;
        }
        internalBinaryRead(e, t, n, i) {
          let r = i != null ? i : this.create(), c = e.pos + t;
          for (; e.pos < c; ) {
            let [o, s] = e.tag();
            switch (o) {
              case 4:
                r.params = e.string();
                break;
              default:
                let a = n.readUnknownField;
                if (a === "throw") throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);
                let u = e.skip(s);
                a !== false && (a === true ? d.onRead : a)(this.typeName, r, o, s, u);
            }
          }
          return r;
        }
        internalBinaryWrite(e, t, n) {
          e.params !== "" && t.tag(4, f.LengthDelimited).string(e.params);
          let i = n.writeUnknownFields;
          return i !== false && (i == true ? d.onWrite : i)(this.typeName, e, t), t;
        }
      }, yn = new xn(), Wn = class extends m {
        constructor() {
          super("youtube.response.player.PlayabilityStatus", [{ no: 21, name: "pictureInPictureRender", kind: "message", T: () => me }, { no: 11, name: "backgroundPlayerRender", kind: "message", T: () => ge }]);
        }
        create(e) {
          let t = globalThis.Object.create(this.messagePrototype);
          return e !== void 0 && y(this, t, e), t;
        }
        internalBinaryRead(e, t, n, i) {
          let r = i != null ? i : this.create(), c = e.pos + t;
          for (; e.pos < c; ) {
            let [o, s] = e.tag();
            switch (o) {
              case 21:
                r.pictureInPictureRender = me.internalBinaryRead(e, e.uint32(), n, r.pictureInPictureRender);
                break;
              case 11:
                r.backgroundPlayerRender = ge.internalBinaryRead(e, e.uint32(), n, r.backgroundPlayerRender);
                break;
              default:
                let a = n.readUnknownField;
                if (a === "throw") throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);
                let u = e.skip(s);
                a !== false && (a === true ? d.onRead : a)(this.typeName, r, o, s, u);
            }
          }
          return r;
        }
        internalBinaryWrite(e, t, n) {
          e.pictureInPictureRender && me.internalBinaryWrite(e.pictureInPictureRender, t.tag(21, f.LengthDelimited).fork(), n).join(), e.backgroundPlayerRender && ge.internalBinaryWrite(e.backgroundPlayerRender, t.tag(11, f.LengthDelimited).fork(), n).join();
          let i = n.writeUnknownFields;
          return i !== false && (i == true ? d.onWrite : i)(this.typeName, e, t), t;
        }
      }, hn = new Wn(), Nn = class extends m {
        constructor() {
          super("youtube.response.player.PictureInPictureSupportedRenderer", [{ no: 151635310, name: "pictureInPictureAbility", kind: "message", T: () => mn }]);
        }
        create(e) {
          let t = globalThis.Object.create(this.messagePrototype);
          return e !== void 0 && y(this, t, e), t;
        }
        internalBinaryRead(e, t, n, i) {
          let r = i != null ? i : this.create(), c = e.pos + t;
          for (; e.pos < c; ) {
            let [o, s] = e.tag();
            switch (o) {
              case 151635310:
                r.pictureInPictureAbility = mn.internalBinaryRead(e, e.uint32(), n, r.pictureInPictureAbility);
                break;
              default:
                let a = n.readUnknownField;
                if (a === "throw") throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);
                let u = e.skip(s);
                a !== false && (a === true ? d.onRead : a)(this.typeName, r, o, s, u);
            }
          }
          return r;
        }
        internalBinaryWrite(e, t, n) {
          e.pictureInPictureAbility && mn.internalBinaryWrite(e.pictureInPictureAbility, t.tag(151635310, f.LengthDelimited).fork(), n).join();
          let i = n.writeUnknownFields;
          return i !== false && (i == true ? d.onWrite : i)(this.typeName, e, t), t;
        }
      }, me = new Nn(), Sn = class extends m {
        constructor() {
          super("youtube.response.player.BackgroundSupportedRenderer", [{ no: 64657230, name: "backgroundAbility", kind: "message", T: () => gn }]);
        }
        create(e) {
          let t = globalThis.Object.create(this.messagePrototype);
          return e !== void 0 && y(this, t, e), t;
        }
        internalBinaryRead(e, t, n, i) {
          let r = i != null ? i : this.create(), c = e.pos + t;
          for (; e.pos < c; ) {
            let [o, s] = e.tag();
            switch (o) {
              case 64657230:
                r.backgroundAbility = gn.internalBinaryRead(e, e.uint32(), n, r.backgroundAbility);
                break;
              default:
                let a = n.readUnknownField;
                if (a === "throw") throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);
                let u = e.skip(s);
                a !== false && (a === true ? d.onRead : a)(this.typeName, r, o, s, u);
            }
          }
          return r;
        }
        internalBinaryWrite(e, t, n) {
          e.backgroundAbility && gn.internalBinaryWrite(e.backgroundAbility, t.tag(64657230, f.LengthDelimited).fork(), n).join();
          let i = n.writeUnknownFields;
          return i !== false && (i == true ? d.onWrite : i)(this.typeName, e, t), t;
        }
      }, ge = new Sn(), On = class extends m {
        constructor() {
          super("youtube.response.player.PictureInPictureAbility", [{ no: 1, name: "active", kind: "scalar", T: 8 }, { no: 4, name: "f4", kind: "scalar", T: 5 }, { no: 6, name: "f6", kind: "scalar", T: 5 }, { no: 8, name: "f8", kind: "scalar", T: 5 }]);
        }
        create(e) {
          let t = globalThis.Object.create(this.messagePrototype);
          return t.active = false, t.f4 = 0, t.f6 = 0, t.f8 = 0, e !== void 0 && y(this, t, e), t;
        }
        internalBinaryRead(e, t, n, i) {
          let r = i != null ? i : this.create(), c = e.pos + t;
          for (; e.pos < c; ) {
            let [o, s] = e.tag();
            switch (o) {
              case 1:
                r.active = e.bool();
                break;
              case 4:
                r.f4 = e.int32();
                break;
              case 6:
                r.f6 = e.int32();
                break;
              case 8:
                r.f8 = e.int32();
                break;
              default:
                let a = n.readUnknownField;
                if (a === "throw") throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);
                let u = e.skip(s);
                a !== false && (a === true ? d.onRead : a)(this.typeName, r, o, s, u);
            }
          }
          return r;
        }
        internalBinaryWrite(e, t, n) {
          e.active !== false && t.tag(1, f.Varint).bool(e.active), e.f4 !== 0 && t.tag(4, f.Varint).int32(e.f4), e.f6 !== 0 && t.tag(6, f.Varint).int32(e.f6), e.f8 !== 0 && t.tag(8, f.Varint).int32(e.f8);
          let i = n.writeUnknownFields;
          return i !== false && (i == true ? d.onWrite : i)(this.typeName, e, t), t;
        }
      }, mn = new On(), Pn = class extends m {
        constructor() {
          super("youtube.response.player.BackgroundAbility", [{ no: 1, name: "active", kind: "scalar", T: 8 }]);
        }
        create(e) {
          let t = globalThis.Object.create(this.messagePrototype);
          return t.active = false, e !== void 0 && y(this, t, e), t;
        }
        internalBinaryRead(e, t, n, i) {
          let r = i != null ? i : this.create(), c = e.pos + t;
          for (; e.pos < c; ) {
            let [o, s] = e.tag();
            switch (o) {
              case 1:
                r.active = e.bool();
                break;
              default:
                let a = n.readUnknownField;
                if (a === "throw") throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);
                let u = e.skip(s);
                a !== false && (a === true ? d.onRead : a)(this.typeName, r, o, s, u);
            }
          }
          return r;
        }
        internalBinaryWrite(e, t, n) {
          e.active !== false && t.tag(1, f.Varint).bool(e.active);
          let i = n.writeUnknownFields;
          return i !== false && (i == true ? d.onWrite : i)(this.typeName, e, t), t;
        }
      }, gn = new Pn(), Un = class extends m {
        constructor() {
          super("youtube.response.player.PlaybackTracking", [{ no: 1, name: "videostatsPlaybackUrl", kind: "message", T: () => P }, { no: 2, name: "videostatsDelayplayUrl", kind: "message", T: () => P }, { no: 3, name: "videostatsWatchtimeUrl", kind: "message", T: () => P }, { no: 4, name: "ptrackingUrl", kind: "message", T: () => P }, { no: 5, name: "qoeUrl", kind: "message", T: () => P }, { no: 13, name: "atrUrl", kind: "message", T: () => P }, { no: 15, name: "videostatsEngageUrl", kind: "message", T: () => P }, { no: 18, name: "pageadViewthroughconversion", kind: "message", T: () => P }]);
        }
        create(e) {
          let t = globalThis.Object.create(this.messagePrototype);
          return e !== void 0 && y(this, t, e), t;
        }
        internalBinaryRead(e, t, n, i) {
          let r = i != null ? i : this.create(), c = e.pos + t;
          for (; e.pos < c; ) {
            let [o, s] = e.tag();
            switch (o) {
              case 1:
                r.videostatsPlaybackUrl = P.internalBinaryRead(e, e.uint32(), n, r.videostatsPlaybackUrl);
                break;
              case 2:
                r.videostatsDelayplayUrl = P.internalBinaryRead(e, e.uint32(), n, r.videostatsDelayplayUrl);
                break;
              case 3:
                r.videostatsWatchtimeUrl = P.internalBinaryRead(e, e.uint32(), n, r.videostatsWatchtimeUrl);
                break;
              case 4:
                r.ptrackingUrl = P.internalBinaryRead(e, e.uint32(), n, r.ptrackingUrl);
                break;
              case 5:
                r.qoeUrl = P.internalBinaryRead(e, e.uint32(), n, r.qoeUrl);
                break;
              case 13:
                r.atrUrl = P.internalBinaryRead(e, e.uint32(), n, r.atrUrl);
                break;
              case 15:
                r.videostatsEngageUrl = P.internalBinaryRead(e, e.uint32(), n, r.videostatsEngageUrl);
                break;
              case 18:
                r.pageadViewthroughconversion = P.internalBinaryRead(e, e.uint32(), n, r.pageadViewthroughconversion);
                break;
              default:
                let a = n.readUnknownField;
                if (a === "throw") throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);
                let u = e.skip(s);
                a !== false && (a === true ? d.onRead : a)(this.typeName, r, o, s, u);
            }
          }
          return r;
        }
        internalBinaryWrite(e, t, n) {
          e.videostatsPlaybackUrl && P.internalBinaryWrite(e.videostatsPlaybackUrl, t.tag(1, f.LengthDelimited).fork(), n).join(), e.videostatsDelayplayUrl && P.internalBinaryWrite(e.videostatsDelayplayUrl, t.tag(2, f.LengthDelimited).fork(), n).join(), e.videostatsWatchtimeUrl && P.internalBinaryWrite(e.videostatsWatchtimeUrl, t.tag(3, f.LengthDelimited).fork(), n).join(), e.ptrackingUrl && P.internalBinaryWrite(e.ptrackingUrl, t.tag(4, f.LengthDelimited).fork(), n).join(), e.qoeUrl && P.internalBinaryWrite(e.qoeUrl, t.tag(5, f.LengthDelimited).fork(), n).join(), e.atrUrl && P.internalBinaryWrite(e.atrUrl, t.tag(13, f.LengthDelimited).fork(), n).join(), e.videostatsEngageUrl && P.internalBinaryWrite(e.videostatsEngageUrl, t.tag(15, f.LengthDelimited).fork(), n).join(), e.pageadViewthroughconversion && P.internalBinaryWrite(e.pageadViewthroughconversion, t.tag(18, f.LengthDelimited).fork(), n).join();
          let i = n.writeUnknownFields;
          return i !== false && (i == true ? d.onWrite : i)(this.typeName, e, t), t;
        }
      }, bn = new Un(), En = class extends m {
        constructor() {
          super("youtube.response.player.Tracking", [{ no: 1, name: "baseUrl", kind: "scalar", T: 9 }]);
        }
        create(e) {
          let t = globalThis.Object.create(this.messagePrototype);
          return t.baseUrl = "", e !== void 0 && y(this, t, e), t;
        }
        internalBinaryRead(e, t, n, i) {
          let r = i != null ? i : this.create(), c = e.pos + t;
          for (; e.pos < c; ) {
            let [o, s] = e.tag();
            switch (o) {
              case 1:
                r.baseUrl = e.string();
                break;
              default:
                let a = n.readUnknownField;
                if (a === "throw") throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);
                let u = e.skip(s);
                a !== false && (a === true ? d.onRead : a)(this.typeName, r, o, s, u);
            }
          }
          return r;
        }
        internalBinaryWrite(e, t, n) {
          e.baseUrl !== "" && t.tag(1, f.LengthDelimited).string(e.baseUrl);
          let i = n.writeUnknownFields;
          return i !== false && (i == true ? d.onWrite : i)(this.typeName, e, t), t;
        }
      }, P = new En(), Fn = class extends m {
        constructor() {
          super("youtube.response.player.Captions", [{ no: 51621377, name: "playerCaptionsTrackListRenderer", kind: "message", jsonName: "playerCaptionsTracklistRenderer", T: () => Rn }]);
        }
        create(e) {
          let t = globalThis.Object.create(this.messagePrototype);
          return e !== void 0 && y(this, t, e), t;
        }
        internalBinaryRead(e, t, n, i) {
          let r = i != null ? i : this.create(), c = e.pos + t;
          for (; e.pos < c; ) {
            let [o, s] = e.tag();
            switch (o) {
              case 51621377:
                r.playerCaptionsTrackListRenderer = Rn.internalBinaryRead(e, e.uint32(), n, r.playerCaptionsTrackListRenderer);
                break;
              default:
                let a = n.readUnknownField;
                if (a === "throw") throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);
                let u = e.skip(s);
                a !== false && (a === true ? d.onRead : a)(this.typeName, r, o, s, u);
            }
          }
          return r;
        }
        internalBinaryWrite(e, t, n) {
          e.playerCaptionsTrackListRenderer && Rn.internalBinaryWrite(e.playerCaptionsTrackListRenderer, t.tag(51621377, f.LengthDelimited).fork(), n).join();
          let i = n.writeUnknownFields;
          return i !== false && (i == true ? d.onWrite : i)(this.typeName, e, t), t;
        }
      }, kn = new Fn(), Ln = class extends m {
        constructor() {
          super("youtube.response.player.PlayerCaptionsTrackListRenderer", [{ no: 1, name: "captionTracks", kind: "message", repeat: 1, T: () => be }, { no: 2, name: "audioTracks", kind: "message", repeat: 1, T: () => wn }, { no: 3, name: "translationLanguages", kind: "message", repeat: 1, T: () => ke }, { no: 4, name: "defaultAudioTrackIndex", kind: "scalar", opt: true, T: 5 }, { no: 6, name: "defaultCaptionTrackIndex", kind: "scalar", opt: true, T: 5 }]);
        }
        create(e) {
          let t = globalThis.Object.create(this.messagePrototype);
          return t.captionTracks = [], t.audioTracks = [], t.translationLanguages = [], e !== void 0 && y(this, t, e), t;
        }
        internalBinaryRead(e, t, n, i) {
          let r = i != null ? i : this.create(), c = e.pos + t;
          for (; e.pos < c; ) {
            let [o, s] = e.tag();
            switch (o) {
              case 1:
                r.captionTracks.push(be.internalBinaryRead(e, e.uint32(), n));
                break;
              case 2:
                r.audioTracks.push(wn.internalBinaryRead(e, e.uint32(), n));
                break;
              case 3:
                r.translationLanguages.push(ke.internalBinaryRead(e, e.uint32(), n));
                break;
              case 4:
                r.defaultAudioTrackIndex = e.int32();
                break;
              case 6:
                r.defaultCaptionTrackIndex = e.int32();
                break;
              default:
                let a = n.readUnknownField;
                if (a === "throw") throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);
                let u = e.skip(s);
                a !== false && (a === true ? d.onRead : a)(this.typeName, r, o, s, u);
            }
          }
          return r;
        }
        internalBinaryWrite(e, t, n) {
          for (let r = 0; r < e.captionTracks.length; r++) be.internalBinaryWrite(e.captionTracks[r], t.tag(1, f.LengthDelimited).fork(), n).join();
          for (let r = 0; r < e.audioTracks.length; r++) wn.internalBinaryWrite(e.audioTracks[r], t.tag(2, f.LengthDelimited).fork(), n).join();
          for (let r = 0; r < e.translationLanguages.length; r++) ke.internalBinaryWrite(e.translationLanguages[r], t.tag(3, f.LengthDelimited).fork(), n).join();
          e.defaultAudioTrackIndex !== void 0 && t.tag(4, f.Varint).int32(e.defaultAudioTrackIndex), e.defaultCaptionTrackIndex !== void 0 && t.tag(6, f.Varint).int32(e.defaultCaptionTrackIndex);
          let i = n.writeUnknownFields;
          return i !== false && (i == true ? d.onWrite : i)(this.typeName, e, t), t;
        }
      }, Rn = new Ln(), An = class extends m {
        constructor() {
          super("youtube.response.player.CaptionTrack", [{ no: 1, name: "baseUrl", kind: "scalar", T: 9 }, { no: 2, name: "name", kind: "message", T: () => W }, { no: 3, name: "vssId", kind: "scalar", T: 9 }, { no: 4, name: "languageCode", kind: "scalar", T: 9 }, { no: 5, name: "kind", kind: "scalar", opt: true, T: 9 }, { no: 6, name: "rtl", kind: "scalar", opt: true, T: 8 }, { no: 7, name: "isTranslatable", kind: "scalar", T: 8 }]);
        }
        create(e) {
          let t = globalThis.Object.create(this.messagePrototype);
          return t.baseUrl = "", t.vssId = "", t.languageCode = "", t.isTranslatable = false, e !== void 0 && y(this, t, e), t;
        }
        internalBinaryRead(e, t, n, i) {
          let r = i != null ? i : this.create(), c = e.pos + t;
          for (; e.pos < c; ) {
            let [o, s] = e.tag();
            switch (o) {
              case 1:
                r.baseUrl = e.string();
                break;
              case 2:
                r.name = W.internalBinaryRead(e, e.uint32(), n, r.name);
                break;
              case 3:
                r.vssId = e.string();
                break;
              case 4:
                r.languageCode = e.string();
                break;
              case 5:
                r.kind = e.string();
                break;
              case 6:
                r.rtl = e.bool();
                break;
              case 7:
                r.isTranslatable = e.bool();
                break;
              default:
                let a = n.readUnknownField;
                if (a === "throw") throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);
                let u = e.skip(s);
                a !== false && (a === true ? d.onRead : a)(this.typeName, r, o, s, u);
            }
          }
          return r;
        }
        internalBinaryWrite(e, t, n) {
          e.baseUrl !== "" && t.tag(1, f.LengthDelimited).string(e.baseUrl), e.name && W.internalBinaryWrite(e.name, t.tag(2, f.LengthDelimited).fork(), n).join(), e.vssId !== "" && t.tag(3, f.LengthDelimited).string(e.vssId), e.languageCode !== "" && t.tag(4, f.LengthDelimited).string(e.languageCode), e.kind !== void 0 && t.tag(5, f.LengthDelimited).string(e.kind), e.rtl !== void 0 && t.tag(6, f.Varint).bool(e.rtl), e.isTranslatable !== false && t.tag(7, f.Varint).bool(e.isTranslatable);
          let i = n.writeUnknownFields;
          return i !== false && (i == true ? d.onWrite : i)(this.typeName, e, t), t;
        }
      }, be = new An(), Dn = class extends m {
        constructor() {
          super("youtube.response.player.AudioTrack", [{ no: 2, name: "captionTrackIndices", kind: "scalar", repeat: 2, T: 5 }, { no: 3, name: "defaultCaptionTrackIndex", kind: "scalar", opt: true, T: 5 }, { no: 4, name: "forcedCaptionTrackIndex", kind: "scalar", opt: true, T: 5 }, { no: 5, name: "visibility", kind: "scalar", opt: true, T: 5 }, { no: 6, name: "hasDefaultTrack", kind: "scalar", opt: true, T: 8 }, { no: 7, name: "hasForcedTrack", kind: "scalar", opt: true, T: 8 }, { no: 8, name: "audioTrackId", kind: "scalar", opt: true, T: 9 }, { no: 11, name: "captionsInitialState", kind: "scalar", opt: true, T: 5 }]);
        }
        create(e) {
          let t = globalThis.Object.create(this.messagePrototype);
          return t.captionTrackIndices = [], e !== void 0 && y(this, t, e), t;
        }
        internalBinaryRead(e, t, n, i) {
          let r = i != null ? i : this.create(), c = e.pos + t;
          for (; e.pos < c; ) {
            let [o, s] = e.tag();
            switch (o) {
              case 2:
                if (s === f.LengthDelimited) for (let B = e.int32() + e.pos; e.pos < B; ) r.captionTrackIndices.push(e.int32());
                else r.captionTrackIndices.push(e.int32());
                break;
              case 3:
                r.defaultCaptionTrackIndex = e.int32();
                break;
              case 4:
                r.forcedCaptionTrackIndex = e.int32();
                break;
              case 5:
                r.visibility = e.int32();
                break;
              case 6:
                r.hasDefaultTrack = e.bool();
                break;
              case 7:
                r.hasForcedTrack = e.bool();
                break;
              case 8:
                r.audioTrackId = e.string();
                break;
              case 11:
                r.captionsInitialState = e.int32();
                break;
              default:
                let a = n.readUnknownField;
                if (a === "throw") throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);
                let u = e.skip(s);
                a !== false && (a === true ? d.onRead : a)(this.typeName, r, o, s, u);
            }
          }
          return r;
        }
        internalBinaryWrite(e, t, n) {
          for (let r = 0; r < e.captionTrackIndices.length; r++) t.tag(2, f.Varint).int32(e.captionTrackIndices[r]);
          e.defaultCaptionTrackIndex !== void 0 && t.tag(3, f.Varint).int32(e.defaultCaptionTrackIndex), e.forcedCaptionTrackIndex !== void 0 && t.tag(4, f.Varint).int32(e.forcedCaptionTrackIndex), e.visibility !== void 0 && t.tag(5, f.Varint).int32(e.visibility), e.hasDefaultTrack !== void 0 && t.tag(6, f.Varint).bool(e.hasDefaultTrack), e.hasForcedTrack !== void 0 && t.tag(7, f.Varint).bool(e.hasForcedTrack), e.audioTrackId !== void 0 && t.tag(8, f.LengthDelimited).string(e.audioTrackId), e.captionsInitialState !== void 0 && t.tag(11, f.Varint).int32(e.captionsInitialState);
          let i = n.writeUnknownFields;
          return i !== false && (i == true ? d.onWrite : i)(this.typeName, e, t), t;
        }
      }, wn = new Dn(), $n = class extends m {
        constructor() {
          super("youtube.response.player.TranslationLanguage", [{ no: 1, name: "languageCode", kind: "scalar", T: 9 }, { no: 2, name: "languageName", kind: "message", T: () => W }]);
        }
        create(e) {
          let t = globalThis.Object.create(this.messagePrototype);
          return t.languageCode = "", e !== void 0 && y(this, t, e), t;
        }
        internalBinaryRead(e, t, n, i) {
          let r = i != null ? i : this.create(), c = e.pos + t;
          for (; e.pos < c; ) {
            let [o, s] = e.tag();
            switch (o) {
              case 1:
                r.languageCode = e.string();
                break;
              case 2:
                r.languageName = W.internalBinaryRead(e, e.uint32(), n, r.languageName);
                break;
              default:
                let a = n.readUnknownField;
                if (a === "throw") throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);
                let u = e.skip(s);
                a !== false && (a === true ? d.onRead : a)(this.typeName, r, o, s, u);
            }
          }
          return r;
        }
        internalBinaryWrite(e, t, n) {
          e.languageCode !== "" && t.tag(1, f.LengthDelimited).string(e.languageCode), e.languageName && W.internalBinaryWrite(e.languageName, t.tag(2, f.LengthDelimited).fork(), n).join();
          let i = n.writeUnknownFields;
          return i !== false && (i == true ? d.onWrite : i)(this.typeName, e, t), t;
        }
      }, ke = new $n(), jn = class extends m {
        constructor() {
          super("youtube.response.player.AdSlot", [{ no: 424701016, name: "render", kind: "message", T: () => In }]);
        }
        create(e) {
          let t = globalThis.Object.create(this.messagePrototype);
          return e !== void 0 && y(this, t, e), t;
        }
        internalBinaryRead(e, t, n, i) {
          let r = i != null ? i : this.create(), c = e.pos + t;
          for (; e.pos < c; ) {
            let [o, s] = e.tag();
            switch (o) {
              case 424701016:
                r.render = In.internalBinaryRead(e, e.uint32(), n, r.render);
                break;
              default:
                let a = n.readUnknownField;
                if (a === "throw") throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);
                let u = e.skip(s);
                a !== false && (a === true ? d.onRead : a)(this.typeName, r, o, s, u);
            }
          }
          return r;
        }
        internalBinaryWrite(e, t, n) {
          e.render && In.internalBinaryWrite(e.render, t.tag(424701016, f.LengthDelimited).fork(), n).join();
          let i = n.writeUnknownFields;
          return i !== false && (i == true ? d.onWrite : i)(this.typeName, e, t), t;
        }
      }, Bn = new jn(), Vn = class extends m {
        constructor() {
          super("youtube.response.player.AdSlot.Render", []);
        }
        create(e) {
          let t = globalThis.Object.create(this.messagePrototype);
          return e !== void 0 && y(this, t, e), t;
        }
        internalBinaryRead(e, t, n, i) {
          return i != null ? i : this.create();
        }
        internalBinaryWrite(e, t, n) {
          let i = n.writeUnknownFields;
          return i !== false && (i == true ? d.onWrite : i)(this.typeName, e, t), t;
        }
      }, In = new Vn();
      var Zs = g(h(), 1);
      var Jn = class extends m {
        constructor() {
          super("youtube.response.setting.Setting", [{ no: 6, name: "settingItems", kind: "message", repeat: 1, T: () => _ }, { no: 7, name: "CollectionItems", kind: "message", jsonName: "CollectionItems", repeat: 1, T: () => _ }]);
        }
        create(e) {
          let t = globalThis.Object.create(this.messagePrototype);
          return t.settingItems = [], t.collectionItems = [], e !== void 0 && y(this, t, e), t;
        }
        internalBinaryRead(e, t, n, i) {
          let r = i != null ? i : this.create(), c = e.pos + t;
          for (; e.pos < c; ) {
            let [o, s] = e.tag();
            switch (o) {
              case 6:
                r.settingItems.push(_.internalBinaryRead(e, e.uint32(), n));
                break;
              case 7:
                r.collectionItems.push(_.internalBinaryRead(e, e.uint32(), n));
                break;
              default:
                let a = n.readUnknownField;
                if (a === "throw") throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);
                let u = e.skip(s);
                a !== false && (a === true ? d.onRead : a)(this.typeName, r, o, s, u);
            }
          }
          return r;
        }
        internalBinaryWrite(e, t, n) {
          for (let r = 0; r < e.settingItems.length; r++) _.internalBinaryWrite(e.settingItems[r], t.tag(6, f.LengthDelimited).fork(), n).join();
          for (let r = 0; r < e.collectionItems.length; r++) _.internalBinaryWrite(e.collectionItems[r], t.tag(7, f.LengthDelimited).fork(), n).join();
          let i = n.writeUnknownFields;
          return i !== false && (i == true ? d.onWrite : i)(this.typeName, e, t), t;
        }
      }, Qr = new Jn(), Xn = class extends m {
        constructor() {
          super("youtube.response.setting.SettingItem", [{ no: 88478200, name: "backgroundPlayBackSettingRenderer", kind: "message", T: () => Mn }, { no: 66930374, name: "settingCategoryCollectionRenderer", kind: "message", T: () => vn }]);
        }
        create(e) {
          let t = globalThis.Object.create(this.messagePrototype);
          return e !== void 0 && y(this, t, e), t;
        }
        internalBinaryRead(e, t, n, i) {
          let r = i != null ? i : this.create(), c = e.pos + t;
          for (; e.pos < c; ) {
            let [o, s] = e.tag();
            switch (o) {
              case 88478200:
                r.backgroundPlayBackSettingRenderer = Mn.internalBinaryRead(e, e.uint32(), n, r.backgroundPlayBackSettingRenderer);
                break;
              case 66930374:
                r.settingCategoryCollectionRenderer = vn.internalBinaryRead(e, e.uint32(), n, r.settingCategoryCollectionRenderer);
                break;
              default:
                let a = n.readUnknownField;
                if (a === "throw") throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);
                let u = e.skip(s);
                a !== false && (a === true ? d.onRead : a)(this.typeName, r, o, s, u);
            }
          }
          return r;
        }
        internalBinaryWrite(e, t, n) {
          e.backgroundPlayBackSettingRenderer && Mn.internalBinaryWrite(e.backgroundPlayBackSettingRenderer, t.tag(88478200, f.LengthDelimited).fork(), n).join(), e.settingCategoryCollectionRenderer && vn.internalBinaryWrite(e.settingCategoryCollectionRenderer, t.tag(66930374, f.LengthDelimited).fork(), n).join();
          let i = n.writeUnknownFields;
          return i !== false && (i == true ? d.onWrite : i)(this.typeName, e, t), t;
        }
      }, _ = new Xn(), qn = class extends m {
        constructor() {
          super("youtube.response.setting.BackgroundPlayBackSettingRenderer", [{ no: 1, name: "name", kind: "message", T: () => W }, { no: 2, name: "backgroundPlayback", kind: "scalar", T: 8 }, { no: 3, name: "download", kind: "scalar", T: 8 }, { no: 5, name: "trackingParams", kind: "scalar", T: 12 }, { no: 9, name: "downloadQualitySelection", kind: "scalar", T: 8 }, { no: 10, name: "smartDownload", kind: "scalar", T: 8 }, { no: 14, name: "icon", kind: "message", T: () => le }]);
        }
        create(e) {
          let t = globalThis.Object.create(this.messagePrototype);
          return t.backgroundPlayback = false, t.download = false, t.trackingParams = new Uint8Array(0), t.downloadQualitySelection = false, t.smartDownload = false, e !== void 0 && y(this, t, e), t;
        }
        internalBinaryRead(e, t, n, i) {
          let r = i != null ? i : this.create(), c = e.pos + t;
          for (; e.pos < c; ) {
            let [o, s] = e.tag();
            switch (o) {
              case 1:
                r.name = W.internalBinaryRead(e, e.uint32(), n, r.name);
                break;
              case 2:
                r.backgroundPlayback = e.bool();
                break;
              case 3:
                r.download = e.bool();
                break;
              case 5:
                r.trackingParams = e.bytes();
                break;
              case 9:
                r.downloadQualitySelection = e.bool();
                break;
              case 10:
                r.smartDownload = e.bool();
                break;
              case 14:
                r.icon = le.internalBinaryRead(e, e.uint32(), n, r.icon);
                break;
              default:
                let a = n.readUnknownField;
                if (a === "throw") throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);
                let u = e.skip(s);
                a !== false && (a === true ? d.onRead : a)(this.typeName, r, o, s, u);
            }
          }
          return r;
        }
        internalBinaryWrite(e, t, n) {
          e.name && W.internalBinaryWrite(e.name, t.tag(1, f.LengthDelimited).fork(), n).join(), e.backgroundPlayback !== false && t.tag(2, f.Varint).bool(e.backgroundPlayback), e.download !== false && t.tag(3, f.Varint).bool(e.download), e.trackingParams.length && t.tag(5, f.LengthDelimited).bytes(e.trackingParams), e.downloadQualitySelection !== false && t.tag(9, f.Varint).bool(e.downloadQualitySelection), e.smartDownload !== false && t.tag(10, f.Varint).bool(e.smartDownload), e.icon && le.internalBinaryWrite(e.icon, t.tag(14, f.LengthDelimited).fork(), n).join();
          let i = n.writeUnknownFields;
          return i !== false && (i == true ? d.onWrite : i)(this.typeName, e, t), t;
        }
      }, Mn = new qn(), Yn = class extends m {
        constructor() {
          super("youtube.response.setting.SettingCategoryCollectionRenderer", [{ no: 2, name: "name", kind: "message", T: () => W }, { no: 3, name: "subSettings", kind: "message", repeat: 1, T: () => Re }, { no: 4, name: "categoryId", kind: "scalar", T: 5 }, { no: 5, name: "icon", kind: "message", T: () => le }]);
        }
        create(e) {
          let t = globalThis.Object.create(this.messagePrototype);
          return t.subSettings = [], t.categoryId = 0, e !== void 0 && y(this, t, e), t;
        }
        internalBinaryRead(e, t, n, i) {
          let r = i != null ? i : this.create(), c = e.pos + t;
          for (; e.pos < c; ) {
            let [o, s] = e.tag();
            switch (o) {
              case 2:
                r.name = W.internalBinaryRead(e, e.uint32(), n, r.name);
                break;
              case 3:
                r.subSettings.push(Re.internalBinaryRead(e, e.uint32(), n));
                break;
              case 4:
                r.categoryId = e.int32();
                break;
              case 5:
                r.icon = le.internalBinaryRead(e, e.uint32(), n, r.icon);
                break;
              default:
                let a = n.readUnknownField;
                if (a === "throw") throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);
                let u = e.skip(s);
                a !== false && (a === true ? d.onRead : a)(this.typeName, r, o, s, u);
            }
          }
          return r;
        }
        internalBinaryWrite(e, t, n) {
          e.name && W.internalBinaryWrite(e.name, t.tag(2, f.LengthDelimited).fork(), n).join();
          for (let r = 0; r < e.subSettings.length; r++) Re.internalBinaryWrite(e.subSettings[r], t.tag(3, f.LengthDelimited).fork(), n).join();
          e.categoryId !== 0 && t.tag(4, f.Varint).int32(e.categoryId), e.icon && le.internalBinaryWrite(e.icon, t.tag(5, f.LengthDelimited).fork(), n).join();
          let i = n.writeUnknownFields;
          return i !== false && (i == true ? d.onWrite : i)(this.typeName, e, t), t;
        }
      }, vn = new Yn(), zn = class extends m {
        constructor() {
          super("youtube.response.setting.Icon", [{ no: 1, name: "iconType", kind: "scalar", T: 5 }]);
        }
        create(e) {
          let t = globalThis.Object.create(this.messagePrototype);
          return t.iconType = 0, e !== void 0 && y(this, t, e), t;
        }
        internalBinaryRead(e, t, n, i) {
          let r = i != null ? i : this.create(), c = e.pos + t;
          for (; e.pos < c; ) {
            let [o, s] = e.tag();
            switch (o) {
              case 1:
                r.iconType = e.int32();
                break;
              default:
                let a = n.readUnknownField;
                if (a === "throw") throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);
                let u = e.skip(s);
                a !== false && (a === true ? d.onRead : a)(this.typeName, r, o, s, u);
            }
          }
          return r;
        }
        internalBinaryWrite(e, t, n) {
          e.iconType !== 0 && t.tag(1, f.Varint).int32(e.iconType);
          let i = n.writeUnknownFields;
          return i !== false && (i == true ? d.onWrite : i)(this.typeName, e, t), t;
        }
      }, le = new zn(), Zn = class extends m {
        constructor() {
          super("youtube.response.setting.SubSetting", [{ no: 61331416, name: "settingBooleanRenderer", kind: "message", T: () => Gn }]);
        }
        create(e) {
          let t = globalThis.Object.create(this.messagePrototype);
          return e !== void 0 && y(this, t, e), t;
        }
        internalBinaryRead(e, t, n, i) {
          let r = i != null ? i : this.create(), c = e.pos + t;
          for (; e.pos < c; ) {
            let [o, s] = e.tag();
            switch (o) {
              case 61331416:
                r.settingBooleanRenderer = Gn.internalBinaryRead(e, e.uint32(), n, r.settingBooleanRenderer);
                break;
              default:
                let a = n.readUnknownField;
                if (a === "throw") throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);
                let u = e.skip(s);
                a !== false && (a === true ? d.onRead : a)(this.typeName, r, o, s, u);
            }
          }
          return r;
        }
        internalBinaryWrite(e, t, n) {
          e.settingBooleanRenderer && Gn.internalBinaryWrite(e.settingBooleanRenderer, t.tag(61331416, f.LengthDelimited).fork(), n).join();
          let i = n.writeUnknownFields;
          return i !== false && (i == true ? d.onWrite : i)(this.typeName, e, t), t;
        }
      }, Re = new Zn(), Qn = class extends m {
        constructor() {
          super("youtube.response.setting.SettingBooleanRenderer", [{ no: 2, name: "title", kind: "message", T: () => W }, { no: 3, name: "description", kind: "message", T: () => W }, { no: 5, name: "enableServiceEndpoint", kind: "message", T: () => se }, { no: 6, name: "disableServiceEndpoint", kind: "message", T: () => se }, { no: 15, name: "itemId", kind: "scalar", T: 5 }]);
        }
        create(e) {
          let t = globalThis.Object.create(this.messagePrototype);
          return t.itemId = 0, e !== void 0 && y(this, t, e), t;
        }
        internalBinaryRead(e, t, n, i) {
          let r = i != null ? i : this.create(), c = e.pos + t;
          for (; e.pos < c; ) {
            let [o, s] = e.tag();
            switch (o) {
              case 2:
                r.title = W.internalBinaryRead(e, e.uint32(), n, r.title);
                break;
              case 3:
                r.description = W.internalBinaryRead(e, e.uint32(), n, r.description);
                break;
              case 5:
                r.enableServiceEndpoint = se.internalBinaryRead(e, e.uint32(), n, r.enableServiceEndpoint);
                break;
              case 6:
                r.disableServiceEndpoint = se.internalBinaryRead(e, e.uint32(), n, r.disableServiceEndpoint);
                break;
              case 15:
                r.itemId = e.int32();
                break;
              default:
                let a = n.readUnknownField;
                if (a === "throw") throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);
                let u = e.skip(s);
                a !== false && (a === true ? d.onRead : a)(this.typeName, r, o, s, u);
            }
          }
          return r;
        }
        internalBinaryWrite(e, t, n) {
          e.title && W.internalBinaryWrite(e.title, t.tag(2, f.LengthDelimited).fork(), n).join(), e.description && W.internalBinaryWrite(e.description, t.tag(3, f.LengthDelimited).fork(), n).join(), e.enableServiceEndpoint && se.internalBinaryWrite(e.enableServiceEndpoint, t.tag(5, f.LengthDelimited).fork(), n).join(), e.disableServiceEndpoint && se.internalBinaryWrite(e.disableServiceEndpoint, t.tag(6, f.LengthDelimited).fork(), n).join(), e.itemId !== 0 && t.tag(15, f.Varint).int32(e.itemId);
          let i = n.writeUnknownFields;
          return i !== false && (i == true ? d.onWrite : i)(this.typeName, e, t), t;
        }
      }, Gn = new Qn(), er = class extends m {
        constructor() {
          super("youtube.response.setting.ServiceEndpoint", [{ no: 81212182, name: "setClientSettingEndpoint", kind: "message", T: () => Kn }]);
        }
        create(e) {
          let t = globalThis.Object.create(this.messagePrototype);
          return e !== void 0 && y(this, t, e), t;
        }
        internalBinaryRead(e, t, n, i) {
          let r = i != null ? i : this.create(), c = e.pos + t;
          for (; e.pos < c; ) {
            let [o, s] = e.tag();
            switch (o) {
              case 81212182:
                r.setClientSettingEndpoint = Kn.internalBinaryRead(e, e.uint32(), n, r.setClientSettingEndpoint);
                break;
              default:
                let a = n.readUnknownField;
                if (a === "throw") throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);
                let u = e.skip(s);
                a !== false && (a === true ? d.onRead : a)(this.typeName, r, o, s, u);
            }
          }
          return r;
        }
        internalBinaryWrite(e, t, n) {
          e.setClientSettingEndpoint && Kn.internalBinaryWrite(e.setClientSettingEndpoint, t.tag(81212182, f.LengthDelimited).fork(), n).join();
          let i = n.writeUnknownFields;
          return i !== false && (i == true ? d.onWrite : i)(this.typeName, e, t), t;
        }
      }, se = new er(), tr = class extends m {
        constructor() {
          super("youtube.response.setting.SetClientSettingEndpoint", [{ no: 1, name: "settingData", kind: "message", T: () => Hn }]);
        }
        create(e) {
          let t = globalThis.Object.create(this.messagePrototype);
          return e !== void 0 && y(this, t, e), t;
        }
        internalBinaryRead(e, t, n, i) {
          let r = i != null ? i : this.create(), c = e.pos + t;
          for (; e.pos < c; ) {
            let [o, s] = e.tag();
            switch (o) {
              case 1:
                r.settingData = Hn.internalBinaryRead(e, e.uint32(), n, r.settingData);
                break;
              default:
                let a = n.readUnknownField;
                if (a === "throw") throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);
                let u = e.skip(s);
                a !== false && (a === true ? d.onRead : a)(this.typeName, r, o, s, u);
            }
          }
          return r;
        }
        internalBinaryWrite(e, t, n) {
          e.settingData && Hn.internalBinaryWrite(e.settingData, t.tag(1, f.LengthDelimited).fork(), n).join();
          let i = n.writeUnknownFields;
          return i !== false && (i == true ? d.onWrite : i)(this.typeName, e, t), t;
        }
      }, Kn = new tr(), nr = class extends m {
        constructor() {
          super("youtube.response.setting.SettingData", [{ no: 1, name: "clientSettingEnum", kind: "message", T: () => _n }, { no: 3, name: "boolValue", kind: "scalar", T: 8 }]);
        }
        create(e) {
          let t = globalThis.Object.create(this.messagePrototype);
          return t.boolValue = false, e !== void 0 && y(this, t, e), t;
        }
        internalBinaryRead(e, t, n, i) {
          let r = i != null ? i : this.create(), c = e.pos + t;
          for (; e.pos < c; ) {
            let [o, s] = e.tag();
            switch (o) {
              case 1:
                r.clientSettingEnum = _n.internalBinaryRead(e, e.uint32(), n, r.clientSettingEnum);
                break;
              case 3:
                r.boolValue = e.bool();
                break;
              default:
                let a = n.readUnknownField;
                if (a === "throw") throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);
                let u = e.skip(s);
                a !== false && (a === true ? d.onRead : a)(this.typeName, r, o, s, u);
            }
          }
          return r;
        }
        internalBinaryWrite(e, t, n) {
          e.clientSettingEnum && _n.internalBinaryWrite(e.clientSettingEnum, t.tag(1, f.LengthDelimited).fork(), n).join(), e.boolValue !== false && t.tag(3, f.Varint).bool(e.boolValue);
          let i = n.writeUnknownFields;
          return i !== false && (i == true ? d.onWrite : i)(this.typeName, e, t), t;
        }
      }, Hn = new nr(), rr = class extends m {
        constructor() {
          super("youtube.response.setting.ClientSettingEnum", [{ no: 1, name: "item", kind: "scalar", T: 5 }]);
        }
        create(e) {
          let t = globalThis.Object.create(this.messagePrototype);
          return t.item = 0, e !== void 0 && y(this, t, e), t;
        }
        internalBinaryRead(e, t, n, i) {
          let r = i != null ? i : this.create(), c = e.pos + t;
          for (; e.pos < c; ) {
            let [o, s] = e.tag();
            switch (o) {
              case 1:
                r.item = e.int32();
                break;
              default:
                let a = n.readUnknownField;
                if (a === "throw") throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);
                let u = e.skip(s);
                a !== false && (a === true ? d.onRead : a)(this.typeName, r, o, s, u);
            }
          }
          return r;
        }
        internalBinaryWrite(e, t, n) {
          e.item !== 0 && t.tag(1, f.Varint).int32(e.item);
          let i = n.writeUnknownFields;
          return i !== false && (i == true ? d.onWrite : i)(this.typeName, e, t), t;
        }
      }, _n = new rr();
      var ol = g(h(), 1);
      var ir = class extends m {
        constructor() {
          super("youtube.response.watch.Watch", [{ no: 1, name: "contents", kind: "message", repeat: 1, T: () => Z }]);
        }
        create(e) {
          let t = globalThis.Object.create(this.messagePrototype);
          return t.contents = [], e !== void 0 && y(this, t, e), t;
        }
        internalBinaryRead(e, t, n, i) {
          let r = i != null ? i : this.create(), c = e.pos + t;
          for (; e.pos < c; ) {
            let [o, s] = e.tag();
            switch (o) {
              case 1:
                r.contents.push(Z.internalBinaryRead(e, e.uint32(), n));
                break;
              default:
                let a = n.readUnknownField;
                if (a === "throw") throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);
                let u = e.skip(s);
                a !== false && (a === true ? d.onRead : a)(this.typeName, r, o, s, u);
            }
          }
          return r;
        }
        internalBinaryWrite(e, t, n) {
          for (let r = 0; r < e.contents.length; r++) Z.internalBinaryWrite(e.contents[r], t.tag(1, f.LengthDelimited).fork(), n).join();
          let i = n.writeUnknownFields;
          return i !== false && (i == true ? d.onWrite : i)(this.typeName, e, t), t;
        }
      }, ei = new ir(), ar = class extends m {
        constructor() {
          super("youtube.response.watch.Content", [{ no: 2, name: "player", kind: "message", T: () => oe }, { no: 3, name: "next", kind: "message", T: () => re }]);
        }
        create(e) {
          let t = globalThis.Object.create(this.messagePrototype);
          return e !== void 0 && y(this, t, e), t;
        }
        internalBinaryRead(e, t, n, i) {
          let r = i != null ? i : this.create(), c = e.pos + t;
          for (; e.pos < c; ) {
            let [o, s] = e.tag();
            switch (o) {
              case 2:
                r.player = oe.internalBinaryRead(e, e.uint32(), n, r.player);
                break;
              case 3:
                r.next = re.internalBinaryRead(e, e.uint32(), n, r.next);
                break;
              default:
                let a = n.readUnknownField;
                if (a === "throw") throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);
                let u = e.skip(s);
                a !== false && (a === true ? d.onRead : a)(this.typeName, r, o, s, u);
            }
          }
          return r;
        }
        internalBinaryWrite(e, t, n) {
          e.player && oe.internalBinaryWrite(e.player, t.tag(2, f.LengthDelimited).fork(), n).join(), e.next && re.internalBinaryWrite(e.next, t.tag(3, f.LengthDelimited).fork(), n).join();
          let i = n.writeUnknownFields;
          return i !== false && (i == true ? d.onWrite : i)(this.typeName, e, t), t;
        }
      }, Z = new ar();
      var dl = g(h(), 1);
      var dr = class extends m {
        constructor() {
          super("youtube.response.config.Config", [{ no: 1, name: "response_context", kind: "message", T: () => or }]);
        }
        create(e) {
          let t = globalThis.Object.create(this.messagePrototype);
          return e !== void 0 && y(this, t, e), t;
        }
        internalBinaryRead(e, t, n, i) {
          let r = i != null ? i : this.create(), c = e.pos + t;
          for (; e.pos < c; ) {
            let [o, s] = e.tag();
            switch (o) {
              case 1:
                r.responseContext = or.internalBinaryRead(e, e.uint32(), n, r.responseContext);
                break;
              default:
                let a = n.readUnknownField;
                if (a === "throw") throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);
                let u = e.skip(s);
                a !== false && (a === true ? d.onRead : a)(this.typeName, r, o, s, u);
            }
          }
          return r;
        }
        internalBinaryWrite(e, t, n) {
          e.responseContext && or.internalBinaryWrite(e.responseContext, t.tag(1, f.LengthDelimited).fork(), n).join();
          let i = n.writeUnknownFields;
          return i !== false && (i == true ? d.onWrite : i)(this.typeName, e, t), t;
        }
      }, kr = new dr(), pr = class extends m {
        constructor() {
          super("youtube.response.config.ResponseContext", [{ no: 16, name: "globalConfigGroup", kind: "message", T: () => sr }]);
        }
        create(e) {
          let t = globalThis.Object.create(this.messagePrototype);
          return e !== void 0 && y(this, t, e), t;
        }
        internalBinaryRead(e, t, n, i) {
          let r = i != null ? i : this.create(), c = e.pos + t;
          for (; e.pos < c; ) {
            let [o, s] = e.tag();
            switch (o) {
              case 16:
                r.globalConfigGroup = sr.internalBinaryRead(e, e.uint32(), n, r.globalConfigGroup);
                break;
              default:
                let a = n.readUnknownField;
                if (a === "throw") throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);
                let u = e.skip(s);
                a !== false && (a === true ? d.onRead : a)(this.typeName, r, o, s, u);
            }
          }
          return r;
        }
        internalBinaryWrite(e, t, n) {
          e.globalConfigGroup && sr.internalBinaryWrite(e.globalConfigGroup, t.tag(16, f.LengthDelimited).fork(), n).join();
          let i = n.writeUnknownFields;
          return i !== false && (i == true ? d.onWrite : i)(this.typeName, e, t), t;
        }
      }, or = new pr(), yr = class extends m {
        constructor() {
          super("youtube.response.config.GlobalConfigGroup", [{ no: 6, name: "coldConfigGroup", kind: "message", T: () => lr }, { no: 7, name: "hotConfigGroup", kind: "message", T: () => cr }, { no: 4, name: "hot_hash_data", kind: "scalar", opt: true, T: 9 }, { no: 5, name: "cold_hash_data", kind: "scalar", opt: true, T: 9 }]);
        }
        create(e) {
          let t = globalThis.Object.create(this.messagePrototype);
          return e !== void 0 && y(this, t, e), t;
        }
        internalBinaryRead(e, t, n, i) {
          let r = i != null ? i : this.create(), c = e.pos + t;
          for (; e.pos < c; ) {
            let [o, s] = e.tag();
            switch (o) {
              case 6:
                r.coldConfigGroup = lr.internalBinaryRead(e, e.uint32(), n, r.coldConfigGroup);
                break;
              case 7:
                r.hotConfigGroup = cr.internalBinaryRead(e, e.uint32(), n, r.hotConfigGroup);
                break;
              case 4:
                r.hotHashData = e.string();
                break;
              case 5:
                r.coldHashData = e.string();
                break;
              default:
                let a = n.readUnknownField;
                if (a === "throw") throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);
                let u = e.skip(s);
                a !== false && (a === true ? d.onRead : a)(this.typeName, r, o, s, u);
            }
          }
          return r;
        }
        internalBinaryWrite(e, t, n) {
          e.coldConfigGroup && lr.internalBinaryWrite(e.coldConfigGroup, t.tag(6, f.LengthDelimited).fork(), n).join(), e.hotConfigGroup && cr.internalBinaryWrite(e.hotConfigGroup, t.tag(7, f.LengthDelimited).fork(), n).join(), e.hotHashData !== void 0 && t.tag(4, f.LengthDelimited).string(e.hotHashData), e.coldHashData !== void 0 && t.tag(5, f.LengthDelimited).string(e.coldHashData);
          let i = n.writeUnknownFields;
          return i !== false && (i == true ? d.onWrite : i)(this.typeName, e, t), t;
        }
      }, sr = new yr(), hr = class extends m {
        constructor() {
          super("youtube.response.config.ColdConfigGroup", []);
        }
        create(e) {
          let t = globalThis.Object.create(this.messagePrototype);
          return e !== void 0 && y(this, t, e), t;
        }
        internalBinaryRead(e, t, n, i) {
          return i != null ? i : this.create();
        }
        internalBinaryWrite(e, t, n) {
          let i = n.writeUnknownFields;
          return i !== false && (i == true ? d.onWrite : i)(this.typeName, e, t), t;
        }
      }, lr = new hr(), mr = class extends m {
        constructor() {
          super("youtube.response.config.HotConfigGroup", [{ no: 138536474, name: "mediaHotConfig", kind: "message", T: () => ur }]);
        }
        create(e) {
          let t = globalThis.Object.create(this.messagePrototype);
          return e !== void 0 && y(this, t, e), t;
        }
        internalBinaryRead(e, t, n, i) {
          let r = i != null ? i : this.create(), c = e.pos + t;
          for (; e.pos < c; ) {
            let [o, s] = e.tag();
            switch (o) {
              case 138536474:
                r.mediaHotConfig = ur.internalBinaryRead(e, e.uint32(), n, r.mediaHotConfig);
                break;
              default:
                let a = n.readUnknownField;
                if (a === "throw") throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);
                let u = e.skip(s);
                a !== false && (a === true ? d.onRead : a)(this.typeName, r, o, s, u);
            }
          }
          return r;
        }
        internalBinaryWrite(e, t, n) {
          e.mediaHotConfig && ur.internalBinaryWrite(e.mediaHotConfig, t.tag(138536474, f.LengthDelimited).fork(), n).join();
          let i = n.writeUnknownFields;
          return i !== false && (i == true ? d.onWrite : i)(this.typeName, e, t), t;
        }
      }, cr = new mr(), gr = class extends m {
        constructor() {
          super("youtube.response.config.MediaHotConfig", [{ no: 146311580, name: "onesieHotConfig", kind: "message", T: () => fr }]);
        }
        create(e) {
          let t = globalThis.Object.create(this.messagePrototype);
          return e !== void 0 && y(this, t, e), t;
        }
        internalBinaryRead(e, t, n, i) {
          let r = i != null ? i : this.create(), c = e.pos + t;
          for (; e.pos < c; ) {
            let [o, s] = e.tag();
            switch (o) {
              case 146311580:
                r.onesieHotConfig = fr.internalBinaryRead(e, e.uint32(), n, r.onesieHotConfig);
                break;
              default:
                let a = n.readUnknownField;
                if (a === "throw") throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);
                let u = e.skip(s);
                a !== false && (a === true ? d.onRead : a)(this.typeName, r, o, s, u);
            }
          }
          return r;
        }
        internalBinaryWrite(e, t, n) {
          e.onesieHotConfig && fr.internalBinaryWrite(e.onesieHotConfig, t.tag(146311580, f.LengthDelimited).fork(), n).join();
          let i = n.writeUnknownFields;
          return i !== false && (i == true ? d.onWrite : i)(this.typeName, e, t), t;
        }
      }, ur = new gr(), br = class extends m {
        constructor() {
          super("youtube.response.config.OnesieHotConfig", [{ no: 1, name: "clientKey", kind: "scalar", T: 12 }, { no: 2, name: "encryptKey", kind: "scalar", T: 12 }, { no: 3, name: "keyExpiresInSeconds", kind: "scalar", T: 3 }, { no: 30, name: "useHotConfigToCreateOnesieRequest", kind: "scalar", T: 8 }]);
        }
        create(e) {
          let t = globalThis.Object.create(this.messagePrototype);
          return t.clientKey = new Uint8Array(0), t.encryptKey = new Uint8Array(0), t.keyExpiresInSeconds = "0", t.useHotConfigToCreateOnesieRequest = false, e !== void 0 && y(this, t, e), t;
        }
        internalBinaryRead(e, t, n, i) {
          let r = i != null ? i : this.create(), c = e.pos + t;
          for (; e.pos < c; ) {
            let [o, s] = e.tag();
            switch (o) {
              case 1:
                r.clientKey = e.bytes();
                break;
              case 2:
                r.encryptKey = e.bytes();
                break;
              case 3:
                r.keyExpiresInSeconds = e.int64().toString();
                break;
              case 30:
                r.useHotConfigToCreateOnesieRequest = e.bool();
                break;
              default:
                let a = n.readUnknownField;
                if (a === "throw") throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);
                let u = e.skip(s);
                a !== false && (a === true ? d.onRead : a)(this.typeName, r, o, s, u);
            }
          }
          return r;
        }
        internalBinaryWrite(e, t, n) {
          e.clientKey.length && t.tag(1, f.LengthDelimited).bytes(e.clientKey), e.encryptKey.length && t.tag(2, f.LengthDelimited).bytes(e.encryptKey), e.keyExpiresInSeconds !== "0" && t.tag(3, f.Varint).int64(e.keyExpiresInSeconds), e.useHotConfigToCreateOnesieRequest !== false && t.tag(30, f.Varint).bool(e.useHotConfigToCreateOnesieRequest);
          let i = n.writeUnknownFields;
          return i !== false && (i == true ? d.onWrite : i)(this.typeName, e, t), t;
        }
      }, fr = new br();
      var Ml = g(h(), 1);
      var yl = g(h(), 1);
      var ml = g(h(), 1);
      var Bl = g(h(), 1);
      var ti = ((n) => (n[n.NONE = 0] = "NONE", n[n.GZIP = 1] = "GZIP", n[n.BROTLI = 2] = "BROTLI", n))(ti || {}), Rr = class extends m {
        constructor() {
          super("youtube.ump.encrypted.EncryptedInnertubeResponsePart", [{ no: 1, name: "encryptedContent", kind: "scalar", T: 12 }, { no: 2, name: "hmac", kind: "scalar", T: 12 }, { no: 3, name: "iv", kind: "scalar", T: 12 }, { no: 4, name: "compressionAlgorithm", kind: "enum", T: () => ["youtube.ump.encrypted.CompressionAlgorithm", ti] }]);
        }
        create(e) {
          let t = globalThis.Object.create(this.messagePrototype);
          return t.encryptedContent = new Uint8Array(0), t.hmac = new Uint8Array(0), t.iv = new Uint8Array(0), t.compressionAlgorithm = 0, e !== void 0 && y(this, t, e), t;
        }
        internalBinaryRead(e, t, n, i) {
          let r = i != null ? i : this.create(), c = e.pos + t;
          for (; e.pos < c; ) {
            let [o, s] = e.tag();
            switch (o) {
              case 1:
                r.encryptedContent = e.bytes();
                break;
              case 2:
                r.hmac = e.bytes();
                break;
              case 3:
                r.iv = e.bytes();
                break;
              case 4:
                r.compressionAlgorithm = e.int32();
                break;
              default:
                let a = n.readUnknownField;
                if (a === "throw") throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);
                let u = e.skip(s);
                a !== false && (a === true ? d.onRead : a)(this.typeName, r, o, s, u);
            }
          }
          return r;
        }
        internalBinaryWrite(e, t, n) {
          e.encryptedContent.length && t.tag(1, f.LengthDelimited).bytes(e.encryptedContent), e.hmac.length && t.tag(2, f.LengthDelimited).bytes(e.hmac), e.iv.length && t.tag(3, f.LengthDelimited).bytes(e.iv), e.compressionAlgorithm !== 0 && t.tag(4, f.Varint).int32(e.compressionAlgorithm);
          let i = n.writeUnknownFields;
          return i !== false && (i == true ? d.onWrite : i)(this.typeName, e, t), t;
        }
      }, xi = new Rr();
      var Sl = g(h(), 1);
      var wr = class extends m {
        constructor() {
          super("youtube.ump.encrypted.OnesieInnertubeResponse", [{ no: 4, name: "contents", kind: "message", repeat: 1, T: () => Z }]);
        }
        create(e) {
          let t = globalThis.Object.create(this.messagePrototype);
          return t.contents = [], e !== void 0 && y(this, t, e), t;
        }
        internalBinaryRead(e, t, n, i) {
          let r = i != null ? i : this.create(), c = e.pos + t;
          for (; e.pos < c; ) {
            let [o, s] = e.tag();
            switch (o) {
              case 4:
                r.contents.push(Z.internalBinaryRead(e, e.uint32(), n));
                break;
              default:
                let a = n.readUnknownField;
                if (a === "throw") throw new globalThis.Error(`Unknown field ${o} (wire type ${s}) for ${this.typeName}`);
                let u = e.skip(s);
                a !== false && (a === true ? d.onRead : a)(this.typeName, r, o, s, u);
            }
          }
          return r;
        }
        internalBinaryWrite(e, t, n) {
          for (let r = 0; r < e.contents.length; r++) Z.internalBinaryWrite(e.contents[r], t.tag(4, f.LengthDelimited).fork(), n).join();
          let i = n.writeUnknownFields;
          return i !== false && (i == true ? d.onWrite : i)(this.typeName, e, t), t;
        }
      }, Wi = new wr();
      function Ni(l) {
        var _a2, _b2, _c;
        ((_a2 = l.adPlacements) == null ? void 0 : _a2.length) && (l.adPlacements.length = 0), ((_b2 = l.adSlots) == null ? void 0 : _b2.length) && (l.adSlots.length = 0), (_c = l == null ? void 0 : l.playbackTracking) == null ? true : delete _c.pageadViewthroughconversion;
      }
      function Si(l) {
        let e = l.playabilityStatus;
        e.pictureInPictureRender = me.create({ pictureInPictureAbility: { active: true, f4: 0, f6: 0, f8: 1 } }), e.backgroundPlayerRender = ge.create({ backgroundAbility: { active: true } });
      }
      function ce(l, e, t) {
        let n = l != null && typeof l == "object" ? [l] : [];
        for (; n.length; ) {
          let i = n.pop();
          for (let r of Object.keys(i)) {
            if (r === e && t(i)) return;
            i[r] != null && typeof i[r] == "object" && n.push(i[r]);
          }
        }
      }
      var Oi = { de: "Deutsch", ru: "\u0420\u0443\u0441\u0441\u043A\u0438\u0439", fr: "Fran\xE7ais", fil: "Filipino", ko: "\uD55C\uAD6D\uC5B4", ja: "\u65E5\u672C\u8A9E", en: "English", vi: "Ti\u1EBFng Vi\u1EC7t", "zh-Hant": "\u4E2D\u6587\uFF08\u7E41\u9AD4\uFF09", "zh-Hans": "\u4E2D\u6587\uFF08\u7B80\u4F53\uFF09", und: "@VirgilClyne" };
      function Pi(l, e) {
        e !== "off" && ce(l, "captionTracks", (t) => {
          var _a2;
          let n = t.captionTracks, i = t.audioTracks;
          if (Array.isArray(n)) {
            let r = { [e]: 2, en: 1 }, c = -1, o = 0;
            for (let s = 0; s < n.length; s++) {
              let a = n[s], u = r[a.languageCode];
              u && u > c && (c = u, o = s), a.isTranslatable = true;
            }
            if (c !== 2) {
              let s = be.create({ baseUrl: n[o].baseUrl + `&tlang=${e}`, name: { runs: [{ text: `@Enhance (${e})` }] }, vssId: `.${e}`, languageCode: e });
              n.push(s);
            }
            if (Array.isArray(i)) {
              let s = c === 2 ? o : n.length - 1;
              for (let a of i) ((_a2 = a.captionTrackIndices) == null ? void 0 : _a2.includes(s)) || a.captionTrackIndices.push(s), a.defaultCaptionTrackIndex = s, a.captionsInitialState = 3;
            }
          }
          return t.translationLanguages = Object.entries(Oi).map(([r, c]) => ke.create({ languageCode: r, languageName: { runs: [{ text: c }] } })), true;
        });
      }
      function Br(l, e) {
        Ni(l), Si(l), Pi(l, e);
      }
      function ni(l) {
        if (l.length < 1e3) return false;
        let e = [112, 97, 103, 101, 97, 100], t = l.length, n = e.length, i = new Int32Array(256).fill(n + 1);
        for (let c = 0; c < n; c++) i[e[c]] = n - c;
        let r = 0;
        for (; r <= t - n; ) {
          if (l[r] === e[0] && l[r + 1] === e[1] && l[r + 2] === e[2] && l[r + 3] === e[3] && l[r + 4] === e[4] && l[r + 5] === e[5]) return true;
          r += i[l[r + n]] || n + 1;
        }
        return false;
      }
      function Ui(l) {
        var _a2, _b2;
        return l ? (_b2 = (_a2 = d.list(l)) == null ? void 0 : _a2.some((t) => ni(t.data))) != null ? _b2 : false : false;
      }
      function Ei(l, e) {
        let t = l.no;
        if (e.whiteNo.includes(t)) return false;
        if (e.blackNo.includes(t)) return true;
        let n = ni(l.data);
        return n ? e.blackNo.push(t) : e.whiteNo.push(t), e.dirty = true, n;
      }
      function Fi(l, e) {
        let t = false;
        return ce(l, "renderInfo", (n) => {
          var _a2, _b2, _c, _d, _e2, _f, _g;
          let i = (_e2 = (_d = (_c = (_b2 = (_a2 = n.renderInfo) == null ? void 0 : _a2.layoutRender) == null ? void 0 : _b2.eml) == null ? void 0 : _c.split("|")) == null ? void 0 : _d[0]) != null ? _e2 : "";
          if (e.whiteEml.includes(i)) t = false;
          else if (e.blackEml.includes(i) || /shorts(?!_pivot_item)/.test(i)) t = true;
          else {
            let r = (_g = (_f = n == null ? void 0 : n.videoInfo) == null ? void 0 : _f.videoContext) == null ? void 0 : _g.videoContent;
            r && (t = Ui(r), t ? e.blackEml.push(i) : e.whiteEml.push(i), e.dirty = true);
          }
          return true;
        }), t;
      }
      function Li(l, e) {
        let t = d.list(l)[0];
        return t ? Ei(t, e) : Fi(l, e);
      }
      function Ir(l, e) {
        let t = false;
        return ce(l, "richItemContents", (n) => {
          let i = n.richItemContents;
          if (!Array.isArray(i)) return false;
          for (let r = i.length - 1; r >= 0; r--) Li(i[r], e) && (i.splice(r, 1), t = true);
        }), t;
      }
      function Tr(l, { state: e }) {
        return { bodyChanged: Ir(l, e.adCache), stateChanged: e.adCache.dirty };
      }
      function Ai(l, { params: e }) {
        return Br(l, e.captionLang), { bodyChanged: true, stateChanged: false };
      }
      function Di(l) {
        var _a2, _b2, _c, _d, _e2;
        let e = false, t = (_b2 = (_a2 = l.entries) == null ? void 0 : _a2.length) != null ? _b2 : 0;
        for (let n = t - 1; n >= 0; n--) ((_e2 = (_d = (_c = l.entries[n].command) == null ? void 0 : _c.reelWatchEndpoint) == null ? void 0 : _d.adClientParams) == null ? void 0 : _e2.isAd) && (l.entries.splice(n, 1), e = true);
        return { bodyChanged: e, stateChanged: false };
      }
      function $i(l, { params: e }) {
        let t = ["SPunlimited"];
        e.blockUpload && t.push("FEuploads"), e.blockImmersive && t.push("FEmusic_immersive"), e.blockShorts && t.push("FEshorts");
        let n = false;
        return ce(l, "rendererItems", (i) => {
          var _a2, _b2, _c, _d, _e2;
          for (let r = i.rendererItems.length - 1; r >= 0; r--) {
            let c = (_e2 = (_b2 = (_a2 = i.rendererItems[r]) == null ? void 0 : _a2.iconRender) == null ? void 0 : _b2.browseId) != null ? _e2 : (_d = (_c = i.rendererItems[r]) == null ? void 0 : _c.labelRender) == null ? void 0 : _d.browseId;
            c && t.includes(c) && (i.rendererItems.splice(r, 1), n = true);
          }
        }), { bodyChanged: n, stateChanged: false };
      }
      function ji(l) {
        return ce(l.settingItems, "categoryId", (e) => {
          e.categoryId === 10135 && e.subSettings.push(Re.create({ settingBooleanRenderer: { itemId: 0, enableServiceEndpoint: { setClientSettingEndpoint: { settingData: { clientSettingEnum: { item: 151 }, boolValue: true } } }, disableServiceEndpoint: { setClientSettingEndpoint: { settingData: { clientSettingEnum: { item: 151 }, boolValue: false } } } } }));
        }), l.settingItems.push(_.create({ backgroundPlayBackSettingRenderer: { backgroundPlayback: true, download: true, downloadQualitySelection: true, smartDownload: true, icon: { iconType: 1093 } } })), { bodyChanged: true, stateChanged: false };
      }
      function Vi(l, { params: e, state: t }) {
        for (let n of l.contents) n.player && Br(n.player, e.captionLang), n.next && Ir(n.next, t.adCache);
        return { bodyChanged: l.contents.length > 0, stateChanged: t.adCache.dirty };
      }
      function ri(l, { state: e, platformKey: t }) {
        var _a2, _b2, _c, _d;
        let n = (_d = (_c = (_b2 = (_a2 = l.responseContext) == null ? void 0 : _a2.globalConfigGroup) == null ? void 0 : _b2.hotConfigGroup) == null ? void 0 : _c.mediaHotConfig) == null ? void 0 : _d.onesieHotConfig;
        if (!n) return { bodyChanged: false, stateChanged: false };
        let i = n.clientKey, r = n.encryptKey;
        if (!(i == null ? void 0 : i.length) || !(r == null ? void 0 : r.length)) return console.log("\u5F02\u5E38\uFF1AhotConfig \u672A\u5305\u542B\u5B8C\u6574\u7684 onesie key"), { bodyChanged: false, stateChanged: false };
        let c = Q(i), o = Q(r), s = e.config[t];
        return (s == null ? void 0 : s.clientKey) === c && (s == null ? void 0 : s.encryptKey) === o ? { bodyChanged: false, stateChanged: false } : (e.config[t] = { clientKey: c, encryptKey: o }, { bodyChanged: false, stateChanged: true });
      }
      var Mi = [{ path: "browse", msgType: qr, handler: Tr }, { path: "next", msgType: re, handler: Tr }, { path: "player", msgType: oe, handler: Ai }, { path: "search", msgType: Yr, handler: Tr }, { path: "reel_watch_sequence", msgType: zr, handler: Di }, { path: "guide", msgType: Zr, handler: $i }, { path: "get_setting", msgType: Qr, handler: ji }, { path: "get_watch", msgType: ei, handler: Vi }, { path: "config", msgType: kr, handler: ri }, { path: "log_event", msgType: kr, handler: ri }];
      function ii(l) {
        let e = Mi.find((r) => l.url.includes(r.path));
        if (!e) return null;
        if (l.bodyBytes == null) return { action: "exit", state: l.state, changed: false };
        let t = e.msgType.fromBinary(l.bodyBytes), { bodyChanged: n, stateChanged: i } = e.handler(t, { params: l.params, state: l.state, platformKey: l.platformKey });
        return { action: n ? "body" : "exit", bodyBytes: n ? e.msgType.toBinary(t) : void 0, state: l.state, changed: i };
      }
      var uc = g(h(), 1);
      var rc = g(h(), 1);
      var ue = class {
        constructor(e, t, n) {
          __publicField(this, "_times", /* @__PURE__ */ new Map());
          __publicField(this, "name");
          __publicField(this, "isDebug");
          __publicField(this, "className");
          __publicField(this, "request");
          __publicField(this, "response");
          var _a2;
          this.name = e != null ? e : "", this.isDebug = (_a2 = n == null ? void 0 : n.debug) != null ? _a2 : false, e && this.debug(`${e} Start`), this.className = t != null ? t : "", this.init();
        }
        static getInstance(e, t) {
          let n = "Surge";
          return typeof $loon < "u" ? n = "Loon" : typeof $task < "u" && (n = "QuanX"), ue.instances[n] || (ue.instances[n] = ue.classNames[n](e, n, t)), ue.instances[n];
        }
        createProxy(e) {
          return new Proxy(e, { get: this.getFn, set: this.setFn });
        }
        getFn(e, t, n) {
          return e[t];
        }
        setFn(e, t, n, i) {
          return e[t] = n, true;
        }
        getJSON(e, t = {}) {
          let n = this.getVal(e);
          return n ? JSON.parse(n) : t;
        }
        setJSON(e, t) {
          this.setVal(JSON.stringify(e), t);
        }
        msg(e = this.name, t = "", n = "", i) {
        }
        debug(e) {
          this.isDebug && (typeof e == "object" && (e = JSON.stringify(e)), console.log(e));
        }
        log(e) {
          typeof e == "object" && (e = JSON.stringify(e)), console.log(e);
        }
        timeStart(e) {
          this._times.set(e, Date.now());
        }
        timeEnd(e) {
          var _a2;
          if (this._times.has(e)) {
            let t = (_a2 = this._times.get(e)) != null ? _a2 : 0, n = Date.now() - t;
            this.debug(`${e}: ${n}ms`), this._times.delete(e);
          } else this.debug(`Timer with label ${e} does not exist.`);
        }
        exit() {
          $done2({});
        }
        reject() {
          $done2();
        }
        decodeParams(e) {
          return e;
        }
      }, K = ue;
      pe(K, "instances", {}), pe(K, "classNames", { QuanX: (e, t, n) => new je(e, t, n), Surge: (e, t, n) => new we(e, t, n), Loon: (e, t, n) => new Cr(e, t, n) });
      var Ve = class extends K {
        getFn(e, t, n) {
          let i = Ve.clientAdapter[t] || t;
          return super.getFn(e, i, n);
        }
        setFn(e, t, n, i) {
          let r = Ve.clientAdapter[t] || t;
          return super.setFn(e, r, n, i);
        }
        init() {
          try {
            this.request = this.createProxy($request2), this.response = this.createProxy($response2);
          } catch (e) {
            this.debug(e.toString());
          }
        }
        getVal(e) {
          return $persistentStore2.read(e);
        }
        setVal(e, t) {
          $persistentStore2.write(e, t);
        }
        msg(e = this.name, t = "", n = "", i) {
          let r = {};
          i && (r = { action: { "open-url": i } }), $notification.post(e, t, n, r);
        }
        async fetch(e) {
          return await new Promise((t, n) => {
            let { method: i, body: r, bodyBytes: c, ...o } = e, s = c != null ? c : r, a = s instanceof Uint8Array;
            $httpClient[i.toLowerCase()]({ ...o, body: s, "binary-mode": a }, (u, B, w) => {
              var _a2;
              u && n(u);
              let b = a ? "bodyBytes" : "body";
              t({ status: (_a2 = B.status) != null ? _a2 : B.statusCode, headers: B.headers, [b]: w });
            });
          });
        }
        done(e) {
          var _a2;
          let t = (_a2 = e.response) != null ? _a2 : e;
          t.bodyBytes && (t.body = t.bodyBytes, delete t.bodyBytes), $done2(e.response ? { response: t } : t);
        }
        decodeParams(e) {
          return typeof $argument2 == "string" && !$argument2.includes("{{{") && Object.assign(e, JSON.parse($argument2)), e;
        }
      }, we = Ve;
      pe(we, "clientAdapter", { bodyBytes: "body" });
      var G = class extends K {
        static transferBodyBytes(e, t) {
          return e instanceof ArrayBuffer ? t === "Uint8Array" ? new Uint8Array(e) : e : e instanceof Uint8Array && t === "ArrayBuffer" ? e.buffer.slice(e.byteOffset, e.byteLength + e.byteOffset) : e;
        }
        init() {
          try {
            this.request = this.createProxy($request2), this.response = this.createProxy($response2);
          } catch (e) {
            this.debug(e.toString());
          }
        }
        getFn(e, t, n) {
          let i = G.clientAdapter[t] || t, r = super.getFn(e, i, n);
          return t === "bodyBytes" && (r = G.transferBodyBytes(r, "Uint8Array")), r;
        }
        setFn(e, t, n, i) {
          let r = G.clientAdapter[t] || t, c = n;
          return t === "bodyBytes" && (c = G.transferBodyBytes(c, "Uint8Array")), super.setFn(e, r, c, i);
        }
        getVal(e) {
          return $prefs.valueForKey(e);
        }
        setVal(e, t) {
          $prefs.setValueForKey(e, t);
        }
        msg(e = this.name, t = "", n = "", i) {
          $notify(e, t, n, { "open-url": i != null ? i : "" });
        }
        async fetch(e) {
          return await new Promise((t) => {
            let n = { url: "", method: "GET" };
            for (let [i, r] of Object.entries(e)) i === "id" ? n.sessionIndex = r : i === "bodyBytes" ? n.bodyBytes = G.transferBodyBytes(r, "ArrayBuffer") : n[i] = r;
            e.bodyBytes && delete n.body, $task.fetch(n).then((i) => {
              let r = { status: 200, headers: {} };
              for (let [c, o] of Object.entries(i)) c === "sessionIndex" ? r.id = o : c === "bodyBytes" ? r.bodyBytes = G.transferBodyBytes(o, "Uint8Array") : c === "statusCode" ? r.status = o : r[c] = o;
              t(r);
            });
          });
        }
        done(e) {
          var _a2;
          let t = (_a2 = e.response) != null ? _a2 : e, n = {};
          for (let [i, r] of Object.entries(t)) i === "status" ? n.status = `HTTP/1.1 ${r}` : i === "bodyBytes" ? n.bodyBytes = G.transferBodyBytes(r, "ArrayBuffer") : n[i] = r;
          $done2(n);
        }
      }, je = G;
      pe(je, "clientAdapter", { id: "sessionIndex", status: "statusCode" });
      var Cr = class extends we {
        decodeParams(e) {
          if (typeof $argument2 < "u") for (let t of Object.keys(e)) {
            let n = $argument2 == null ? void 0 : $argument2[t];
            n !== void 0 && (e[t] = n);
          }
          return e;
        }
      };
      var oc = g(h(), 1), fe = { config: "YouTubeConfig", advertiseInfo: "YouTubeAdvertiseInfo" }, xr = { music: "youtubeMusic", video: "youtube" };
      var F = K.getInstance("YouTube");
      function vi() {
        var _a2;
        return ((_a2 = F.request.headers["user-agent"]) != null ? _a2 : F.request.headers["User-Agent"]).includes("music");
      }
      function Wr() {
        return vi() ? xr.music : xr.video;
      }
      var pc = g(h(), 1);
      function ai() {
        return F.decodeParams({ captionLang: "off", blockUpload: true, blockImmersive: true, blockShorts: false });
      }
      var gc = g(h(), 1);
      var oi = "1.0";
      function Gi() {
        return { whiteNo: [], blackNo: [], whiteEml: [], blackEml: ["inline_injection_entrypoint_layout.eml"], dirty: false };
      }
      function si() {
        let l = F.getJSON(fe.advertiseInfo);
        return (l == null ? void 0 : l.version) !== oi ? Gi() : { whiteNo: l.whiteNo, blackNo: l.blackNo, whiteEml: l.whiteEml, blackEml: l.blackEml, dirty: false };
      }
      function li(l) {
        if (!l.dirty) return;
        let { whiteNo: e, blackNo: t, whiteEml: n, blackEml: i } = l, r = { version: oi, whiteNo: e, blackNo: t, whiteEml: n, blackEml: i };
        F.setJSON(r, fe.advertiseInfo);
      }
      var wc = g(h(), 1);
      function ci() {
        var _a2;
        return (_a2 = F.getJSON(fe.config)) != null ? _a2 : {};
      }
      function ui(l) {
        F.debug(`saveKeyConfig: ${JSON.stringify(l)}`), F.setJSON(l, fe.config);
      }
      function Ki() {
        let l = { adCache: si(), config: ci() }, e = ii({ url: F.request.url, bodyBytes: F.response.bodyBytes, state: l, params: ai(), platformKey: Wr() });
        if (e == null) {
          F.msg("YouTube Enhance", "\u811A\u672C\u9700\u8981\u66F4\u65B0", "\u5916\u90E8\u8D44\u6E90 -> \u5168\u90E8\u66F4\u65B0"), F.exit();
          return;
        }
        e.changed && (li(e.state.adCache), ui(e.state.config)), e.action === "body" && e.bodyBytes ? F.done({ bodyBytes: e.bodyBytes }) : F.exit();
      }
      try {
        Ki();
      } catch (l) {
        console.log(String(l)), F.exit();
      }
    })();
    return (result == null ? void 0 : result.body) ? new Uint8Array(result.body) : body;
  }

  // source/response.js
  function main() {
    const name = platform($request);
    let options = {};
    try {
      options = typeof $argument === "string" ? JSON.parse($argument) : {};
      const body = normalizeBody($response.body);
      if (!body.length) return $done({});
      const route = $request.url.split("?")[0];
      const legacy = (endpoint2, bytes) => {
        if (options.blockAds === false) return bytes;
        return processApi(endpoint2, bytes, $request.headers, $persistentStore, {
          ...options,
          captionLang: "off",
          blockUpload: false,
          blockImmersive: false,
          blockShorts: false
        });
      };
      if (route.endsWith("/initplayback")) {
        if (Number($response.status) >= 300) return $done({});
        const key = getClientKey($persistentStore, name);
        const changed = transformUmp(body, key, options, (next) => legacy("next", next));
        return $done({ body: changed });
      }
      try {
        captureConfig(body, $persistentStore, name);
      } catch (e) {
      }
      const endpoint = route.split("/").pop();
      if (endpoint === "player") return $done({ body: transformPlayer(body, options) });
      if (endpoint === "get_watch") return $done({ body: transformWatch(body, options, 1, (next) => legacy("next", next)) });
      if (["browse", "next", "search", "reel_watch_sequence"].includes(endpoint)) return $done({ body: legacy(endpoint, body) });
    } catch (e) {
      if ($request.url.split("?")[0].endsWith("/initplayback")) {
        try {
          clearConfig($persistentStore, name);
        } catch (e2) {
        }
      }
      if (options.debug) console.log("YouTube \u672C\u673A\u5904\u7406\u672A\u5B8C\u6210\uFF0C\u672C\u6B21\u4FDD\u7559\u539F\u59CB\u54CD\u5E94\u3002");
    }
    $done({});
  }
  main();
})();
