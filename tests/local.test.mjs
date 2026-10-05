import test from 'node:test';
import assert from 'node:assert/strict';
import { createCipheriv, createDecipheriv, createHmac, createHash } from 'node:crypto';
import { gzipSync, gunzipSync } from 'node:zlib';
import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import vm from 'node:vm';
import { concat, bytesField, integerField, fields, getBytes, varint, encodeBase64, decodeBase64 } from '../source/wire.js';
import { transformPlayer, transformWatch } from '../source/policy.js';
import { readParts, writePart, transformUmp } from '../source/ump.js';
import { CONFIG_KEY, captureConfig, readConfig } from '../source/state.js';

// 所有密钥和播放内容都是本测试生成的假数据；不读取真实账户或设备配置。
const key = Uint8Array.from({ length: 32 }, (_, i) => i + 1);
const iv = Uint8Array.from({ length: 16 }, (_, i) => 100 + i);
const encryptedKey = Uint8Array.of(23, 42, 99);
const unknown = concat([
  bytesField(99, Uint8Array.of(21, 23)),
  concat([varint(100 * 8), Uint8Array.of(255, 255, 255, 255, 255, 255, 255, 255, 255, 1)]),
  concat([varint(101 * 8 + 1), new Uint8Array(8).fill(43)]),
  concat([varint(102 * 8 + 5), new Uint8Array(4).fill(44)]),
]);
const player = concat([bytesField(2, bytesField(11, bytesField(64657230, integerField(1, 0)))),
  bytesField(7, Uint8Array.of(3)), bytesField(68, Uint8Array.of(4)), unknown]);
const next = bytesField(99, Uint8Array.of(45));
const content = concat([bytesField(2, player), bytesField(3, next), bytesField(88, Uint8Array.of(46))]);
const plainUmp = bytesField(4, content);
const background = body => fields(getBytes(getBytes(getBytes(body, 2), 11), 64657230)).find(f => f.no === 1)?.value;
const noAds = body => assert.ok(fields(body).every(f => f.no !== 7 && f.no !== 68));
const sameBytes = (a, b) => assert.deepEqual(Buffer.from(a), Buffer.from(b));

function store() {
  const values = new Map();
  return { read: k => values.get(k), write: (v, k) => { values.set(k, v); return true; } };
}
function configured() {
  const s = store();
  s.write(JSON.stringify({ youtube: { clientKey: encodeBase64(key), encryptKey: encodeBase64(encryptedKey) } }), CONFIG_KEY);
  return s;
}
const code = Object.fromEntries(await Promise.all(['request', 'response'].map(async n =>
  [n, await readFile(new URL(`../scripts/youtube.local.${n}.js`, import.meta.url), 'utf8')])));
function runtime(kind, path, body, s = configured(), options = {}, headers = {}) {
  const calls = [];
  let networkCalls = 0;
  const deny = () => { networkCalls++; throw new Error('测试禁止网络调用'); };
  vm.runInNewContext(code[kind], {
    $request: { url: 'https://' + path, headers, body },
    $response: { body, status: 200 }, $argument: JSON.stringify(options),
    $persistentStore: s, $done: result => calls.push(result),
    $httpClient: new Proxy({}, { get: () => deny }), fetch: deny,
    $task: { fetch: deny }, console: { log() {} },
    Uint8Array, ArrayBuffer, DataView, TextEncoder, TextDecoder, setTimeout,
  }, { timeout: 2000 });
  assert.equal(calls.length, 1, '每次拦截必须且只能结束一次');
  assert.equal(networkCalls, 0, '本机脚本不得发起额外网络请求');
  return calls[0];
}
// 加密与认证使用 Node 原生实现作为独立参照，避免只测试同一套密码函数往返。
function envelope(plain, compression = 0) {
  const cipher = createCipheriv('aes-128-ctr', key.subarray(0, 16), iv);
  const encrypted = Buffer.concat([cipher.update(plain), cipher.final()]);
  const mac = createHmac('sha256', key.subarray(16)).update(encrypted).update(iv).digest();
  return concat([bytesField(1, encrypted), bytesField(2, mac), bytesField(3, iv), integerField(4, compression), bytesField(99, next)]);
}
function unwrap(part, compressed) {
  const encrypted = getBytes(part, 1), received = getBytes(part, 2);
  const resultIv = getBytes(part, 3);
  sameBytes(received, createHmac('sha256', key.subarray(16)).update(encrypted).update(resultIv).digest());
  sameBytes(resultIv, iv);
  sameBytes(getBytes(part, 99), next);
  const decipher = createDecipheriv('aes-128-ctr', key.subarray(0, 16), resultIv);
  const plain = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return compressed ? gunzipSync(plain) : plain;
}
const media = writePart(21, Uint8Array.of(23, 0, 255, 16));
function ump(encrypted) {
  return concat([writePart(10, integerField(1, 25)), writePart(11, encrypted), media, writePart(22, Uint8Array.of(23))]);
}

