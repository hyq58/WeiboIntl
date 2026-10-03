import { decodeBase64, encodeBase64, getBytes } from './wire.js';

// 与旧 Worker 版缓存隔离，避免切换模块时混用密钥状态。
export const CONFIG_KEY = 'YouTubeLocalConfig-v1';

export function platform(request) {
  return Object.entries(request.headers || {}).some(([key, value]) =>
    key.toLowerCase() === 'user-agent' && /music/i.test(String(value))) ? 'youtubeMusic' : 'youtube';
}

export function readConfig(store) {
  try {
    const value = JSON.parse(store.read(CONFIG_KEY) || '{}');
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  } catch { return {}; }
}

export function clearConfig(store, name) {
  const config = readConfig(store);
  delete config[name];
  store.write(JSON.stringify(config), CONFIG_KEY);
}

export function captureConfig(body, store, name) {
  // 字段路径来自 Apache-2.0 的 response/config.proto；只读取已有响应，不发起请求。
  let current = body;
  for (const no of [1, 16, 7, 138536474, 146311580]) {
    current = getBytes(current, no);
    if (!current) return;
  }
  const clientKey = getBytes(current, 1), encryptKey = getBytes(current, 2);
  if (clientKey?.length !== 32 || !encryptKey?.length) return;
  const config = readConfig(store);
  config[name] = { clientKey: encodeBase64(clientKey), encryptKey: encodeBase64(encryptKey) };
  store.write(JSON.stringify(config), CONFIG_KEY);
}

export function getClientKey(store, name) {
  const encoded = readConfig(store)[name]?.clientKey;
  if (!encoded) throw new Error('缺少本机播放配置');
  const key = decodeBase64(encoded);
  if (key.length !== 32) throw new Error('本机播放配置长度无效');
  return key;
}
