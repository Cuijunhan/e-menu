---
name: 项目概览
description: e-menu 家庭点餐小程序整体架构和当前状态
type: project
originSessionId: fc3ed44f-27b7-4f7a-a9ab-2c511ca4f531
---
家庭自用微信点餐小程序，AppID: wx194a405bf1fb2517。

**Why:** 家庭内部点餐，轻量低维护，逐步引入 AI 能力（Phase 4）。

**How to apply:** 所有开发决策以"家用、简单、可运行"为优先，不要过度设计。

## 当前技术栈（cloud-refactor 分支后）

- 前端：微信小程序原生
- 后端：微信云开发（6 个云函数）
- 数据库：微信云数据库（MongoDB 风格）
- 存储：微信云存储

## 主要功能模块

- 菜单：三级分类（主分类→子分类→菜品），饭菜/咖啡/酒
- 购物车 + 下单
- 订单查询（含再来一单）
- 随机推荐菜品（random 页面有动画效果）
- 想吃什么预约（reservation + reservation-detail 页面）
- 个人中心（头像/昵称/余额）
- 管理员后台（仅管理员可见，通过 openid 白名单控制）

## 分支状态

- `main`：上一个稳定版本（FastAPI 后端，服务器连接不稳定）
- `cloud-refactor`：微信云开发重构完成，待用户验证后合并

## 数据库集合（云数据库）

banners / main_categories / categories / dishes / orders / reservations / users

订单明细（order_items）嵌入 orders 文档，不单独存集合。
