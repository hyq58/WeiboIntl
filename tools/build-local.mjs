import { build } from 'esbuild';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const base = 'https://raw.githubusercontent.com/hyq58/WeiboIntl/main';
const settings = JSON.parse(await readFile(path.join(root, 'local-settings.json'), 'utf8')).youtube;
const switches = ['backgroundPlayback', 'blockAds', 'blockUpload', 'blockShorts', 'blockImmersive', 'debug'];
if (!settings || switches.some((key) => typeof settings[key] !== 'boolean') ||
    settings.captionLang !== 'off' || ['blockUpload', 'blockShorts', 'blockImmersive'].some((key) => settings[key])) {
  throw new Error('本机版参数无效；本版保留按钮并关闭翻译，后台播放、广告过滤及调试可单独切换。');
}

const banner = '// 个人本机播放过滤版；源码在 source/，第三方来源与许可见 NOTICE.md。\n// 构建生成文件，请修改源码后重新构建。';
for (const entry of ['request', 'response']) {
  await build({
    absWorkingDir: root, entryPoints: [`source/${entry}.js`],
    outfile: `scripts/youtube.local.${entry}.js`, bundle: true,
    format: 'iife', target: 'es2018', minify: false, legalComments: 'inline',
    banner: { js: banner },
    plugins: [{
      name: 'maasea-local-core',
      setup(context) {
        context.onResolve({ filter: /^maasea-core$/ }, () => ({ path: 'core', namespace: 'local' }));
        context.onLoad({ filter: /.*/, namespace: 'local' }, async () => {
          const original = await readFile(path.join(root, 'source/vendor/maasea.response.js'), 'utf8');
          // 把既有 Apache-2.0 核心封装为同步内容过滤函数；屏蔽外部网络客户端。
          return { loader: 'js', contents: `export function processApi(endpoint, body, headers, store, options) {
            const $request = {url: 'https://youtubei.googleapis.com/youtubei/v1/' + endpoint, headers};
            const $response = {body}; const $argument = JSON.stringify(options);
            const $task = undefined, $loon = undefined;
            const $persistentStore = {read: key => store.read(key === 'YouTubeAdvertiseInfo' ? 'YouTubeLocalAdvertiseInfo-v1' : key),
              write: (value, key) => store.write(value, key === 'YouTubeAdvertiseInfo' ? 'YouTubeLocalAdvertiseInfo-v1' : key)};
            const $notification = {post() {}};
            const $httpClient = new Proxy({}, {get() {return () => {throw new Error('本机核心不允许外部请求');};}});
            let result; const $done = value => {result = value;};
            ${original}
            return result?.body ? new Uint8Array(result.body) : body;
          }` };
        });
      },
    }],
  });
}

const argument = JSON.stringify(settings);
const scripts = [
  `youtube.local.ad-break = type=http-request,pattern=^https:\\/\\/youtubei\\.googleapis\\.com\\/youtubei\\/v1\\/player\\/ad_break(?:\\?.*)?$,script-path=${base}/scripts/youtube.local.request.js,argument="${argument}"`,
  `youtube.local.init = type=http-request,pattern=^https?:\\/\\/[\\w-]+\\.googlevideo\\.com\\/initplayback(?:\\?.*)?$,requires-body=1,max-size=-1,binary-body-mode=1,script-path=${base}/scripts/youtube.local.request.js,argument="${argument}"`,
  `youtube.local.log = type=http-request,pattern=^https:\\/\\/youtubei\\.googleapis\\.com\\/youtubei\\/v1\\/log_event(?:\\?.*)?$,requires-body=1,max-size=-1,binary-body-mode=1,script-path=${base}/scripts/youtube.local.request.js,argument="${argument}"`,
  `youtube.local.response = type=http-response,pattern=^https:\\/\\/youtubei\\.googleapis\\.com\\/youtubei\\/v1\\/(browse|next|player|search|reel\\/reel_watch_sequence|get_watch|log_event|config)(?:\\?.*)?$,requires-body=1,max-size=-1,binary-body-mode=1,script-path=${base}/scripts/youtube.local.response.js,argument="${argument}"`,
  `youtube.local.ump = type=http-response,pattern=^https?:\\/\\/[\\w-]+\\.googlevideo\\.com\\/initplayback(?:\\?.*)?$,requires-body=1,max-size=-1,binary-body-mode=1,script-path=${base}/scripts/youtube.local.response.js,argument="${argument}"`,
];
const youtube = [
  '#!name = YouTube 广告过滤与后台播放（本机处理版）',
  '#!desc = 加密播放响应在小火箭本机处理，无作者 Worker 依赖；实际播放效果需真机验证。',
  '#!author = Maasea, isinglever；本机整合维护 hyq58',
  `#!url = ${base}/YouTubeLocal.sgmodule`,
  '', '# 修改说明：本机密钥管理、播放流处理及个人参数；第三方来源见 NOTICE.md。',
  '[Rule]',
  '# 禁用 YouTube QUIC：QUIC 无法被本机 MITM 解密，播放流走 QUIC 时 initplayback 去广告失效；拒绝后回落 TCP',
  'AND,((DOMAIN-SUFFIX,googlevideo.com),(PROTOCOL,UDP)),REJECT',
  'AND,((DOMAIN,youtubei.googleapis.com),(PROTOCOL,UDP)),REJECT',
  '', '[Script]', ...scripts, '', '[MITM]',
  'hostname = %APPEND% *.googlevideo.com, youtubei.googleapis.com', '',
].join('\n');
await writeFile(path.join(root, 'YouTubeLocal.sgmodule'), youtube);
console.log('已生成 YouTubeLocal.sgmodule 及两个本机处理脚本。');
