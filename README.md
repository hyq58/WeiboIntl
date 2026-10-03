# 个人广告过滤（微博＋YouTube）

这是 hyq58 自用的 Shadowrocket 广告过滤项目。微博轻享版 / 国际版和 YouTube 分别维护，同时提供合并入口。仓库沿用 `WeiboIntl` 名称。

YouTube 的个人目标是 **后台播放，以及片头和播放过程中的广告过滤**。新增本机处理版：配置提取、播放响应解密、过滤、重新加密都在小火箭中运行，不再重定向到原作者的 Worker。脚本由本仓库提供，密码与压缩组件已经打包，不需要部署 VPS 服务。

## 选择入口

| 入口 | 内容 | 使用场景 |
| --- | --- | --- |
| [AdFilterLocal.sgmodule](https://raw.githubusercontent.com/hyq58/WeiboIntl/main/AdFilterLocal.sgmodule) | 微博＋YouTube 本机处理版 | 推荐：只启用一个合并模块 |
| [YouTubeLocal.sgmodule](https://raw.githubusercontent.com/hyq58/WeiboIntl/main/YouTubeLocal.sgmodule) | YouTube 本机处理版 | 只需要 YouTube，或分别排查 |
| [WeiboIntl.sgmodule](https://raw.githubusercontent.com/hyq58/WeiboIntl/main/WeiboIntl.sgmodule) | 微博轻享版 / 国际版 | 单独使用微博，原地址保留 |

**合并入口与独立入口二选一。** 使用 `AdFilterLocal` 时，停用旧 `AdFilter`、旧 `YouTubeNoAd`、独立 `YouTubeLocal` 和独立微博模块，避免同一请求被重复处理。也应停用配置中其他匹配 YouTube 接口的广告重写模块。

在 Shadowrocket 的模块页面添加链接并启用。需要开启 HTTPS 解密（MITM），安装并信任小火箭生成的 CA 证书。模块附加所需主机名。首次启用或更新后，彻底退出并重新打开 YouTube，让它重新获取播放配置，再开始测试。

## 当前行为

- **微博**：沿用原有开屏、时间线推广和部分广告域名规则，本次字节保持原样。原规则中的部分域名阻断也可能作用于其他 App。
- **YouTube 普通接口**：移除播放器广告字段，启用后台播放；处理 `player`、`get_watch`、信息流、搜索及 Shorts 序列里的广告数据。
- **YouTube 加密播放接口**：从已有 Google 配置响应提取客户端播放配置，在本机处理 `initplayback` 的加密 UMP 数据，再保留视频媒体分段及未涉及的协议字段。
- **配置尚未获取或已经失配**：清理本机缓存，通过空播放初始化响应尝试让 App 回退到普通播放接口；后续由 Google 原接口补发配置，不调用第三方转换服务。
- **遇到不支持的协议、压缩格式或损坏响应**：保留原始响应。此时可能仍有广告或后台播放未生效，需要根据实际版本再微调。

不强制画质、下载、倍速或 JumpAhead，不隐藏上传、选段和 Shorts 按钮，不启用字幕翻译。网页及桌面客户端不属于当前验证范围；YouTube Music 仅做配置缓存隔离，未做真机验收。

本机播放配置只写入小火箭自己的持久化存储，不上传 GitHub、不打印密钥或播放地址。模块和脚本更新仍需要访问本仓库的 GitHub Raw；正常视频播放仍访问 Google / YouTube。

## 个人微调

本机版使用 `local-settings.json`，旧版继续使用 `settings.json`，两者相互独立。

| 本机版参数 | 默认值 | 含义 |
| --- | --- | --- |
| `backgroundPlayback` | `true` | 启用后台播放字段改写 |
| `blockAds` | `true` | 启用 YouTube 广告过滤及广告接口拦截 |
| `debug` | `false` | 关闭调试；打开时仅记录通用失败提示 |
| `captionLang` | `"off"` | 本机版固定关闭字幕翻译 |
| `blockUpload` / `blockImmersive` / `blockShorts` | `false` | 本机版固定保留原生按钮 |

`blockAds` 只控制 YouTube；微博开关通过选择模块实现。上述参数写进生成模块，修改后需要构建、提交发布，并在手机上刷新模块。视频协议字段的细调在 `source/policy.js`、`source/ump.js`；微博仍在 `WeiboIntl.sgmodule` 编辑。

## 自行维护

```text
WeiboIntl.sgmodule                  微博规则源文件
local-settings.json                本机 YouTube 个人参数
source/request.js                  请求处理与本机配置回退
source/response.js                 响应入口与异常回退
source/policy.js                    播放器广告 / 后台播放字段处理
source/ump.js                      本机 UMP 解密、过滤、重新加密
source/wire.js                     保留未知字段的 protobuf 读写
source/state.js                    本机配置缓存
source/vendor/maasea.response.js    固定的 Apache 信息流过滤核心
scripts/youtube.local.*.js         自动打包的本机运行脚本
YouTubeLocal.sgmodule              自动生成的本机独立入口
AdFilterLocal.sgmodule             自动生成的本机合并入口
upstream/local-protocol/           固定的协议参考原文，不在手机加载
sources-local.json                 固定来源、依赖版本与哈希
NOTICE.md / licenses/              来源、改动说明与许可证
```

首次准备构建环境，在仓库目录运行：

```sh
npm ci
npm run build
npm test
```

后续修改后运行 `npm run build` 与 `npm test`。将源码、参数、生成脚本及模块一起提交到 GitHub；不提交 `node_modules`。不要直接修改生成文件。运行脚本已包含密码与压缩组件，手机不需要 npm 或额外依赖下载。

来源与依赖版本固定，上游更新由自己审查和选择；没有自动追随作者偏好的功能更新。本机版复用许可明确的 Apache-2.0 协议资料和信息流核心，以及 MIT 密码 / 压缩库。完整来源见 [NOTICE.md](NOTICE.md)。

## 验证与回退

自动验证覆盖普通播放器和 `get_watch`、未压缩 / gzip 加密 UMP、独立密码实现的认证与解密核对、视频媒体分段及未知字段保留、配置捕获、请求回退、异常保留、无额外网络调用、模块地址与固定来源哈希。本机脚本中没有原作者 Worker 地址。

**这些是构造样本和模拟运行环境的验证，手机上的锁屏播放、真实片头 / 中插广告和当前 App 版本兼容性仍需实际验收。** 建议依次检查：

1. 打开视频后锁屏、切到其他 App，确认声音连续。
2. 观看几段较长视频，检查片头及中途广告，测试拖动进度、切换视频和恢复播放。
3. 确认搜索、Shorts、评论、登录正常，微博检查开屏及关注 / 热门流。

发生异常时先停用本机模块。旧 [AdFilter.sgmodule](https://raw.githubusercontent.com/hyq58/WeiboIntl/main/AdFilter.sgmodule) 和 [YouTubeNoAd.sgmodule](https://raw.githubusercontent.com/hyq58/WeiboIntl/main/YouTubeNoAd.sgmodule) 地址与内容继续保留，可单独启用回退；旧 YouTube 版仍依赖 `init-stream.maasea.workers.dev`，并带有原作者的部分额外增强功能。

本机版发布前的仓库提交为 `b75db547051c9b0e22f01ca0f67cf8cf468e03e6`；整合前的微博版本为 `71675093db11c961ef75acfcf5817ab4053d0feb`。可通过 Git 历史恢复。
