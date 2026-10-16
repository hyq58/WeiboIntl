// 个人本机播放过滤版；源码在 source/，第三方来源与许可见 NOTICE.md。
// 构建生成文件，请修改源码后重新构建。
(() => {
  // node_modules/fflate/esm/browser.js
  var u8 = Uint8Array;
  var u16 = Uint16Array;
  var i32 = Int32Array;
  var fleb = new u8([
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
  var fdeb = new u8([
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
  var clim = new u8([16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15]);
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
  var flt = new u8(288);
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
  var fdt = new u8(32);
  for (i = 0; i < 32; ++i)
    fdt[i] = 5;
  var i;
  var flrm = /* @__PURE__ */ hMap(flt, 9, 1);
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
    return new u8(v.subarray(s, e));
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
      return buf || new u8(0);
    var noBuf = !buf;
    var resize = noBuf || st.i != 2;
    var noSt = st.i;
    if (noBuf)
      buf = new u8(sl * 3);
    var cbuf = function(l2) {
      var bl = buf.length;
      if (l2 > bl) {
        var nbuf = new u8(Math.max(bl * 2, l2));
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
          var ldt = new u8(tl);
          var clt = new u8(19);
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
  var et = /* @__PURE__ */ new u8(0);
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
  function gunzipSync(data, opts) {
    var st = gzs(data);
    if (st + 8 > data.length)
      err(6, "invalid gzip data");
    return inflt(data.subarray(st, -8), { i: 2 }, opts && opts.out || new u8(gzl(data)), opts && opts.dictionary);
  }
  var td = typeof TextDecoder != "undefined" && /* @__PURE__ */ new TextDecoder();
  var tds = 0;
  try {
    td.decode(et, { stream: true });
    tds = 1;
  } catch (e) {
  }

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
  function normalizeBody(body) {
    if (body instanceof Uint8Array) return body;
    if (body instanceof ArrayBuffer) return new Uint8Array(body);
    if (ArrayBuffer.isView(body)) return new Uint8Array(body.buffer, body.byteOffset, body.byteLength);
    throw new Error("\u54CD\u5E94\u4E0D\u662F\u4E8C\u8FDB\u5236\u6570\u636E");
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

  // source/request-policy.js
  function stripAdSignals(body) {
    return editBytes(body, 1, (context) => editBytes(context, 9, (signals) => concat(fields(signals).filter((field) => !(field.no === 1 && field.wire === 2)).map((field) => field.raw))));
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
    var _a2, _b2;
    const name = platform($request), route = $request.url.split("?")[0];
    try {
      const options = typeof $argument === "string" ? JSON.parse($argument) : {};
      if (/\/youtubei\/v1\/(browse|next|player|search)$/.test(route)) {
        if (options.blockAds === false) return $done({});
        const raw = normalizeBody($request.body);
        const body = raw[0] === 31 && raw[1] === 139 && raw[2] === 8 ? gunzipSync(raw) : raw;
        const changed = stripAdSignals(body);
        if (body.length === changed.length && body.every((byte, i) => byte === changed[i])) return $done({});
        const headers = { ...$request.headers };
        for (const key of Object.keys(headers)) {
          if (["content-length", "content-encoding"].includes(key.toLowerCase())) delete headers[key];
        }
        return $done({ body: changed, headers });
      }
      if (route.endsWith("/player/ad_break")) {
        if (options.blockAds === false) return $done({});
        return emptyPlayback();
      }
      if (route.endsWith("/log_event")) {
        const cached = (_a2 = readConfig($persistentStore)[name]) == null ? void 0 : _a2.clientKey;
        const headers = { ...$request.headers };
        for (const key of Object.keys(headers)) {
          const lower = key.toLowerCase();
          if (lower === "content-encoding" || !cached && lower === "x-youtube-hot-hash-data") delete headers[key];
        }
        return $done({ headers });
      }
      if (route.endsWith("/initplayback")) {
        const cached = (_b2 = readConfig($persistentStore)[name]) == null ? void 0 : _b2.encryptKey;
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
