# 个人广告过滤（微博＋YouTube）

这是 hyq58 自用的 Shadowrocket 广告过滤项目，集中维护微博轻享版 / 国际版和 YouTube 的个人配置。仓库沿用 `WeiboIntl` 名称，保留原微博模块地址。

## 选择一个入口

| 入口 | 内容 | 使用场景 |
| --- | --- | --- |
| [AdFilter.sgmodule](https://raw.githubusercontent.com/hyq58/WeiboIntl/main/AdFilter.sgmodule) | 微博＋YouTube | 希望只维护、启用一个模块 |
| [WeiboIntl.sgmodule](https://raw.githubusercontent.com/hyq58/WeiboIntl/main/WeiboIntl.sgmodule) | 微博轻享版 / 国际版 | 单独使用微博，或单独开关、排查 |
| [YouTubeNoAd.sgmodule](https://raw.githubusercontent.com/hyq58/WeiboIntl/main/YouTubeNoAd.sgmodule) | YouTube | 单独使用 YouTube，或单独开关、排查 |

**选择合并模块，或选择需要的独立模块。请不要同时开启合并模块与其中的独立模块，以免重复处理同一请求。** 更新旧微博模块不会自动启用 YouTube；要一起使用，请导入合并入口。

在 Shadowrocket 的模块页面添加上表中的链接并启用。响应重写需要开启 HTTPS 解密（MITM），安装并信任该客户端生成的 CA 证书。首次启用或更新后，重新打开目标 App 进行验证。

## 当前范围与个人设置

- **微博**：沿用仓库既有的轻享版 / 国际版过滤规则，包含开屏、时间线推广、部分第三方广告域名与页面净化。本次没有新增或修改微博过滤条件。部分域名阻断会作用于其他 App；这是现有规则的行为。
- **YouTube**：以后台播放和播放过程中的广告过滤为个人使用重点。基于 Maasea 的 YouTube Enhance 模块，下载固定版本的两个请求 / 响应处理脚本，并从本仓库提供。保留上游的后台播放及广告数据处理，不隐藏上传、选段、Shorts 按钮，不启用字幕翻译。上游脚本还包含部分播放增强功能，本次没有拆分或新增这些功能。
- **合并入口**：按段落合并两者，MITM 主机名去重。微博和 YouTube 仍分别维护。

`settings.json` 是 YouTube 个人参数的唯一编辑入口：

| 参数 | 默认值 | 含义 |
| --- | --- | --- |
| `captionLang` | `"off"` | 关闭字幕翻译；可改为 `"zh-Hans"` |
| `blockUpload` | `false` | 保留上传按钮 |
| `blockImmersive` | `false` | 保留选段按钮 |
| `blockShorts` | `false` | 保留 Shorts 按钮 |
| `debug` | `false` | 关闭调试日志 |

参数会在生成时写入模块，不依赖客户端替换模板占位符。调整参数后须重新生成并发布，再在手机刷新模块。

## 维护方式

```text
WeiboIntl.sgmodule                  微博规则源文件；旧链接持续保留
settings.json                      YouTube 个人参数
upstream/YouTube.Enhance.sgmodule    固定的上游模块原文
scripts/youtube.response.js        固定的上游响应脚本
scripts/youtube.request.js         固定的上游请求脚本
YouTubeNoAd.sgmodule                自动生成的 YouTube 独立入口
AdFilter.sgmodule                   自动生成的合并入口
sources.json                       上游版本与文件校验值
licenses/Maasea-Apache-2.0.txt       YouTube 来源许可证
```

修改 `WeiboIntl.sgmodule` 或 `settings.json` 后，在仓库目录运行：

```sh
node tools/build.mjs
```

将源文件及生成文件一起提交到 GitHub。请不要直接编辑生成的两个模块，下次构建会覆盖它们。新增平台需要扩展合并器，本项目当前只覆盖上述两个目标。

上游更新采用人工审查方式：核对变化、更新固定来源与校验值、重新生成、做客户端验证后再发布。没有自动追随上游最新脚本。

## 来源与许可

- 微博模块继承本仓库历史版本，保留 `iab0x00`、`kokoryh`、Antigravity 的来源声明。既有微博部分未附独立开源许可证；本项目不把它重新声明为 Apache-2.0，也不宣称有额外的再分发授权。
- YouTube 来源为 [Maasea/sgmodule](https://github.com/Maasea/sgmodule)，固定提交 `65075cdb388fc5e3094afd7e7314c67b243f3525`。上游模块原文及两个脚本保持原文，许可证见 `licenses/Maasea-Apache-2.0.txt`。个人模块的改动为固定参数、调整脚本下载地址和添加合并入口；改动说明也已写入生成模块。
- 本次直接使用原作者模块，没有复制 iab0x00 的 YouTube 转载配置。

**运行时依赖**：YouTube 请求脚本的部分处理仍会访问 `init-stream.maasea.workers.dev`。脚本下载由本仓库提供，并不代表全部运行逻辑均由本仓库独立提供。

## 验证边界与回退

构建检查确认模块结构、脚本地址、参数和语法，并使用构造的播放器二进制响应验证：广告槽位被移除、后台播放字段启用、无关字段保留。这些结果不能证明当前 App 版本的广告已经过滤或锁屏播放正常。原微博说明中提及的抓包结论不视为本次重新验证的结果。

手机需实际检查微博开屏 / 关注流 / 热门流。YouTube 优先验证：打开视频后锁屏或切到其他 App，确认声音持续；观看几段较长视频，检查片头及播放中广告是否出现，并检查拖动进度、切换视频和播放恢复。另确认搜索、Shorts、登录、评论等正常功能仍可用。如果合并入口异常，可停用它，启用需要的独立模块，缩小问题范围。网页和桌面客户端不在本次验证范围内。

本次发布前的微博版本为提交 `71675093db11c961ef75acfcf5817ab4053d0feb`，可通过 Git 历史恢复。旧微博模块内容在本次整合中保持原样。
