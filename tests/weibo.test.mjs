import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const read = name => readFile(new URL('../' + name, import.meta.url), 'utf8');
function bodyRules(module) {
  return module.split('\n').filter(line => line.startsWith('http-response-jq ')).map(line => {
    const [, pattern, quoted] = line.match(/^http-response-jq (\S+) '(.+)'$/) || [];
    assert.ok(pattern && quoted, '正文重写规则格式无效');
    return { line, pattern, expression: quoted };
  });
}
function jq(expression, body) {
  const result = spawnSync('jq', ['-c', expression], { input: JSON.stringify(body), encoding: 'utf8' });
  if (result.error?.code === 'ENOENT') throw new Error('微博验证需要维护电脑安装 jq；手机无需安装。');
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
}

test('独立微博和两个合并入口的全部 jq 表达式可编译', async () => {
  for (const name of ['WeiboIntl.sgmodule', 'AdFilter.sgmodule', 'AdFilterLocal.sgmodule']) {
    const rules = bodyRules(await read(name));
    assert.equal(rules.length, 6);
    for (const rule of rules) {
      // 编译实际发布的表达式，跳过运行，避免无关输入结构引起运行错误。
      jq(`if false then (${rule.expression}) else . end`, {});
    }
  }
});

test('关注流广告标记被过滤，普通内容和未知元数据保持原样', async () => {
  const rule = bodyRules(await read('WeiboIntl.sgmodule'))[0];
  for (const path of ['friends/timeline', 'friends_timeline', 'unread_friends_timeline']) {
    assert.ok(new RegExp(rule.pattern).test('https://api.weibo.cn/2/statuses/' + path + '?test=1'));
  }
  // 构造数据只验证现有广告条件；不视为用户实际抓包或完整广告覆盖。
  const normal = { id: 'normal', text: '正常关注内容', promotion: {}, tag_struct: [], other: { n: 23 } };
  const ads = [
    { id: 'label', mblogtypename: '广告' }, { id: 'promotion', promotion: { type: 'ad' } },
    { id: 'boolean', is_ad: true }, { id: 'integer', is_ad: 1 },
    { id: 'card', card_type: 19 }, { id: 'auth-title', content_auth_info: { content_auth_title: '广告' } },
    { id: 'tag', tag_struct: [{ tag_name: '广告' }] },
  ];
  const normalCard = { mblog: { id: 'normal-card', text: '正常内容' } };
  const original = { statuses: [normal, ...ads], cards: [{ mblog: { mblogtypename: '广告' } }, normalCard],
    ad: [{ id: 'slot' }], advertises: [{ id: 'insertion' }], trends: [], cursor: 'synthetic', extra: { v: 23 } };
  assert.deepEqual(jq(rule.expression, original), { statuses: [normal], cards: [normalCard], cursor: 'synthetic', extra: { v: 23 } });
  assert.deepEqual(jq(rule.expression, { cursor: 'keep', statuses: [] }), { cursor: 'keep', statuses: [] });
});

test('合并入口使用同一微博规则，当前来源哈希对应修复文件', async () => {
  const source = await read('WeiboIntl.sgmodule');
  for (const name of ['AdFilter.sgmodule', 'AdFilterLocal.sgmodule']) {
    const combined = await read(name);
    for (const rule of bodyRules(source)) assert.ok(combined.includes(rule.line));
  }
  const metadata = JSON.parse(await read('sources.json'));
  assert.equal(createHash('sha256').update(source).digest('hex'), metadata.weibo.currentSha256);
});
