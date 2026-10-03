import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// 以两个独立模块为基础生成合并入口；微博规则只在原文件维护。
const root = fileURLToPath(new URL('../', import.meta.url));
const base = 'https://raw.githubusercontent.com/hyq58/WeiboIntl/main';
const read = (file) => readFile(path.join(root, file), 'utf8');
const write = (file, text) => writeFile(path.join(root, file), text);
const { youtube: settings } = JSON.parse(await read('settings.json'));
const boolKeys = ['blockUpload', 'blockImmersive', 'blockShorts', 'debug'];
if (!settings || boolKeys.some((key) => typeof settings[key] !== 'boolean') ||
    typeof settings.captionLang !== 'string' || !/^(off|[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*)$/.test(settings.captionLang)) {
  throw new Error('YouTube 设置无效：开关须为布尔值，翻译语言须为 off 或语言代码。');
}

function sections(text) {
  const result = new Map();
  let current;
  for (const line of text.split(/\r?\n/)) {
    const heading = line.match(/^\[([^\]]+)\]$/);
    if (heading) {
      current = heading[1];
      if (result.has(current)) throw new Error(`模块存在重复段落：${current}`);
      result.set(current, []);
    } else if (current) {
      result.get(current).push(line);
    }
  }
  return result;
}

const upstream = sections(await read('upstream/YouTube.Enhance.sgmodule'));
const tokens = {
  '字幕翻译语言': settings.captionLang,
  '屏蔽上传按钮': settings.blockUpload,
  '屏蔽选段按钮': settings.blockImmersive,
  '屏蔽Shorts按钮': settings.blockShorts,
  '启用调试模式': settings.debug,
};
const youtubeScripts = upstream.get('Script').join('\n').trim()
  .replaceAll('https://raw.githubusercontent.com/Maasea/sgmodule/master/Script/Youtube/', `${base}/scripts/`)
  .replace(/\{\{\{([^}]+)\}\}\}/g, (_, key) => {
    if (!(key in tokens)) throw new Error(`未知上游参数：${key}`);
    return String(tokens[key]);
  });
const youtube = [
  '#!name = YouTube 个人广告过滤',
  '#!desc = 以后台播放与播放广告过滤为重点，基于 Maasea YouTube Enhance；个人参数在 settings.json 中维护。',
  '#!author = Maasea；个人配置维护 hyq58',
  `#!url = ${base}/YouTubeNoAd.sgmodule`,
  '',
  '# 修改说明：沿用上游规则，固定个人参数，将脚本下载地址改为本仓库。',
  '# 上游许可：Apache-2.0，见 licenses/Maasea-Apache-2.0.txt。',
  '# 上游脚本保留部分增强功能及运行期外部服务调用，详见 README.md。',
  '', '[Script]', youtubeScripts, '', '[MITM]',
  upstream.get('MITM').join('\n').trim(), '',
].join('\n');
const weibo = await read('WeiboIntl.sgmodule');
async function generateCombined(youtubeText, local = false) {
  const sources = [sections(weibo), sections(youtubeText)];
  const merged = [
    local ? '#!name = 个人广告过滤（微博＋YouTube 本机处理版）' : '#!name = 个人广告过滤（微博＋YouTube）',
    local ? '#!desc = 微博沿用原规则；YouTube 在小火箭本机处理，无作者 Worker 依赖。' : '#!desc = 微博轻享版/国际版与 YouTube 个人过滤配置；与独立模块二选一启用。',
    local ? '#!author = iab0x00, kokoryh, Antigravity, Maasea, isinglever；整合维护 hyq58' : '#!author = iab0x00, kokoryh, Antigravity, Maasea；整合维护 hyq58',
    `#!url = ${base}/${local ? 'AdFilterLocal' : 'AdFilter'}.sgmodule`,
    '', local ? '# 自动生成：修改 WeiboIntl.sgmodule 或 local-settings.json 后运行 npm run build。' : '# 自动生成：修改 WeiboIntl.sgmodule 或 settings.json 后运行 node tools/build.mjs。',
    '# 修改说明：合并两个独立模块，去重 MITM 主机名，保留各自来源与许可边界。',
    '',
  ];
  const supported = ['Rule', 'URL Rewrite', 'Body Rewrite', 'Script', 'MITM'];
  for (const source of sources) {
    for (const section of source.keys()) {
      if (!supported.includes(section)) throw new Error(`合并器尚未支持段落：${section}`);
    }
  }
  for (const section of supported.filter((name) => name !== 'MITM')) {
    const blocks = sources.map((source, index) => ({ index, text: source.get(section)?.join('\n').trim() }))
      .filter((block) => block.text);
    if (!blocks.length) continue;
    merged.push(`[${section}]`);
    for (const { index, text } of blocks) {
      merged.push(`# ${index === 0 ? '微博轻享版 / 国际版' : 'YouTube'}`, text, '');
    }
  }
  const hosts = new Set();
  for (const source of sources) {
    for (const line of source.get('MITM') ?? []) {
      if (!line.trim() || line.startsWith('#')) continue;
      const match = line.match(/^hostname\s*=\s*%APPEND%\s*(.+)$/);
      if (!match) throw new Error(`无法安全合并 MITM 配置：${line}`);
      for (const host of match[1].split(',')) hosts.add(host.trim());
    }
  }
  merged.push('[MITM]', `hostname = %APPEND% ${[...hosts].join(', ')}`, '');
  await write(local ? 'AdFilterLocal.sgmodule' : 'AdFilter.sgmodule', merged.join('\n'));
}
await write('YouTubeNoAd.sgmodule', youtube);
await generateCombined(youtube);
await generateCombined(await read('YouTubeLocal.sgmodule'), true);
console.log('已生成旧版入口及 AdFilterLocal.sgmodule 本机处理版合并入口。');