test('播放器只移除广告并打开后台播放，保留未知 64 位和固定宽度字段', () => {
  const result = transformPlayer(player, {});
  noAds(result); assert.equal(background(result), 1);
  sameBytes(concat(fields(result).filter(f => f.no >= 99).map(f => f.raw)), unknown);
  sameBytes(transformPlayer(player, { blockAds: false, backgroundPlayback: false }), player);
  sameBytes(transformPlayer(unknown, { blockAds: false }), unknown);
  const actual = runtime('response', 'youtubei.googleapis.com/youtubei/v1/player', player.buffer).body;
  sameBytes(actual, result);
});

test('普通 get_watch 支持多个内容块，保留 next 与未知字段', () => {
  const watch = concat([bytesField(1, content), bytesField(1, content), unknown]);
  const result = runtime('response', 'youtubei.googleapis.com/youtubei/v1/get_watch', watch).body;
  for (const item of fields(result).filter(f => f.no === 1)) {
    noAds(getBytes(item.data, 2)); assert.equal(background(getBytes(item.data, 2)), 1);
    sameBytes(getBytes(item.data, 3), next); sameBytes(getBytes(item.data, 88), Uint8Array.of(46));
  }
  sameBytes(concat(fields(result).filter(f => f.no >= 99).map(f => f.raw)), unknown);
});

for (const compression of [0, 1]) test(`UMP 加密播放处理：${compression ? 'gzip' : '未压缩'}、认证、媒体数据保留`, () => {
  const body = ump(envelope(compression ? gzipSync(plainUmp) : plainUmp, compression));
  const original = body.slice();
  const result = runtime('response', 'rr1---sn-test.googlevideo.com/initplayback?test=1', body).body;
  const parts = readParts(result);
  sameBytes(parts[2].raw, media); sameBytes(parts[0].raw, readParts(body)[0].raw);
  sameBytes(parts[3].raw, readParts(body)[3].raw); sameBytes(body, original);
  const decoded = unwrap(parts[1].data, compression === 1), edited = getBytes(getBytes(decoded, 4), 2);
  noAds(edited); assert.equal(background(edited), 1);
  sameBytes(getBytes(getBytes(decoded, 4), 3), next);
  const disabled = transformUmp(body, key, { blockAds: false, backgroundPlayback: false });
  sameBytes(unwrap(readParts(disabled)[1].data, compression === 1), plainUmp);
});

test('配置响应在本机捕获密钥；损坏缓存可恢复', () => {
  const s = store(); s.write('null', CONFIG_KEY);
  let config = concat([bytesField(1, key), bytesField(2, encryptedKey)]);
  for (const n of [146311580, 138536474, 7, 16, 1]) config = bytesField(n, config);
  captureConfig(config, s, 'youtube');
  sameBytes(decodeBase64(readConfig(s).youtube.clientKey), key);
  const s2 = store();
  runtime('response', 'youtubei.googleapis.com/youtubei/v1/log_event', config, s2);
  sameBytes(decodeBase64(readConfig(s2).youtube.encryptKey), encryptedKey);
});

test('initplayback 密钥匹配时保留 Google 原请求，失配时清缓存并触发原接口回退', () => {
  const request = bytesField(3, bytesField(5, encryptedKey));
  const result = runtime('request', 'rr1.googlevideo.com/initplayback', request);
  assert.equal(Object.keys(result).length, 0);
  const s = configured();
  const failed = runtime('request', 'rr1.googlevideo.com/initplayback', bytesField(3, bytesField(5, Uint8Array.of(9))), s);
  assert.equal(failed.response.status, 200); assert.equal(failed.response.body.length, 0);
  assert.equal(readConfig(s).youtube, undefined);
});

test('log_event 只移除规定的头部，缺配置时要求 Google 补发配置', () => {
  const headers = { 'Content-Encoding': 'gzip', 'X-YouTube-Hot-Hash-Data': 'synthetic', 'User-Agent': 'YouTube', other: 'keep' };
  const cached = runtime('request', 'youtubei.googleapis.com/youtubei/v1/log_event', new Uint8Array(), configured(), {}, headers).headers;
  assert.equal(cached['Content-Encoding'], undefined); assert.equal(cached['X-YouTube-Hot-Hash-Data'], 'synthetic');
  const missing = runtime('request', 'youtubei.googleapis.com/youtubei/v1/log_event', new Uint8Array(), store(), {}, headers).headers;
  assert.equal(missing['X-YouTube-Hot-Hash-Data'], undefined); assert.equal(missing.other, 'keep');
  assert.equal(headers['Content-Encoding'], 'gzip');
});

test('独立广告请求遵循广告开关；原生 guide 和 settings 不修改', () => {
  const path = 'youtubei.googleapis.com/youtubei/v1/player/ad_break';
  assert.equal(runtime('request', path, new Uint8Array()).response.status, 200);
  assert.equal(Object.keys(runtime('request', path, new Uint8Array(), configured(), { blockAds: false })).length, 0);
  for (const name of ['guide', 'settings']) {
    assert.equal(Object.keys(runtime('response', 'youtubei.googleapis.com/youtubei/v1/' + name, unknown)).length, 0);
  }
});

