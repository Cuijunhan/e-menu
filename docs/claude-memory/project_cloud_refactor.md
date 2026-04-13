---
name: 微信云开发重构进度
description: 后端从 FastAPI 完全迁移到微信云开发的进度和待办事项
type: project
originSessionId: fc3ed44f-27b7-4f7a-a9ab-2c511ca4f531
---
后端重构已完成，代码在 `cloud-refactor` 分支，等待用户验证后合并到 main。

**Why:** 原 FastAPI + SQLite 后端部署在京东云服务器（114.67.227.216:8000），连接不稳定，图片路径硬编码为 Windows 本地路径，无法正常部署。

**How to apply:** 继续重构相关工作时，先检查 cloud-refactor 分支状态。用户说验证没问题后让我合并到 main。

## 重构内容（已完成）

- `cloudfunctions/` — 6 个云函数：banners / categories / dishes / orders / reservations / admin
- `pages/admin/` — 新增管理员页面（菜品管理、轮播图管理、数据初始化）
- `app.js` — 添加 wx.cloud.init()，自动获取 openid
- `utils/api.js` — 全部改为 wx.cloud.callFunction()
- 所有页面 JS — 移除 user_id 参数，适配云数据库字符串 _id

## 部署前必须完成（用户还没做）

1. 在微信开发者工具开通云开发，获取**环境 ID**
2. 替换 `app.js` 第 3 行：`const ENV_ID = 'YOUR_ENV_ID'`
3. 在云开发控制台创建 7 个集合：banners / main_categories / categories / dishes / orders / reservations / users
4. 上传部署 6 个云函数（右键 → 上传并部署）
5. 调用 `adminAction('getOpenid')` 获取自己的 openid
6. 替换 `cloudfunctions/admin/index.js` 第 7 行：`const ADMIN_OPENIDS = ['真实openid']`，重新部署 admin 函数
7. 进入管理后台 → 初始化默认数据

## 关键文件位置

- 设计文档：`docs/superpowers/specs/2026-04-13-wechat-cloud-refactor-design.md`
- 实施计划：`docs/superpowers/plans/2026-04-13-wechat-cloud-refactor.md`
- 小程序 AppID：`wx194a405bf1fb2517`
