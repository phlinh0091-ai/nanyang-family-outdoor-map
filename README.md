# 南阳亲子户外地图

这是一个面向手机浏览的南阳亲子户外地点地图。用户主动点击“定位我”后，按当前位置筛选附近项目；也可手动选出发点。地点详情包含地址线索、费用、照片和高德导航入口。

## 部署

GitHub Pages workflow 从 `site/` 发布静态页面。仓库管理员需要在 GitHub 的 **Settings → Pages → Build and deployment** 中把 Source 设为 **GitHub Actions**。公开仓库与 Pages 可免费使用；Pages 网站本身是公开的。

地图默认未配置。公开使用前需要配置受域名限制的高德 JS API Key 和服务端安全密钥代理，见 `map-setup.html` 与 `workers/amap-proxy/README.md`。不要把 `securityJsCode` 写入任何网页、静态配置文件或 GitHub 仓库。`site/map-config.js` 只允许填写公开的 JS API Key 和代理地址；该 Key 必须在高德控制台限制到 `phlinh0091-ai.github.io`。

## 隐私与材料

- 页面不会自动读取位置。定位后的位置只在当前页面用于筛选，不发送到本项目自有服务器；高德会接收地图与定位服务请求。
- 地点照片仍由小红书图片服务加载，来源笔记链接和地点材料会随公开网页对所有访问者可见。图片服务可能记录访问者的网络请求信息。
- 地址、收费、开放状态和图片来自整理材料，可能变更或失效；出发前请向场地方确认。
- GitHub Pages 会公开托管网站。不要在仓库放个人资料、账号凭据、securityJsCode 或私人照片。

## 许可

整合所用 XiaoTen-FootprintMap 组件按其 MIT 许可保留；见 `LICENSE`。南阳地点数据与页面的开放许可及来源说明仍需项目维护者确认。