test('无配置、认证失败、未知压缩和截断响应保留原响应并清理本机配置', () => {
  const badMac = envelope(plainUmp); getBytes(badMac, 2)[0] ^= 1;
  const corrupt = [ump(badMac), ump(envelope(plainUmp, 2)), Uint8Array.of(10, 20, 1)];
  for (const body of corrupt) {
    const s = configured(); const result = runtime('response', 'rr1.googlevideo.com/initplayback', body, s);
    assert.equal(Object.keys(result).length, 0); assert.equal(readConfig(s).youtube, undefined);
  }
  assert.equal(Object.keys(runtime('response', 'rr1.googlevideo.com/initplayback', ump(envelope(plainUmp)), store())).length, 0);
  assert.equal(Object.keys(runtime('response', 'youtubei.googleapis.com/youtubei/v1/player', Uint8Array.of(0))).length, 0);
});

test('UMP 整数边界及非法前缀、截断长度', () => {
  for (const n of [0, 63, 127, 128, 16383, 16384, 2 ** 21 - 1, 2 ** 21, 2 ** 28 - 1, 2 ** 28, 2 ** 32 - 1]) {
    assert.equal(readParts(writePart(n, new Uint8Array()))[0].type, n);
  }
  for (const body of [Uint8Array.of(248, 0, 0, 0, 0, 0), Uint8Array.of(128), Uint8Array.of(1, 2, 0)]) assert.throws(() => readParts(body));
});

test('信息流过滤核心能在隔离环境运行，广告开关关闭时原样保留', () => {
  for (const name of ['browse', 'next', 'search', 'reel/reel_watch_sequence']) {
    const result = runtime('response', 'youtubei.googleapis.com/youtubei/v1/' + name, unknown);
    sameBytes(result.body, unknown);
    const disabled = runtime('response', 'youtubei.googleapis.com/youtubei/v1/' + name, unknown, configured(), { blockAds: false });
    sameBytes(disabled.body, unknown);
  }
});

test('模块匹配范围与自有脚本地址，YouTube 内容保持原样，来源文件哈希正确', async () => {
  const module = await readFile(new URL('../YouTubeLocal.sgmodule', import.meta.url), 'utf8');
  assert.equal(/workers\.dev/.test(module + code.request + code.response), false);
  assert.equal(/\{\{\{/.test(module), false);
  const rules = module.split('\n').filter(l => l.startsWith('youtube.local.')).map(line => ({
    name: line.split(' = ')[0], pattern: new RegExp(line.match(/pattern=([^,]+)/)[1]),
  }));
  assert.equal(rules.length, 5);
  for (const rule of rules) assert.equal(rule.pattern.test('https://example.com/youtubei/v1/player'), false);
  assert.ok(rules.find(r => r.name.endsWith('.ump')).pattern.test('https://rr1---sn-test.googlevideo.com/initplayback?abc=1'));
  assert.ok(rules.find(r => r.name.endsWith('.response')).pattern.test('https://youtubei.googleapis.com/youtubei/v1/reel/reel_watch_sequence'));
  const urls = [...module.matchAll(/script-path=([^,]+)/g)].map(m => m[1]);
  for (const url of urls) {
    assert.ok(url.startsWith('https://raw.githubusercontent.com/hyq58/WeiboIntl/main/'));
    await readFile(new URL('../' + url.split('/main/')[1], import.meta.url));
  }
  const quicRules = ['AND,((DOMAIN-SUFFIX,googlevideo.com),(PROTOCOL,UDP)),REJECT', 'AND,((DOMAIN,youtubei.googleapis.com),(PROTOCOL,UDP)),REJECT'];
  for (const rule of quicRules) assert.ok(module.includes(rule + '\n'), rule);
  const withoutQuic = module.replace(/\[Rule\]\n#[^\n]*\n(?:AND,[^\n]*\n)+\n/, '');
  sameBytes(Buffer.from(withoutQuic), execFileSync('git', ['show', '9a29f69a9be253f4125ed98a9759ed16336ddcb6:YouTubeLocal.sgmodule']));
  for (const f of ['YouTubeNoAd.sgmodule', 'scripts/youtube.local.request.js', 'scripts/youtube.local.response.js']) {
    sameBytes(await readFile(new URL('../' + f, import.meta.url)), execFileSync('git', ['show', '9a29f69a9be253f4125ed98a9759ed16336ddcb6:' + f]));
  }
  const source = JSON.parse(await readFile(new URL('../sources-local.json', import.meta.url), 'utf8'));
  for (const [file, hash] of Object.entries(source.sha256)) {
    assert.equal(createHash('sha256').update(await readFile(new URL('../' + file, import.meta.url))).digest('hex'), hash, file);
  }
  const combined = await readFile(new URL('../AdFilterLocal.sgmodule', import.meta.url), 'utf8');
  assert.equal((combined.match(/\[MITM\]/g) || []).length, 1);
  assert.ok(combined.includes('api.weibo.cn, weibointl.api.weibo.cn, *.googlevideo.com, youtubei.googleapis.com'));
});
