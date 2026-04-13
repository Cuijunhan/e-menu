# 微信云开发后端重构设计文档

**日期：** 2026-04-13  
**背景：** 原 FastAPI + SQLite 后端部署在京东云服务器上，存在连接不稳定、图片路径硬编码等问题，决定完全迁移到微信云开发，彻底去除自维护服务器。

---

## 整体架构

```
小程序前端
    ↓ wx.cloud.callFunction()
微信云开发
    ├── 云函数（6个）
    ├── 云数据库（MongoDB 风格，7个集合）
    └── 云存储（菜品图片、轮播图）
```

- 前端调用方式：从 `wx.request(BASE_URL + path)` 改为 `wx.cloud.callFunction({ name, data })`
- 不再有 HTTP 请求，无需配置域名白名单
- 用户身份通过 `openid` 由云函数自动获取（`event.userInfo.openId`），不再需要前端传递

---

## 云函数设计

共 6 个云函数，每个函数接收 `{ action, data }` 参数做内部路由。

| 云函数名 | 负责功能 |
|---------|---------|
| `dishes` | 获取菜品列表、随机菜品、单个菜品详情 |
| `categories` | 获取主分类列表、子分类列表 |
| `banners` | 获取轮播图列表 |
| `orders` | 创建订单、查询订单列表、删除订单 |
| `reservations` | 创建/查询/修改/删除预约 |
| `admin` | 管理员操作：增删改菜品、轮播图、分类（含 openid 白名单鉴权） |

**调用示例：**
```js
wx.cloud.callFunction({
  name: 'dishes',
  data: { action: 'list', categoryId: 'xxx' }
})
```

**云函数目录结构：**
```
cloudfunctions/
├── dishes/
│   ├── index.js
│   └── package.json
├── categories/
├── banners/
├── orders/
├── reservations/
└── admin/
```

---

## 云数据库集合设计

从 SQLite 迁移到云数据库，使用 `_id`（字符串）替代自增整数主键。

### banners 集合
```json
{
  "_id": "string",
  "image": "cloud://...",
  "title": "string",
  "link": "string",
  "sort_order": 1,
  "is_active": true,
  "is_default": false
}
```

### main_categories 集合
```json
{
  "_id": "string",
  "name": "饭菜",
  "code": "food"
}
```

### categories 集合
```json
{
  "_id": "string",
  "name": "热菜",
  "main_category_id": "main_category._id"
}
```

### dishes 集合
```json
{
  "_id": "string",
  "name": "红烧肉",
  "price": 38.0,
  "category_id": "category._id",
  "image": "cloud://...",
  "description": "软烂入味，肥而不腻",
  "ingredients": "",
  "instructions": ""
}
```

### orders 集合（order_items 嵌入）
```json
{
  "_id": "string",
  "openid": "oXxx...",
  "total_price": 58.0,
  "status": "已下单",
  "create_time": "Date",
  "items": [
    {
      "dish_id": "dish._id",
      "dish_name": "红烧肉",
      "quantity": 1,
      "price": 38.0
    }
  ]
}
```

### reservations 集合
```json
{
  "_id": "string",
  "openid": "oXxx...",
  "dish_name": "想吃的菜",
  "link": "",
  "note": "",
  "status": "待处理",
  "create_time": "Date"
}
```

### users 集合
```json
{
  "_id": "string",
  "openid": "oXxx...",
  "balance": 0.0
}
```

---

## 云存储

- 菜品图片和轮播图上传到云存储，返回 `cloud://` 协议 URL
- 小程序端用 `wx.cloud.getTempFileURL()` 获取可访问的临时 URL，或直接用 `cloud://` URL 显示图片（image 组件支持）
- 管理员在小程序端上传图片时，使用 `wx.cloud.uploadFile()` 上传

---

## 管理员页面

新增页面目录：

```
pages/
└── admin/
    ├── index/       管理员主入口（菜品管理、轮播图管理入口）
    ├── dishes/      菜品增删改（含图片上传）
    └── banners/     轮播图管理
```

**鉴权方式：**
- 云函数 `admin` 内判断调用者 `openid` 是否在硬编码白名单中
- `app.js` 中通过比对 `openid` 控制管理员入口是否显示

---

## 前端改造范围

| 文件 | 改造内容 |
|------|---------|
| `utils/api.js` | 全部改为 `wx.cloud.callFunction()` 调用 |
| `app.js` | 初始化云开发 `wx.cloud.init()`，获取并存储 `openid` |
| `pages/*/` | 调用方式适配，`user_id` 改为 `openid` |
| `pages/admin/` | 新增管理员页面（全新） |

---

## 数据初始化

原 `seed()` 函数（Python）对应的初始化数据，改为在云函数 `admin` 中提供一个 `initData` action，或直接在云开发控制台手动导入 JSON 数据。

---

## 不在本次范围内

- 余额充值/扣款逻辑（当前仅本地 Storage 模拟，暂不做真实后端）
- AI 视频解析功能（Phase 4）
