# WeiboIntl - 微博轻享版去广告 Shadowrocket 模块

针对 iOS 微博轻享版 / 微博国际版（Weibo Intl）定制的 Shadowrocket 去广告模块。基于真实抓包日志深度调优，采用「传输层快速阻断 + 应用层 jq 精细清洗」双重过滤机制。

## 模块功能与特性

- **第一方广告连根拔起**：传输层直接阻断 `bootpreload.uve.weibo.com`（预下载）、`bootrealtime.uve.weibo.com`（实时下发）、`adimg.uve.weibo.com`（素材CDN），以及 `biz.weibo.com` 商业策略系统；
- **全灭第三方聚合广告兜底**：切断微博调用的腾讯广点通（GDT）、快手广告、申石广告、趣头条联盟、爱点击（AiClick）、触控移动等竞价瀑布流 SDK；
- **全时间线净化**：修复原版末尾 `$` 导致的正则脱靶问题，全面覆盖关注流（`friends_timeline`）、热门流（`unread_hot_timeline`）、分组流与话题容器流；
- **多维度广告特征识别**：精准剔除商业推广标、营销角标（`tag_struct`）、卡片广告（`card_type: 19`）等新型推广形态；
- **趋势与搜索优化**：移除搜索框推荐词与话题顶部置顶推广；
- **数据追踪阻断**：拦截友盟（Umeng）全系列统计与设备指纹上报。

## 模块订阅链接

在 Shadowrocket 中添加模块，链接填写：

```text
https://raw.githubusercontent.com/hyq58/WeiboIntl/main/WeiboIntl.sgmodule
```

## 使用说明

1. 确保 Shadowrocket 已开启 **HTTPS 解密 (MITM)** 并已信任 CA 根证书（设置 -> 通用 -> 关于本机 -> 证书信任设置）；
2. 在 Shadowrocket 中点击「模块」-> 右上角「+」-> 粘贴上方订阅链接并保存（已添加过则下拉刷新即可）；
3. 开启该模块后，彻底划掉微博轻享版后台，重新打开即可享受清爽界面。
