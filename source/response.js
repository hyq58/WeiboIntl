import { transformPlayer, transformWatch } from './policy.js';
import { transformUmp } from './ump.js';
import { captureConfig, clearConfig, getClientKey, platform } from './state.js';
import { normalizeBody } from './wire.js';
import { processApi } from 'maasea-core';

function main() {
  const name = platform($request);
  let options = {};
  try {
    options = typeof $argument === 'string' ? JSON.parse($argument) : {};
    const body = normalizeBody($response.body);
    if (!body.length) return $done({});
    const route = $request.url.split('?')[0];
    const legacy = (endpoint, bytes) => {
      if (options.blockAds === false) return bytes;
      return processApi(endpoint, bytes, $request.headers, $persistentStore, {
        ...options, captionLang: 'off', blockUpload: false, blockImmersive: false, blockShorts: false,
      });
    };
    if (route.endsWith('/initplayback')) {
      if (Number($response.status) >= 300) return $done({});
      const key = getClientKey($persistentStore, name);
      const changed = transformUmp(body, key, options, (next) => legacy('next', next));
      return $done({ body: changed });
    }
    // 配置更新和内容过滤分别处理，配置提取失败不会阻止正常视频响应。
    try { captureConfig(body, $persistentStore, name); } catch {}
    const endpoint = route.split('/').pop();
    if (endpoint === 'player') return $done({ body: transformPlayer(body, options) });
    if (endpoint === 'get_watch') return $done({ body: transformWatch(body, options, 1, (next) => legacy('next', next)) });
    if (['browse', 'next', 'search', 'reel_watch_sequence'].includes(endpoint)) return $done({ body: legacy(endpoint, body) });
    // guide 与客户端设置不处理，保留上传、选段、Shorts 等原生界面。
  } catch {
    if ($request.url.split('?')[0].endsWith('/initplayback')) {
      try { clearConfig($persistentStore, name); } catch {}
    }
    if (options.debug) console.log('YouTube 本机处理未完成，本次保留原始响应。');
  }
  $done({});
}
main();
