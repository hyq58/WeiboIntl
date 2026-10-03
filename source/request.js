import { decodeBase64, getBytes, normalizeBody } from './wire.js';
import { clearConfig, platform, readConfig } from './state.js';

// 仅改写小火箭当前拦截的请求；没有 fetch、转发服务或 Worker 重定向。
function main() {
  const name = platform($request), route = $request.url.split('?')[0];
  try {
    const options = typeof $argument === 'string' ? JSON.parse($argument) : {};
    if (route.endsWith('/player/ad_break')) {
      if (options.blockAds === false) return $done({});
      return emptyPlayback();
    }
    if (route.endsWith('/log_event')) {
      const cached = readConfig($persistentStore)[name]?.clientKey;
      const headers = { ...$request.headers };
      for (const key of Object.keys(headers)) {
        const lower = key.toLowerCase();
        if (lower === 'content-encoding' || (!cached && lower === 'x-youtube-hot-hash-data')) delete headers[key];
      }
      return $done({ headers });
    }
    if (route.endsWith('/initplayback')) {
      const cached = readConfig($persistentStore)[name]?.encryptKey;
      const body = normalizeBody($request.body);
      const request = getBytes(body, 3);
      const key = request && getBytes(request, 5);
      const expected = cached && decodeBase64(cached);
      if (key && expected && key.length === expected.length && key.every((byte, i) => byte === expected[i])) return $done({});
      clearConfig($persistentStore, name);
      return emptyPlayback();
    }
  } catch {
    // 异常请求保持原样，不把解析失败变成播放中断，也不记录密钥或播放地址。
  }
  $done({});
}

function emptyPlayback() {
  $done({ response: { status: 200, headers: { 'Content-Type': 'application/x-protobuf' }, body: new Uint8Array() } });
}
main();
