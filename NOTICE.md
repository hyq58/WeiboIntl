# 来源、许可与修改说明

## 本仓库新增实现

`source/` 下除 `source/vendor/` 外的本机处理代码、`tools/build-local.mjs` 与 `tests/local.test.mjs` 为 hyq58 的个人整合实现，按 Apache-2.0 提供，许可全文见 `licenses/Maasea-Apache-2.0.txt`。对应生成脚本中的第三方组件仍保留各自许可。

修改包括：保留未知字段的 protobuf 读写；独立广告 / 后台播放开关；本机配置捕获与缓存隔离；UMP 解析、认证、解密与重新加密；失配及异常回退；关闭外部网络客户端的信息流核心封装；自有 GitHub 脚本地址及模块合并。使用的协议定义原文保存在 `upstream/local-protocol/`，该目录仅供维护参考。

## Maasea 信息流核心

- 来源：[Maasea/sgmodule](https://github.com/Maasea/sgmodule/tree/65075cdb388fc5e3094afd7e7314c67b243f3525)。
- 固定提交：`65075cdb388fc5e3094afd7e7314c67b243f3525`。
- 许可：Apache-2.0，全文见 `licenses/Maasea-Apache-2.0.txt`。
- `source/vendor/maasea.response.js` 保留该版本的原始响应脚本；与既有 `scripts/youtube.response.js` 字节一致。
- 构建时外层封装修改运行环境：只用于信息流 / 搜索 / Shorts 序列 / next 的过滤，字幕翻译关闭、按钮保留、网络客户端禁用、缓存名称隔离。普通播放器及加密播放由本仓库新增源码处理。
- 旧 `scripts/youtube.request.js`、`scripts/youtube.response.js`、`upstream/YouTube.Enhance.sgmodule` 继续作为旧版回退来源保留，校验见 `sources.json`；本机模块不加载旧请求脚本。

## isinglever 协议与 UMP 参考

- 来源：[isinglever/adguard 的 source/youtube](https://github.com/isinglever/adguard/tree/62ece5097026f4552f599cac0a8b5a9f4102e90e/source/youtube)。
- 固定提交：`62ece5097026f4552f599cac0a8b5a9f4102e90e`。
- 该目录许可为 Apache-2.0，原文见 `licenses/isinglever-Apache-2.0.txt`。
- 原文协议资料和 `lib/ump.js` 保存在 `upstream/local-protocol/`。参考客户端配置字段路径、播放器 / watch / Onesie 字段结构、UMP 分段编码，以及 AES-CTR 与 HMAC-SHA256 格式；本机解析和过滤实现见 `source/`，使用 noble 库替代参考代码中的 CryptoJS。
- 未复制缺乏统一明确许可的其他仓库的新增本机处理脚本。

## 打包组件

| 组件 | 固定版本 | 来源 | 许可全文 |
| --- | --- | --- | --- |
| @noble/ciphers | 1.3.0 | [paulmillr/noble-ciphers](https://github.com/paulmillr/noble-ciphers) | `licenses/noble-ciphers-MIT.txt` |
| @noble/hashes | 1.8.0 | [paulmillr/noble-hashes](https://github.com/paulmillr/noble-hashes) | `licenses/noble-hashes-MIT.txt` |
| fflate | 0.8.2 | [101arrowz/fflate](https://github.com/101arrowz/fflate) | `licenses/fflate-MIT.txt` |

构建工具 esbuild 固定为 0.25.10，仅在维护电脑上运行。依赖完整性由 `package-lock.json` 固定，协议资料与许可哈希见 `sources-local.json`。MIT 组件的版权及许可全文随仓库提供，本文件也作为打包脚本的来源声明。

## 微博许可边界

微博继承本仓库历史模块，保留 iab0x00、kokoryh、Antigravity 的来源声明。既有微博规则未附独立开源许可证，本次保持原样；新增 YouTube 源码的许可不覆盖或重新授权微博部分。本仓库没有把所有文件统一声明为 Apache-2.0。
