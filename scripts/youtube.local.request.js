// 个人本机播放过滤版；源码在 source/，第三方来源与许可见 NOTICE.md。
// 构建生成文件，请修改源码后重新构建。
(() => {
  // source/wire.js
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
    var _a;
    return (_a = fields(bytes).find((field) => field.no === no && field.wire === 2)) == null ? void 0 : _a.data;
  }
  function normalizeBody(body) {
    if (body instanceof Uint8Array) return body;
    if (body instanceof ArrayBuffer) return new Uint8Array(body);
    if (ArrayBuffer.isView(body)) return new Uint8Array(body.buffer, body.byteOffset, body.byteLength);
    throw new Error("\u54CD\u5E94\u4E0D\u662F\u4E8C\u8FDB\u5236\u6570\u636E");
  }
  function decodeBase64(text) {
    if (typeof text !== "string" || !/^[A-Za-z0-9+/_-]*={0,2}$/.test(text)) throw new Error("\u65E0\u6548\u7684\u5BC6\u94A5\u7F16\u7801");
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let bits = 0, value = 0;
    const out = [];
    for (const char of text.replace(/-/g, "+").replace(/_/g, "/").replace(/=+$/, "")) {
      value = value << 6 | alphabet.indexOf(char);
      bits += 6;
      if (bits >= 8) {
        bits -= 8;
        out.push(value >>> bits & 255);
      }
    }
    return Uint8Array.from(out);
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

  // source/request.js
  function main() {
    var _a, _b;
    const name = platform($request), route = $request.url.split("?")[0];
    try {
      const options = typeof $argument === "string" ? JSON.parse($argument) : {};
      if (route.endsWith("/player/ad_break")) {
        if (options.blockAds === false) return $done({});
        return emptyPlayback();
      }
      if (route.endsWith("/log_event")) {
        const cached = (_a = readConfig($persistentStore)[name]) == null ? void 0 : _a.clientKey;
        const headers = { ...$request.headers };
        for (const key of Object.keys(headers)) {
          const lower = key.toLowerCase();
          if (lower === "content-encoding" || !cached && lower === "x-youtube-hot-hash-data") delete headers[key];
        }
        return $done({ headers });
      }
      if (route.endsWith("/initplayback")) {
        const cached = (_b = readConfig($persistentStore)[name]) == null ? void 0 : _b.encryptKey;
        const body = normalizeBody($request.body);
        const request = getBytes(body, 3);
        const key = request && getBytes(request, 5);
        const expected = cached && decodeBase64(cached);
        if (key && expected && key.length === expected.length && key.every((byte, i) => byte === expected[i])) return $done({});
        clearConfig($persistentStore, name);
        return emptyPlayback();
      }
    } catch (e) {
    }
    $done({});
  }
  function emptyPlayback() {
    $done({ response: { status: 200, headers: { "Content-Type": "application/x-protobuf" }, body: new Uint8Array() } });
  }
  main();
})();
