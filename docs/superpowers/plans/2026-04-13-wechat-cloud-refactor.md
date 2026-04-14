# 微信云开发后端重构 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将现有 FastAPI + SQLite 后端完全迁移到微信云开发（云函数 + 云数据库 + 云存储），彻底去除自维护服务器。

**Architecture:** 6 个云函数（banners/categories/dishes/orders/reservations/admin）替代 FastAPI routers；云数据库（MongoDB 风格）替代 SQLite；前端从 wx.request HTTP 调用改为 wx.cloud.callFunction；云函数通过 cloud.getWXContext().OPENID 自动获取用户身份，无需前端传递 user_id。

**Tech Stack:** wx-server-sdk（云函数）、微信云数据库、微信云存储、微信小程序原生 JS

---

## 文件结构

**新建文件：**
- `cloudfunctions/banners/index.js` — 轮播图查询
- `cloudfunctions/banners/package.json`
- `cloudfunctions/categories/index.js` — 主分类/子分类查询
- `cloudfunctions/categories/package.json`
- `cloudfunctions/dishes/index.js` — 菜品列表/随机/详情
- `cloudfunctions/dishes/package.json`
- `cloudfunctions/orders/index.js` — 订单创建/查询/删除
- `cloudfunctions/orders/package.json`
- `cloudfunctions/reservations/index.js` — 预约 CRUD
- `cloudfunctions/reservations/package.json`
- `cloudfunctions/admin/index.js` — 管理员操作（含数据初始化）
- `cloudfunctions/admin/package.json`
- `pages/admin/index/index.js/json/wxml/wxss` — 管理员主入口
- `pages/admin/dishes/index.js/json/wxml/wxss` — 菜品管理
- `pages/admin/banners/index.js/json/wxml/wxss` — 轮播图管理

**修改文件：**
- `project.config.json` — 添加 cloudfunctionRoot
- `app.js` — 添加 wx.cloud.init，获取 openid，移除硬编码 userId
- `app.json` — 添加管理员页面路径
- `utils/api.js` — 全部改为 wx.cloud.callFunction
- `pages/home/home.js` — 适配新 getBanners 返回格式
- `pages/cart/cart.js` — 移除 user_id 参数
- `pages/orders/orders.js` — 移除 user_id 参数，适配字符串 id
- `pages/reservation/reservation.js` — 移除 user_id 参数
- `pages/reservation-detail/reservation-detail.js` — 适配新接口
- `pages/profile/profile.js` — 添加管理员入口（isAdmin 检查）

---

### Task 1: 创建重构分支，配置云开发环境

**Files:**
- Modify: `project.config.json`

- [ ] **Step 1: 创建并切换到重构分支**

```bash
git checkout -b cloud-refactor
```

- [ ] **Step 2: 更新 project.config.json，添加 cloudfunctionRoot**

将 `project.config.json` 内容替换为：

```json
{
  "setting": {
    "es6": true,
    "postcss": true,
    "minified": true,
    "uglifyFileName": false,
    "enhance": true,
    "packNpmRelationList": [],
    "babelSetting": {
      "ignore": [],
      "disablePlugins": [],
      "outputPath": ""
    },
    "useCompilerPlugins": false,
    "minifyWXML": true,
    "compileWorklet": false,
    "uploadWithSourceMap": true,
    "packNpmManually": false,
    "minifyWXSS": true,
    "localPlugins": false,
    "disableUseStrict": false,
    "condition": false,
    "swc": false,
    "disableSWC": true
  },
  "compileType": "miniprogram",
  "simulatorPluginLibVersion": {},
  "packOptions": {
    "ignore": [],
    "include": []
  },
  "appid": "wx194a405bf1fb2517",
  "cloudfunctionRoot": "cloudfunctions/",
  "editorSetting": {},
  "libVersion": "3.15.0"
}
```

- [ ] **Step 3: Commit**

```bash
git add project.config.json
git commit -m "feat: 创建 cloud-refactor 分支，配置 cloudfunctionRoot"
```

---

### Task 2: 创建云函数 banners

**Files:**
- Create: `cloudfunctions/banners/index.js`
- Create: `cloudfunctions/banners/package.json`

- [ ] **Step 1: 创建 package.json**

```json
{
  "name": "banners",
  "version": "1.0.0",
  "description": "轮播图云函数",
  "main": "index.js",
  "dependencies": {
    "wx-server-sdk": "~2.6.3"
  }
}
```

- [ ] **Step 2: 创建 index.js**

```js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 统一规范化文档：_id → id，Date → ISO string
function normalize(doc) {
  const obj = Object.assign({}, doc, { id: doc._id })
  delete obj._id
  if (obj.create_time instanceof Date) {
    obj.create_time = obj.create_time.toISOString()
  }
  return obj
}

exports.main = async (event) => {
  const res = await db.collection('banners')
    .where({ is_active: true })
    .orderBy('sort_order', 'asc')
    .limit(100)
    .get()
  return res.data.map(normalize)
}
```

- [ ] **Step 3: Commit**

```bash
git add cloudfunctions/banners/
git commit -m "feat: 添加 banners 云函数"
```

---

### Task 3: 创建云函数 categories

**Files:**
- Create: `cloudfunctions/categories/index.js`
- Create: `cloudfunctions/categories/package.json`

- [ ] **Step 1: 创建 package.json**

```json
{
  "name": "categories",
  "version": "1.0.0",
  "description": "分类云函数",
  "main": "index.js",
  "dependencies": {
    "wx-server-sdk": "~2.6.3"
  }
}
```

- [ ] **Step 2: 创建 index.js**

```js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

function normalize(doc) {
  const obj = Object.assign({}, doc, { id: doc._id })
  delete obj._id
  return obj
}

exports.main = async (event) => {
  const { action, data = {} } = event

  switch (action) {
    case 'listMain': {
      const res = await db.collection('main_categories').limit(100).get()
      return res.data.map(normalize)
    }
    case 'list': {
      const query = data.mainCategoryId
        ? db.collection('categories').where({ main_category_id: data.mainCategoryId }).limit(100)
        : db.collection('categories').limit(100)
      const res = await query.get()
      return res.data.map(normalize)
    }
    default:
      return { error: 'Unknown action' }
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add cloudfunctions/categories/
git commit -m "feat: 添加 categories 云函数"
```

---

### Task 4: 创建云函数 dishes

**Files:**
- Create: `cloudfunctions/dishes/index.js`
- Create: `cloudfunctions/dishes/package.json`

- [ ] **Step 1: 创建 package.json**

```json
{
  "name": "dishes",
  "version": "1.0.0",
  "description": "菜品云函数",
  "main": "index.js",
  "dependencies": {
    "wx-server-sdk": "~2.6.3"
  }
}
```

- [ ] **Step 2: 创建 index.js**

```js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

function normalize(doc) {
  const obj = Object.assign({}, doc, { id: doc._id })
  delete obj._id
  return obj
}

exports.main = async (event) => {
  const { action, data = {} } = event

  switch (action) {
    case 'list':
      return await listDishes(data)
    case 'random':
      return await randomDishes(data)
    case 'get':
      return await getDish(data)
    default:
      return { error: 'Unknown action' }
  }
}

async function listDishes({ categoryId, mainCategoryId }) {
  let query

  if (categoryId) {
    query = db.collection('dishes').where({ category_id: categoryId }).limit(100)
  } else if (mainCategoryId) {
    // 先找该主分类下的所有子分类 id
    const catsRes = await db.collection('categories')
      .where({ main_category_id: mainCategoryId })
      .limit(100)
      .get()
    const catIds = catsRes.data.map(c => c._id)
    if (catIds.length === 0) return []
    query = db.collection('dishes')
      .where({ category_id: db.command.in(catIds) })
      .limit(100)
  } else {
    query = db.collection('dishes').limit(100)
  }

  const res = await query.get()
  return res.data.map(normalize)
}

async function randomDishes({ count = 5 }) {
  const res = await db.collection('dishes').limit(200).get()
  const all = res.data.map(normalize)
  if (all.length <= count) return all
  // 随机打乱后取前 count 个
  const shuffled = all.slice().sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}

async function getDish({ id }) {
  const res = await db.collection('dishes').doc(id).get()
  return normalize(res.data)
}
```

- [ ] **Step 3: Commit**

```bash
git add cloudfunctions/dishes/
git commit -m "feat: 添加 dishes 云函数"
```

---

### Task 5: 创建云函数 orders

**Files:**
- Create: `cloudfunctions/orders/index.js`
- Create: `cloudfunctions/orders/package.json`

- [ ] **Step 1: 创建 package.json**

```json
{
  "name": "orders",
  "version": "1.0.0",
  "description": "订单云函数",
  "main": "index.js",
  "dependencies": {
    "wx-server-sdk": "~2.6.3"
  }
}
```

- [ ] **Step 2: 创建 index.js**

```js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

function normalize(doc) {
  const obj = Object.assign({}, doc, { id: doc._id })
  delete obj._id
  if (obj.create_time instanceof Date) {
    obj.create_time = obj.create_time.toISOString()
  }
  return obj
}

exports.main = async (event) => {
  const { action, data = {} } = event
  const { OPENID } = cloud.getWXContext()

  switch (action) {
    case 'create':
      return await createOrder(OPENID, data)
    case 'list':
      return await listOrders(OPENID)
    case 'delete':
      return await deleteOrder(OPENID, data)
    default:
      return { error: 'Unknown action' }
  }
}

async function createOrder(openid, { items }) {
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const res = await db.collection('orders').add({
    data: {
      openid,
      total_price: parseFloat(total.toFixed(2)),
      status: '已下单',
      create_time: new Date(),
      items,
    }
  })
  return { id: res._id }
}

async function listOrders(openid) {
  const res = await db.collection('orders')
    .where({ openid })
    .orderBy('create_time', 'desc')
    .limit(100)
    .get()
  return res.data.map(normalize)
}

async function deleteOrder(openid, { id }) {
  const orderRes = await db.collection('orders').doc(id).get()
  if (orderRes.data.openid !== openid) {
    return { error: '无权限' }
  }
  await db.collection('orders').doc(id).remove()
  return { ok: true }
}
```

- [ ] **Step 3: Commit**

```bash
git add cloudfunctions/orders/
git commit -m "feat: 添加 orders 云函数"
```

---

### Task 6: 创建云函数 reservations

**Files:**
- Create: `cloudfunctions/reservations/index.js`
- Create: `cloudfunctions/reservations/package.json`

- [ ] **Step 1: 创建 package.json**

```json
{
  "name": "reservations",
  "version": "1.0.0",
  "description": "预约云函数",
  "main": "index.js",
  "dependencies": {
    "wx-server-sdk": "~2.6.3"
  }
}
```

- [ ] **Step 2: 创建 index.js**

```js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

function normalize(doc) {
  const obj = Object.assign({}, doc, { id: doc._id })
  delete obj._id
  if (obj.create_time instanceof Date) {
    obj.create_time = obj.create_time.toISOString()
  }
  return obj
}

exports.main = async (event) => {
  const { action, data = {} } = event
  const { OPENID } = cloud.getWXContext()

  switch (action) {
    case 'create':
      return await createReservation(OPENID, data)
    case 'list':
      return await listReservations(OPENID)
    case 'update':
      return await updateReservation(OPENID, data)
    case 'delete':
      return await deleteReservation(OPENID, data)
    default:
      return { error: 'Unknown action' }
  }
}

async function createReservation(openid, { dish_name, link, note }) {
  const res = await db.collection('reservations').add({
    data: {
      openid,
      dish_name: dish_name.trim(),
      link: link || '',
      note: note || '',
      status: '待处理',
      create_time: new Date(),
    }
  })
  return { id: res._id }
}

async function listReservations(openid) {
  const res = await db.collection('reservations')
    .where({ openid })
    .orderBy('create_time', 'desc')
    .limit(100)
    .get()
  return res.data.map(normalize)
}

async function updateReservation(openid, { id, dish_name, link, note }) {
  const r = await db.collection('reservations').doc(id).get()
  if (r.data.openid !== openid) return { error: '无权限' }
  if (r.data.status === '已处理') return { error: '已处理的预约无法修改' }
  await db.collection('reservations').doc(id).update({
    data: {
      dish_name: dish_name.trim(),
      link: link || '',
      note: note || '',
    }
  })
  return { ok: true }
}

async function deleteReservation(openid, { id }) {
  const r = await db.collection('reservations').doc(id).get()
  if (r.data.openid !== openid) return { error: '无权限' }
  await db.collection('reservations').doc(id).remove()
  return { ok: true }
}
```

- [ ] **Step 3: Commit**

```bash
git add cloudfunctions/reservations/
git commit -m "feat: 添加 reservations 云函数"
```

---

### Task 7: 创建云函数 admin

**Files:**
- Create: `cloudfunctions/admin/index.js`
- Create: `cloudfunctions/admin/package.json`

- [ ] **Step 1: 创建 package.json**

```json
{
  "name": "admin",
  "version": "1.0.0",
  "description": "管理员云函数",
  "main": "index.js",
  "dependencies": {
    "wx-server-sdk": "~2.6.3"
  }
}
```

- [ ] **Step 2: 创建 index.js**

```js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// ⚠️ 部署前替换为真实管理员 openid
// 可先调用 getOpenid action 获取你的 openid
const ADMIN_OPENIDS = ['YOUR_OPENID_HERE']

function normalize(doc) {
  const obj = Object.assign({}, doc, { id: doc._id })
  delete obj._id
  if (obj.create_time instanceof Date) {
    obj.create_time = obj.create_time.toISOString()
  }
  return obj
}

exports.main = async (event) => {
  const { action, data = {} } = event
  const { OPENID } = cloud.getWXContext()

  // getOpenid 不需要鉴权，用于首次获取自己的 openid
  if (action === 'getOpenid') {
    return { openid: OPENID }
  }

  if (!ADMIN_OPENIDS.includes(OPENID)) {
    return { error: '无权限' }
  }

  switch (action) {
    // 菜品管理
    case 'listDishes': {
      const res = await db.collection('dishes').limit(200).get()
      return res.data.map(normalize)
    }
    case 'createDish': {
      const res = await db.collection('dishes').add({ data: data.dish })
      return { id: res._id }
    }
    case 'updateDish': {
      await db.collection('dishes').doc(data.id).update({ data: data.dish })
      return { ok: true }
    }
    case 'deleteDish': {
      await db.collection('dishes').doc(data.id).remove()
      return { ok: true }
    }
    // 轮播图管理
    case 'listBanners': {
      const res = await db.collection('banners').orderBy('sort_order', 'asc').limit(100).get()
      return res.data.map(normalize)
    }
    case 'createBanner': {
      const res = await db.collection('banners').add({ data: data.banner })
      return { id: res._id }
    }
    case 'updateBanner': {
      await db.collection('banners').doc(data.id).update({ data: data.banner })
      return { ok: true }
    }
    case 'deleteBanner': {
      await db.collection('banners').doc(data.id).remove()
      return { ok: true }
    }
    // 分类管理
    case 'listCategories': {
      const res = await db.collection('categories').limit(100).get()
      return res.data.map(normalize)
    }
    case 'createCategory': {
      const res = await db.collection('categories').add({ data: data.category })
      return { id: res._id }
    }
    case 'deleteCategory': {
      await db.collection('categories').doc(data.id).remove()
      return { ok: true }
    }
    // 数据初始化（首次部署时调用一次）
    case 'initData':
      return await initData()
    default:
      return { error: 'Unknown action' }
  }
}

async function initData() {
  const existing = await db.collection('main_categories').limit(1).get()
  if (existing.data.length > 0) return { message: '数据已存在，跳过初始化' }

  const mc1 = await db.collection('main_categories').add({ data: { name: '饭菜', code: 'food' } })
  const mc2 = await db.collection('main_categories').add({ data: { name: '咖啡', code: 'coffee' } })
  const mc3 = await db.collection('main_categories').add({ data: { name: '酒', code: 'wine' } })

  const c1 = await db.collection('categories').add({ data: { name: '热菜', main_category_id: mc1._id } })
  const c2 = await db.collection('categories').add({ data: { name: '凉菜', main_category_id: mc1._id } })
  const c3 = await db.collection('categories').add({ data: { name: '汤类', main_category_id: mc1._id } })
  const c4 = await db.collection('categories').add({ data: { name: '主食', main_category_id: mc1._id } })
  const c5 = await db.collection('categories').add({ data: { name: '美式', main_category_id: mc2._id } })
  const c6 = await db.collection('categories').add({ data: { name: '拿铁', main_category_id: mc2._id } })
  const c7 = await db.collection('categories').add({ data: { name: '红酒', main_category_id: mc3._id } })
  await db.collection('categories').add({ data: { name: '白酒', main_category_id: mc3._id } })

  const dishesData = [
    { name: '红烧肉', price: 38.0, category_id: c1._id, description: '软烂入味，肥而不腻', image: '', ingredients: '', instructions: '' },
    { name: '鱼香肉丝', price: 28.0, category_id: c1._id, description: '经典川菜，酸甜微辣', image: '', ingredients: '', instructions: '' },
    { name: '番茄炒蛋', price: 18.0, category_id: c1._id, description: '家常必备，下饭神器', image: '', ingredients: '', instructions: '' },
    { name: '清炒时蔬', price: 15.0, category_id: c1._id, description: '新鲜蔬菜，清爽健康', image: '', ingredients: '', instructions: '' },
    { name: '拍黄瓜', price: 12.0, category_id: c2._id, description: '清脆爽口，蒜香十足', image: '', ingredients: '', instructions: '' },
    { name: '凉拌木耳', price: 14.0, category_id: c2._id, description: '黑木耳拌香葱', image: '', ingredients: '', instructions: '' },
    { name: '番茄蛋花汤', price: 12.0, category_id: c3._id, description: '酸甜开胃，暖胃暖心', image: '', ingredients: '', instructions: '' },
    { name: '紫菜蛋花汤', price: 10.0, category_id: c3._id, description: '简单清淡，营养丰富', image: '', ingredients: '', instructions: '' },
    { name: '米饭', price: 3.0, category_id: c4._id, description: '东北大米，颗粒饱满', image: '', ingredients: '', instructions: '' },
    { name: '馒头', price: 2.0, category_id: c4._id, description: '手工馒头，松软可口', image: '', ingredients: '', instructions: '' },
  ]
  await Promise.all(dishesData.map(d => db.collection('dishes').add({ data: d })))

  const bannersData = [
    { image: '/images/banner-cooking.png', title: ' ', link: '', sort_order: 1, is_active: true, is_default: true },
    { image: '/images/banner-coffee.png', title: ' ', link: '', sort_order: 2, is_active: true, is_default: true },
    { image: '/images/banner-cocktail.png', title: ' ', link: '', sort_order: 3, is_active: true, is_default: true },
  ]
  await Promise.all(bannersData.map(b => db.collection('banners').add({ data: b })))

  return { message: '初始化完成' }
}
```

- [ ] **Step 3: Commit**

```bash
git add cloudfunctions/admin/
git commit -m "feat: 添加 admin 云函数（含菜品/轮播图管理和数据初始化）"
```

---

### Task 8: 更新 app.js

**Files:**
- Modify: `app.js`

- [ ] **Step 1: 替换 app.js 全部内容**

```js
// app.js
// ⚠️ 将 YOUR_ENV_ID 替换为你的云开发环境 ID（在微信开发者工具 → 云开发控制台中查看）
const ENV_ID = 'YOUR_ENV_ID'

App({
  globalData: {
    openid: '',
    isAdmin: false,
    cart: [],
  },

  onLaunch() {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上基础库')
      return
    }
    wx.cloud.init({
      env: ENV_ID,
      traceUser: true,
    })
    this._fetchOpenid()
  },

  _fetchOpenid() {
    wx.cloud.callFunction({
      name: 'admin',
      data: { action: 'getOpenid' },
      success: res => {
        const openid = res.result && res.result.openid
        if (openid) {
          this.globalData.openid = openid
          wx.setStorageSync('openid', openid)
        }
      },
      fail: err => {
        console.error('获取 openid 失败', err)
      },
    })
  },

  addToCart(dish) {
    const cart = this.globalData.cart
    const existing = cart.find(item => item.dish.id === dish.id)
    if (existing) {
      existing.quantity += 1
    } else {
      cart.push({ dish, quantity: 1 })
    }
  },

  removeFromCart(dishId) {
    const cart = this.globalData.cart
    const idx = cart.findIndex(item => item.dish.id === dishId)
    if (idx === -1) return
    if (cart[idx].quantity > 1) {
      cart[idx].quantity -= 1
    } else {
      cart.splice(idx, 1)
    }
  },

  getCartCount() {
    return this.globalData.cart.reduce((sum, item) => sum + item.quantity, 0)
  },

  getCartTotal() {
    return this.globalData.cart
      .reduce((sum, item) => sum + item.dish.price * item.quantity, 0)
      .toFixed(2)
  },

  clearCart() {
    this.globalData.cart = []
  },
})
```

- [ ] **Step 2: Commit**

```bash
git add app.js
git commit -m "feat: 更新 app.js，初始化云开发并获取 openid"
```

---

### Task 9: 更新 utils/api.js

**Files:**
- Modify: `utils/api.js`

- [ ] **Step 1: 替换 utils/api.js 全部内容**

```js
// utils/api.js - 统一封装云函数请求
function call(name, data = {}) {
  return new Promise((resolve, reject) => {
    wx.cloud.callFunction({
      name,
      data,
      success: res => resolve(res.result),
      fail: err => {
        wx.showToast({ title: '网络错误', icon: 'error' })
        reject(err)
      },
    })
  })
}

module.exports = {
  // 轮播图
  getBanners: () => call('banners'),

  // 分类
  getMainCategories: () => call('categories', { action: 'listMain' }),
  getCategories: (mainCategoryId) => call('categories', { action: 'list', mainCategoryId }),

  // 菜品
  getDishes: (categoryId, mainCategoryId) =>
    call('dishes', { action: 'list', categoryId, mainCategoryId }),
  getRandomDishes: (count = 5) => call('dishes', { action: 'random', count }),
  getDish: (id) => call('dishes', { action: 'get', id }),

  // 订单（openid 由云函数从 wx.cloud 上下文自动获取，无需前端传递）
  createOrder: (items) => call('orders', { action: 'create', items }),
  getOrders: () => call('orders', { action: 'list' }),
  deleteOrder: (id) => call('orders', { action: 'delete', id }),

  // 预约
  createReservation: (payload) => call('reservations', { action: 'create', ...payload }),
  getReservations: () => call('reservations', { action: 'list' }),
  updateReservation: (id, payload) =>
    call('reservations', { action: 'update', id, ...payload }),
  deleteReservation: (id) => call('reservations', { action: 'delete', id }),

  // 管理员
  adminAction: (action, data = {}) => call('admin', { action, ...data }),
}
```

- [ ] **Step 2: Commit**

```bash
git add utils/api.js
git commit -m "feat: 更新 api.js，全部改为 wx.cloud.callFunction"
```

---

### Task 10: 更新页面 JS 文件

**Files:**
- Modify: `pages/home/home.js`
- Modify: `pages/cart/cart.js`
- Modify: `pages/orders/orders.js`
- Modify: `pages/reservation/reservation.js`
- Modify: `pages/reservation-detail/reservation-detail.js`

- [ ] **Step 1: 更新 pages/home/home.js（banners 返回格式变化）**

将 `loadBanners` 方法中的 `res.data || []` 改为 `res || []`：

```js
// pages/home/home.js
const api = require('../../utils/api');

Page({
  data: {
    statusBarHeight: 0,
    banners: []
  },

  onLoad() {
    const systemInfo = wx.getSystemInfoSync();
    this.setData({ statusBarHeight: systemInfo.statusBarHeight });
    this.loadBanners();
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 0 });
    }
  },

  async loadBanners() {
    try {
      const res = await api.getBanners();
      this.setData({ banners: res || [] });
    } catch (error) {
      console.error('获取轮播图失败:', error);
      this.setData({
        banners: [
          { id: '1', image: '/images/banner-cooking.png', title: ' ' },
          { id: '2', image: '/images/banner-coffee.png', title: ' ' },
          { id: '3', image: '/images/banner-cocktail.png', title: ' ' }
        ]
      });
    }
  },

  goToFood() {
    wx.setStorageSync('preSelectMainCategory', '__food__');
    wx.switchTab({ url: '/pages/index/index' });
  },

  goToCoffee() {
    wx.setStorageSync('preSelectMainCategory', '__coffee__');
    wx.switchTab({ url: '/pages/index/index' });
  },

  goToCocktail() {
    wx.setStorageSync('preSelectMainCategory', '__wine__');
    wx.switchTab({ url: '/pages/index/index' });
  },

  goToRandom() {
    wx.navigateTo({ url: '/pages/random/random' });
  },

  goToHistory() {
    wx.navigateTo({ url: '/pages/orders/orders' });
  },

  goToReservation() {
    wx.navigateTo({ url: '/pages/reservation/reservation' });
  },
});
```

注意：`preSelectMainCategory` 改为存储 `code` 字符串（`'__food__'` 等），因为云数据库的 id 是字符串，不再是固定整数 1/2/3。

- [ ] **Step 2: 更新 pages/index/index.js（适配 code 预选逻辑）**

```js
// pages/index/index.js
const api = require("../../utils/api");
const app = getApp();

Page({
  data: {
    mainCategories: [],
    categories: [],
    dishes: [],
    activeMainCategoryId: null,
    activeCategoryId: null,
    cartCount: 0,
    cartTotal: "0.00",
    dishQuantities: {},
    cartBarHidden: false,
    lastScrollTop: 0,
    scrollTimer: null,
    showDishDetail: false,
    selectedDish: {},
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 1 });
    }
    this.refreshCart();

    const preSelect = wx.getStorageSync('preSelectMainCategory');
    if (preSelect) {
      wx.removeStorageSync('preSelectMainCategory');
      // 在 mainCategories 加载完成后按 code 匹配
      const match = this.data.mainCategories.find(mc => mc.code === preSelect.replace(/__/g, ''));
      if (match) {
        this.setData({ activeMainCategoryId: match.id });
        this.loadCategories(match.id);
      }
    }
  },

  onLoad() {
    this.loadMainCategories();
  },

  async loadMainCategories() {
    const mainCats = await api.getMainCategories();
    this.setData({ mainCategories: mainCats });

    // 检查是否有预选分类（onLoad 时也处理一次，确保数据加载后能正确跳转）
    const preSelect = wx.getStorageSync('preSelectMainCategory');
    if (preSelect) {
      wx.removeStorageSync('preSelectMainCategory');
      const code = preSelect.replace(/__/g, '')
      const match = mainCats.find(mc => mc.code === code);
      if (match) {
        this.setData({ activeMainCategoryId: match.id });
        this.loadCategories(match.id);
        return;
      }
    }

    if (mainCats.length > 0) {
      this.setData({ activeMainCategoryId: mainCats[0].id });
      this.loadCategories(mainCats[0].id);
    }
  },

  async loadCategories(mainCategoryId) {
    const cats = await api.getCategories(mainCategoryId);
    this.setData({ categories: cats, activeCategoryId: null, activeMainCategoryId: mainCategoryId });
    this.loadDishes(null, mainCategoryId);
  },

  async loadDishes(categoryId, mainCategoryId) {
    const dishes = await api.getDishes(categoryId, mainCategoryId || this.data.activeMainCategoryId);
    this.setData({ dishes, activeCategoryId: categoryId });
    this.refreshCart();
  },

  onCategoryTap(e) {
    const id = e.currentTarget.dataset.id;
    const categoryId = (id === 0 || id === null || id === '') ? null : id;
    this.loadDishes(categoryId, this.data.activeMainCategoryId);
    this.setData({ activeCategoryId: categoryId });
  },

  onMainCategoryTap(e) {
    const id = e.currentTarget.dataset.id;
    this.setData({ activeMainCategoryId: id });
    this.loadCategories(id);
  },

  onDishTap(e) {
    const dish = e.currentTarget.dataset.dish;
    this.setData({ showDishDetail: true, selectedDish: dish });
  },

  closeDishDetail() {
    this.setData({ showDishDetail: false });
  },

  stopPropagation() {},

  onAddTap(e) {
    const dish = e.currentTarget.dataset.dish;
    app.addToCart(dish);
    this.refreshCart();
  },

  onRemoveTap(e) {
    const dish = e.currentTarget.dataset.dish;
    app.removeFromCart(dish.id);
    this.refreshCart();
  },

  refreshCart() {
    const quantities = {};
    app.globalData.cart.forEach(item => {
      quantities[item.dish.id] = item.quantity;
    });
    this.setData({
      cartCount: app.getCartCount(),
      cartTotal: app.getCartTotal(),
      dishQuantities: quantities,
    });
  },

  goToCart() {
    if (app.getCartCount() === 0) {
      wx.showToast({ title: "购物车是空的", icon: "none" });
      return;
    }
    wx.switchTab({ url: "/pages/cart/cart" });
  },

  onScroll(e) {
    const scrollTop = e.detail.scrollTop;
    const delta = scrollTop - this.data.lastScrollTop;
    if (this.data.scrollTimer) clearTimeout(this.data.scrollTimer);
    if (delta > 5) {
      this.setData({ cartBarHidden: true });
    } else if (delta < -5) {
      this.setData({ cartBarHidden: false });
    }
    const timer = setTimeout(() => {
      this.setData({ cartBarHidden: false });
    }, 200);
    this.setData({ lastScrollTop: scrollTop, scrollTimer: timer });
  },
});
```

- [ ] **Step 3: 更新 pages/cart/cart.js（移除 user_id）**

```js
// pages/cart/cart.js
const api = require("../../utils/api");
const app = getApp();

Page({
  data: {
    cart: [],
    cartTotal: "0.00",
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 2 });
    }
    this.refreshCart();
  },

  refreshCart() {
    this.setData({ cart: app.globalData.cart, cartTotal: app.getCartTotal() });
  },

  onAdd(e) {
    const dish = e.currentTarget.dataset.dish;
    app.addToCart(dish);
    this.refreshCart();
  },

  onRemove(e) {
    const dish = e.currentTarget.dataset.dish;
    app.removeFromCart(dish.id);
    this.refreshCart();
  },

  async onSubmit() {
    if (app.getCartCount() === 0) {
      wx.showToast({ title: "购物车是空的", icon: "none" });
      return;
    }
    const items = app.globalData.cart.map(item => ({
      dish_id: item.dish.id,
      dish_name: item.dish.name,
      quantity: item.quantity,
      price: item.dish.price,
    }));
    wx.showLoading({ title: "提交中..." });
    try {
      await api.createOrder(items);
      app.clearCart();
      wx.hideLoading();
      wx.showToast({ title: "下单成功！", icon: "success" });
      setTimeout(() => {
        wx.navigateTo({ url: "/pages/orders/orders" });
      }, 1200);
    } catch (e) {
      wx.hideLoading();
    }
  },
});
```

- [ ] **Step 4: 更新 pages/orders/orders.js（移除 user_id，适配字符串 id）**

```js
// pages/orders/orders.js
const api = require("../../utils/api");
const app = getApp();

Page({
  data: {
    orders: [],
    loading: true,
  },

  onShow() {
    this.loadOrders();
  },

  async loadOrders() {
    this.setData({ loading: true });
    try {
      const orders = await api.getOrders();
      const formatted = orders.map(o => ({
        ...o,
        create_time: o.create_time ? o.create_time.replace('T', ' ').substring(0, 16) : '',
        expanded: false,
      }));
      this.setData({ orders: formatted, loading: false });
    } catch (e) {
      this.setData({ loading: false });
    }
  },

  goBack() {
    wx.navigateBack();
  },

  toggleOrder(e) {
    const id = e.currentTarget.dataset.id;
    const orders = this.data.orders.map(o => ({
      ...o,
      expanded: o.id === id ? !o.expanded : o.expanded,
    }));
    this.setData({ orders });
  },

  increaseQty(e) {
    const { orderId, dishId } = e.currentTarget.dataset;
    const orders = this.data.orders.map(o => {
      if (o.id === orderId) {
        const newItems = o.items.map(item =>
          item.dish_id === dishId ? { ...item, quantity: item.quantity + 1 } : item
        );
        const newTotal = newItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
        return { ...o, items: newItems, total_price: parseFloat(newTotal.toFixed(2)) };
      }
      return o;
    });
    this.setData({ orders });
  },

  decreaseQty(e) {
    const { orderId, dishId } = e.currentTarget.dataset;
    const orders = this.data.orders.map(o => {
      if (o.id === orderId) {
        const newItems = o.items
          .map(item => item.dish_id === dishId ? { ...item, quantity: item.quantity - 1 } : item)
          .filter(item => item.quantity > 0);
        const newTotal = newItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
        return { ...o, items: newItems, total_price: parseFloat(newTotal.toFixed(2)) };
      }
      return o;
    });
    this.setData({ orders });
  },

  async reorder(e) {
    const id = e.currentTarget.dataset.id;
    const order = this.data.orders.find(o => o.id === id);
    if (!order || !order.items || order.items.length === 0) {
      wx.showToast({ title: '订单无菜品', icon: 'error' });
      return;
    }
    try {
      await api.deleteOrder(id);
      await api.createOrder(order.items.map(item => ({
        dish_id: item.dish_id,
        dish_name: item.dish_name,
        quantity: item.quantity,
        price: item.price,
      })));
      wx.showToast({ title: '下单成功', icon: 'success' });
      setTimeout(() => this.loadOrders(), 1500);
    } catch (e) {
      wx.showToast({ title: '下单失败', icon: 'error' });
    }
  },

  addToCart(e) {
    const id = e.currentTarget.dataset.id;
    const order = this.data.orders.find(o => o.id === id);
    if (!order) return;
    order.items.forEach(item => {
      for (let i = 0; i < item.quantity; i++) {
        app.addToCart({ id: item.dish_id, name: item.dish_name, price: item.price });
      }
    });
    wx.showToast({ title: '已加入购物车', icon: 'success' });
    setTimeout(() => wx.switchTab({ url: '/pages/cart/cart' }), 1500);
  },

  async cancelOrder(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '确认取消',
      content: '确定要取消这个订单吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            await api.deleteOrder(id);
            wx.showToast({ title: '订单已取消', icon: 'success' });
            this.loadOrders();
          } catch (e) {
            wx.showToast({ title: '取消失败', icon: 'error' });
          }
        }
      },
    });
  },

  async deleteOrder(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个订单吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            await api.deleteOrder(id);
            wx.showToast({ title: '订单已删除', icon: 'success' });
            this.loadOrders();
          } catch (e) {
            wx.showToast({ title: '删除失败', icon: 'error' });
          }
        }
      },
    });
  },
});
```

- [ ] **Step 5: 更新 pages/reservation/reservation.js（移除 user_id）**

```js
// pages/reservation/reservation.js
const api = require('../../utils/api');

Page({
  data: {
    dishName: '',
    link: '',
    note: '',
    submitting: false,
    list: [],
  },

  onLoad() {
    this.loadList();
  },

  onShow() {
    this.loadList();
  },

  onDishNameInput(e) { this.setData({ dishName: e.detail.value }); },
  onLinkInput(e) { this.setData({ link: e.detail.value }); },
  onNoteInput(e) { this.setData({ note: e.detail.value }); },

  async submit() {
    const { dishName, link, note } = this.data;
    if (!dishName.trim()) {
      wx.showToast({ title: '请输入菜名', icon: 'none' });
      return;
    }
    this.setData({ submitting: true });
    try {
      await api.createReservation({
        dish_name: dishName.trim(),
        link: link.trim(),
        note: note.trim(),
      });
      wx.showToast({ title: '提交成功！', icon: 'success' });
      this.setData({ dishName: '', link: '', note: '' });
      this.loadList();
    } catch (e) {
      wx.showToast({ title: '提交失败', icon: 'error' });
    } finally {
      this.setData({ submitting: false });
    }
  },

  async loadList() {
    try {
      const list = await api.getReservations();
      const fmt = list.map(r => ({
        ...r,
        create_time: r.create_time ? r.create_time.replace('T', ' ').substring(0, 16) : '',
      }));
      this.setData({ list: fmt });
    } catch (e) {
      // 加载失败静默处理
    }
  },

  copyLink(e) {
    const link = e.currentTarget.dataset.link;
    wx.setClipboardData({
      data: link,
      success: () => wx.showToast({ title: '链接已复制', icon: 'success' }),
    });
  },

  goToDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/reservation-detail/reservation-detail?id=${id}` });
  },
});
```

- [ ] **Step 6: 更新 pages/reservation-detail/reservation-detail.js（移除 user_id）**

```js
// pages/reservation-detail/reservation-detail.js
const api = require('../../utils/api');

Page({
  data: {
    id: null,
    detail: null,
    dishName: '',
    link: '',
    note: '',
  },

  onLoad(options) {
    this.setData({ id: options.id });
    this.loadDetail();
  },

  async loadDetail() {
    try {
      const list = await api.getReservations();
      const detail = list.find(item => item.id === this.data.id);
      if (detail) {
        this.setData({
          detail: {
            ...detail,
            create_time: detail.create_time ? detail.create_time.replace('T', ' ').substring(0, 16) : '',
          },
          dishName: detail.dish_name,
          link: detail.link || '',
          note: detail.note || '',
        });
      }
    } catch (e) {
      wx.showToast({ title: '加载失败', icon: 'error' });
    }
  },

  onDishNameInput(e) { this.setData({ dishName: e.detail.value }); },
  onLinkInput(e) { this.setData({ link: e.detail.value }); },
  onNoteInput(e) { this.setData({ note: e.detail.value }); },

  async save() {
    const { id, dishName, link, note } = this.data;
    if (!dishName.trim()) {
      wx.showToast({ title: '请输入菜名', icon: 'none' });
      return;
    }
    try {
      await api.updateReservation(id, {
        dish_name: dishName.trim(),
        link: link.trim(),
        note: note.trim(),
      });
      wx.showToast({ title: '保存成功', icon: 'success' });
      setTimeout(() => wx.navigateBack(), 1500);
    } catch (e) {
      wx.showToast({ title: '保存失败', icon: 'error' });
    }
  },

  deleteItem() {
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条预约吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            await api.deleteReservation(this.data.id);
            wx.showToast({ title: '删除成功', icon: 'success' });
            setTimeout(() => wx.navigateBack(), 1500);
          } catch (e) {
            wx.showToast({ title: '删除失败', icon: 'error' });
          }
        }
      },
    });
  },
});
```

- [ ] **Step 7: Commit**

```bash
git add pages/home/home.js pages/index/index.js pages/cart/cart.js pages/orders/orders.js pages/reservation/reservation.js pages/reservation-detail/reservation-detail.js
git commit -m "feat: 更新各页面 JS，适配云函数接口"
```

---

### Task 11: 更新 profile.js，添加管理员入口

**Files:**
- Modify: `pages/profile/profile.js`

- [ ] **Step 1: 更新 pages/profile/profile.js**

```js
// pages/profile/profile.js
const app = getApp();

Page({
  data: {
    cartCount: 0,
    balance: 0,
    showToast: false,
    toastMsg: '',
    avatarUrl: '',
    nickName: '家庭用户',
    hasAuth: false,
    isAdmin: false,
  },

  onLoad() {
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo && userInfo.avatarUrl) {
      this.setData({
        avatarUrl: userInfo.avatarUrl,
        nickName: userInfo.nickName || '家庭用户',
        hasAuth: true
      });
    }
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 3 });
    }
    this.setData({
      cartCount: app.getCartCount(),
      balance: wx.getStorageSync('userBalance') || 0,
    });
    this._checkAdmin();
  },

  _checkAdmin() {
    wx.cloud.callFunction({
      name: 'admin',
      data: { action: 'getOpenid' },
      success: res => {
        const openid = res.result && res.result.openid;
        if (!openid) return;
        // 调用 checkAdmin action 验证（或者直接在这里判断）
        wx.cloud.callFunction({
          name: 'admin',
          data: { action: 'listDishes' },
          success: r => {
            // 如果没有返回 error，说明是管理员
            const isAdmin = !r.result || !r.result.error;
            this.setData({ isAdmin });
          },
          fail: () => this.setData({ isAdmin: false }),
        });
      },
    });
  },

  onChooseAvatar(e) {
    const { avatarUrl } = e.detail;
    this.setData({ avatarUrl, hasAuth: true });
    const userInfo = wx.getStorageSync('userInfo') || {};
    userInfo.avatarUrl = avatarUrl;
    wx.setStorageSync('userInfo', userInfo);
  },

  onNicknameBlur(e) {
    const nickName = e.detail.value;
    if (nickName) {
      this.setData({ nickName });
      const userInfo = wx.getStorageSync('userInfo') || {};
      userInfo.nickName = nickName;
      wx.setStorageSync('userInfo', userInfo);
    }
  },

  onCouponTap() {
    this.showToast('尚未开放');
  },

  onRecharge() {
    const newBalance = this.data.balance + 1000000;
    wx.setStorageSync('userBalance', newBalance);
    this.setData({ balance: newBalance });
    this.showToast('充值成功 +¥1,000,000');
  },

  showToast(msg) {
    this.setData({ showToast: true, toastMsg: msg });
    setTimeout(() => { this.setData({ showToast: false }); }, 2000);
  },

  goToOrders() {
    wx.navigateTo({ url: '/pages/orders/orders' });
  },

  goToCart() {
    wx.switchTab({ url: '/pages/cart/cart' });
  },

  goToAdmin() {
    wx.navigateTo({ url: '/pages/admin/index/index' });
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add pages/profile/profile.js
git commit -m "feat: profile 页面添加管理员入口检测"
```

---

### Task 12: 创建管理员页面

**Files:**
- Create: `pages/admin/index/index.js/json/wxml/wxss`
- Create: `pages/admin/dishes/index.js/json/wxml/wxss`
- Create: `pages/admin/banners/index.js/json/wxml/wxss`

- [ ] **Step 1: 创建 pages/admin/index/index.json**

```json
{ "navigationBarTitleText": "管理后台" }
```

- [ ] **Step 2: 创建 pages/admin/index/index.wxml**

```xml
<view class="container">
  <view class="menu-item" bindtap="goToDishes">
    <text class="icon">🍽</text>
    <text class="label">菜品管理</text>
    <text class="arrow">›</text>
  </view>
  <view class="menu-item" bindtap="goToBanners">
    <text class="icon">🖼</text>
    <text class="label">轮播图管理</text>
    <text class="arrow">›</text>
  </view>
  <view class="menu-item init-btn" bindtap="initData">
    <text class="icon">⚙</text>
    <text class="label">初始化默认数据</text>
    <text class="arrow">›</text>
  </view>
</view>
```

- [ ] **Step 3: 创建 pages/admin/index/index.wxss**

```css
.container { padding: 20rpx; }
.menu-item {
  display: flex;
  align-items: center;
  background: #fff;
  border-radius: 16rpx;
  padding: 30rpx 24rpx;
  margin-bottom: 20rpx;
}
.icon { font-size: 44rpx; margin-right: 20rpx; }
.label { flex: 1; font-size: 32rpx; color: #333; }
.arrow { font-size: 40rpx; color: #ccc; }
.init-btn { background: #fff7f0; }
```

- [ ] **Step 4: 创建 pages/admin/index/index.js**

```js
const api = require('../../../utils/api');

Page({
  goToDishes() {
    wx.navigateTo({ url: '/pages/admin/dishes/index' });
  },
  goToBanners() {
    wx.navigateTo({ url: '/pages/admin/banners/index' });
  },
  async initData() {
    wx.showModal({
      title: '确认初始化',
      content: '将写入默认分类和菜品数据（如已存在则跳过），确定继续？',
      success: async (res) => {
        if (!res.confirm) return;
        wx.showLoading({ title: '初始化中...' });
        try {
          const result = await api.adminAction('initData');
          wx.hideLoading();
          wx.showToast({ title: result.message || '完成', icon: 'success' });
        } catch (e) {
          wx.hideLoading();
          wx.showToast({ title: '初始化失败', icon: 'error' });
        }
      },
    });
  },
});
```

- [ ] **Step 5: 创建 pages/admin/dishes/index.json**

```json
{ "navigationBarTitleText": "菜品管理" }
```

- [ ] **Step 6: 创建 pages/admin/dishes/index.wxml**

```xml
<view class="container">
  <!-- 菜品列表 -->
  <view class="dish-item" wx:for="{{dishes}}" wx:key="id">
    <view class="dish-info">
      <text class="dish-name">{{item.name}}</text>
      <text class="dish-price">¥{{item.price}}</text>
    </view>
    <view class="dish-actions">
      <button class="btn-edit" bindtap="editDish" data-dish="{{item}}">编辑</button>
      <button class="btn-delete" bindtap="deleteDish" data-id="{{item.id}}">删除</button>
    </view>
  </view>

  <!-- 新增/编辑表单 -->
  <view class="form-card">
    <text class="form-title">{{editingId ? '编辑菜品' : '新增菜品'}}</text>
    <input class="input" placeholder="菜名 *" value="{{form.name}}" bindinput="onInput" data-field="name" />
    <input class="input" placeholder="价格 *" value="{{form.price}}" bindinput="onInput" data-field="price" type="digit" />
    <input class="input" placeholder="描述" value="{{form.description}}" bindinput="onInput" data-field="description" />
    <input class="input" placeholder="分类ID（从云数据库中获取）" value="{{form.category_id}}" bindinput="onInput" data-field="category_id" />
    <view class="image-row">
      <text class="input-label">菜品图片（可选）</text>
      <button class="btn-upload" bindtap="uploadImage">{{form.image ? '已选择' : '选择图片'}}</button>
    </view>
    <image wx:if="{{form.image}}" src="{{form.image}}" class="preview-image" mode="aspectFill" />
    <view class="form-btns">
      <button class="btn-submit" bindtap="submitDish">{{editingId ? '保存修改' : '新增菜品'}}</button>
      <button class="btn-cancel" wx:if="{{editingId}}" bindtap="cancelEdit">取消</button>
    </view>
  </view>
</view>
```

- [ ] **Step 7: 创建 pages/admin/dishes/index.wxss**

```css
.container { padding: 20rpx; padding-bottom: 40rpx; }
.dish-item {
  display: flex; align-items: center; justify-content: space-between;
  background: #fff; border-radius: 12rpx; padding: 20rpx 24rpx; margin-bottom: 16rpx;
}
.dish-info { flex: 1; }
.dish-name { font-size: 30rpx; color: #333; display: block; }
.dish-price { font-size: 26rpx; color: #e67e22; }
.dish-actions { display: flex; gap: 16rpx; }
.btn-edit { font-size: 24rpx; padding: 8rpx 20rpx; background: #3498db; color: #fff; border-radius: 8rpx; }
.btn-delete { font-size: 24rpx; padding: 8rpx 20rpx; background: #e74c3c; color: #fff; border-radius: 8rpx; }
.form-card { background: #fff; border-radius: 16rpx; padding: 30rpx; margin-top: 30rpx; }
.form-title { font-size: 32rpx; font-weight: bold; color: #333; margin-bottom: 20rpx; display: block; }
.input {
  border: 1rpx solid #eee; border-radius: 10rpx; padding: 16rpx 20rpx;
  margin-bottom: 16rpx; font-size: 28rpx; width: 100%; box-sizing: border-box;
}
.image-row { display: flex; align-items: center; margin-bottom: 16rpx; }
.input-label { flex: 1; font-size: 28rpx; color: #666; }
.btn-upload { font-size: 26rpx; padding: 10rpx 24rpx; background: #95a5a6; color: #fff; border-radius: 8rpx; }
.preview-image { width: 100%; height: 200rpx; border-radius: 12rpx; margin-bottom: 16rpx; }
.form-btns { display: flex; gap: 20rpx; }
.btn-submit { flex: 1; background: #2ecc71; color: #fff; font-size: 30rpx; border-radius: 12rpx; padding: 20rpx; }
.btn-cancel { flex: 1; background: #bdc3c7; color: #fff; font-size: 30rpx; border-radius: 12rpx; padding: 20rpx; }
```

- [ ] **Step 8: 创建 pages/admin/dishes/index.js**

```js
const api = require('../../../utils/api');

Page({
  data: {
    dishes: [],
    editingId: null,
    form: { name: '', price: '', description: '', category_id: '', image: '' },
  },

  onShow() {
    this.loadDishes();
  },

  async loadDishes() {
    try {
      const dishes = await api.adminAction('listDishes');
      this.setData({ dishes: dishes || [] });
    } catch (e) {
      wx.showToast({ title: '加载失败', icon: 'error' });
    }
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field;
    const form = Object.assign({}, this.data.form, { [field]: e.detail.value });
    this.setData({ form });
  },

  async uploadImage() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      success: async (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath;
        wx.showLoading({ title: '上传中...' });
        try {
          const ext = tempFilePath.split('.').pop();
          const cloudPath = `dishes/${Date.now()}.${ext}`;
          const uploadRes = await wx.cloud.uploadFile({ cloudPath, filePath: tempFilePath });
          const form = Object.assign({}, this.data.form, { image: uploadRes.fileID });
          this.setData({ form });
          wx.hideLoading();
          wx.showToast({ title: '上传成功', icon: 'success' });
        } catch (e) {
          wx.hideLoading();
          wx.showToast({ title: '上传失败', icon: 'error' });
        }
      },
    });
  },

  editDish(e) {
    const dish = e.currentTarget.dataset.dish;
    this.setData({
      editingId: dish.id,
      form: {
        name: dish.name,
        price: String(dish.price),
        description: dish.description || '',
        category_id: dish.category_id || '',
        image: dish.image || '',
      },
    });
  },

  cancelEdit() {
    this.setData({
      editingId: null,
      form: { name: '', price: '', description: '', category_id: '', image: '' },
    });
  },

  async submitDish() {
    const { form, editingId } = this.data;
    if (!form.name.trim()) {
      wx.showToast({ title: '请输入菜名', icon: 'none' });
      return;
    }
    if (!form.price || isNaN(parseFloat(form.price))) {
      wx.showToast({ title: '请输入有效价格', icon: 'none' });
      return;
    }
    const dish = {
      name: form.name.trim(),
      price: parseFloat(form.price),
      description: form.description.trim(),
      category_id: form.category_id.trim(),
      image: form.image || '',
      ingredients: '',
      instructions: '',
    };
    wx.showLoading({ title: '提交中...' });
    try {
      if (editingId) {
        await api.adminAction('updateDish', { id: editingId, dish });
        wx.showToast({ title: '修改成功', icon: 'success' });
      } else {
        await api.adminAction('createDish', { dish });
        wx.showToast({ title: '新增成功', icon: 'success' });
      }
      wx.hideLoading();
      this.cancelEdit();
      this.loadDishes();
    } catch (e) {
      wx.hideLoading();
      wx.showToast({ title: '操作失败', icon: 'error' });
    }
  },

  deleteDish(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个菜品吗？',
      success: async (res) => {
        if (!res.confirm) return;
        try {
          await api.adminAction('deleteDish', { id });
          wx.showToast({ title: '删除成功', icon: 'success' });
          this.loadDishes();
        } catch (e) {
          wx.showToast({ title: '删除失败', icon: 'error' });
        }
      },
    });
  },
});
```

- [ ] **Step 9: 创建 pages/admin/banners/index.json**

```json
{ "navigationBarTitleText": "轮播图管理" }
```

- [ ] **Step 10: 创建 pages/admin/banners/index.wxml**

```xml
<view class="container">
  <view class="banner-item" wx:for="{{banners}}" wx:key="id">
    <image src="{{item.image}}" class="thumb" mode="aspectFill" />
    <view class="banner-info">
      <text class="sort">排序: {{item.sort_order}}</text>
      <text class="active">{{item.is_active ? '已启用' : '已停用'}}</text>
    </view>
    <view class="banner-actions">
      <button class="btn-toggle" bindtap="toggleBanner" data-id="{{item.id}}" data-active="{{item.is_active}}">
        {{item.is_active ? '停用' : '启用'}}
      </button>
      <button class="btn-delete" bindtap="deleteBanner" data-id="{{item.id}}">删除</button>
    </view>
  </view>

  <view class="form-card">
    <text class="form-title">新增轮播图</text>
    <view class="image-row">
      <text class="input-label">选择图片 *</text>
      <button class="btn-upload" bindtap="uploadImage">{{form.image ? '已选择' : '选择图片'}}</button>
    </view>
    <image wx:if="{{form.image}}" src="{{form.image}}" class="preview-image" mode="aspectFill" />
    <input class="input" placeholder="标题（可选）" value="{{form.title}}" bindinput="onTitleInput" />
    <input class="input" placeholder="排序数字（默认0）" value="{{form.sort_order}}" bindinput="onSortInput" type="number" />
    <button class="btn-submit" bindtap="addBanner">新增轮播图</button>
  </view>
</view>
```

- [ ] **Step 11: 创建 pages/admin/banners/index.wxss**

```css
.container { padding: 20rpx; padding-bottom: 40rpx; }
.banner-item {
  display: flex; align-items: center;
  background: #fff; border-radius: 12rpx; padding: 20rpx; margin-bottom: 16rpx; gap: 16rpx;
}
.thumb { width: 120rpx; height: 80rpx; border-radius: 8rpx; flex-shrink: 0; }
.banner-info { flex: 1; }
.sort, .active { font-size: 24rpx; color: #666; display: block; }
.banner-actions { display: flex; gap: 12rpx; }
.btn-toggle { font-size: 22rpx; padding: 8rpx 16rpx; background: #3498db; color: #fff; border-radius: 8rpx; }
.btn-delete { font-size: 22rpx; padding: 8rpx 16rpx; background: #e74c3c; color: #fff; border-radius: 8rpx; }
.form-card { background: #fff; border-radius: 16rpx; padding: 30rpx; margin-top: 30rpx; }
.form-title { font-size: 32rpx; font-weight: bold; color: #333; margin-bottom: 20rpx; display: block; }
.image-row { display: flex; align-items: center; margin-bottom: 16rpx; }
.input-label { flex: 1; font-size: 28rpx; color: #666; }
.btn-upload { font-size: 26rpx; padding: 10rpx 24rpx; background: #95a5a6; color: #fff; border-radius: 8rpx; }
.preview-image { width: 100%; height: 200rpx; border-radius: 12rpx; margin-bottom: 16rpx; }
.input {
  border: 1rpx solid #eee; border-radius: 10rpx; padding: 16rpx 20rpx;
  margin-bottom: 16rpx; font-size: 28rpx; width: 100%; box-sizing: border-box;
}
.btn-submit { background: #2ecc71; color: #fff; font-size: 30rpx; border-radius: 12rpx; padding: 20rpx; width: 100%; }
```

- [ ] **Step 12: 创建 pages/admin/banners/index.js**

```js
const api = require('../../../utils/api');

Page({
  data: {
    banners: [],
    form: { image: '', title: '', sort_order: '0' },
  },

  onShow() {
    this.loadBanners();
  },

  async loadBanners() {
    try {
      const banners = await api.adminAction('listBanners');
      this.setData({ banners: banners || [] });
    } catch (e) {
      wx.showToast({ title: '加载失败', icon: 'error' });
    }
  },

  onTitleInput(e) {
    this.setData({ form: Object.assign({}, this.data.form, { title: e.detail.value }) });
  },

  onSortInput(e) {
    this.setData({ form: Object.assign({}, this.data.form, { sort_order: e.detail.value }) });
  },

  async uploadImage() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      success: async (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath;
        wx.showLoading({ title: '上传中...' });
        try {
          const ext = tempFilePath.split('.').pop();
          const cloudPath = `banners/${Date.now()}.${ext}`;
          const uploadRes = await wx.cloud.uploadFile({ cloudPath, filePath: tempFilePath });
          this.setData({ form: Object.assign({}, this.data.form, { image: uploadRes.fileID }) });
          wx.hideLoading();
          wx.showToast({ title: '上传成功', icon: 'success' });
        } catch (e) {
          wx.hideLoading();
          wx.showToast({ title: '上传失败', icon: 'error' });
        }
      },
    });
  },

  async toggleBanner(e) {
    const { id, active } = e.currentTarget.dataset;
    try {
      await api.adminAction('updateBanner', { id, banner: { is_active: !active } });
      this.loadBanners();
    } catch (e) {
      wx.showToast({ title: '操作失败', icon: 'error' });
    }
  },

  async addBanner() {
    const { form } = this.data;
    if (!form.image) {
      wx.showToast({ title: '请选择图片', icon: 'none' });
      return;
    }
    wx.showLoading({ title: '提交中...' });
    try {
      await api.adminAction('createBanner', {
        banner: {
          image: form.image,
          title: form.title || '',
          link: '',
          sort_order: parseInt(form.sort_order) || 0,
          is_active: true,
          is_default: false,
        },
      });
      wx.hideLoading();
      wx.showToast({ title: '新增成功', icon: 'success' });
      this.setData({ form: { image: '', title: '', sort_order: '0' } });
      this.loadBanners();
    } catch (e) {
      wx.hideLoading();
      wx.showToast({ title: '新增失败', icon: 'error' });
    }
  },

  deleteBanner(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这张轮播图吗？',
      success: async (res) => {
        if (!res.confirm) return;
        try {
          await api.adminAction('deleteBanner', { id });
          wx.showToast({ title: '删除成功', icon: 'success' });
          this.loadBanners();
        } catch (e) {
          wx.showToast({ title: '删除失败', icon: 'error' });
        }
      },
    });
  },
});
```

- [ ] **Step 13: Commit**

```bash
git add pages/admin/
git commit -m "feat: 新增管理员页面（菜品管理、轮播图管理）"
```

---

### Task 13: 更新 app.json，添加管理员页面路径

**Files:**
- Modify: `app.json`

- [ ] **Step 1: 在 pages 数组中添加管理员页面路径**

```json
{
  "pages": [
    "pages/home/home",
    "pages/index/index",
    "pages/cart/cart",
    "pages/orders/orders",
    "pages/profile/profile",
    "pages/random/random",
    "pages/reservation/reservation",
    "pages/reservation-detail/reservation-detail",
    "pages/admin/index/index",
    "pages/admin/dishes/index",
    "pages/admin/banners/index"
  ],
  "window": {
    "backgroundTextStyle": "light",
    "navigationBarBackgroundColor": "#f9f9f9",
    "navigationBarTitleText": "",
    "navigationBarTextStyle": "black",
    "navigationStyle": "custom"
  },
  "tabBar": {
    "custom": true,
    "color": "#999999",
    "selectedColor": "#2d3435",
    "borderStyle": "white",
    "backgroundColor": "#ffffff",
    "list": [
      { "pagePath": "pages/home/home", "text": "HOME" },
      { "pagePath": "pages/index/index", "text": "TASTE" },
      { "pagePath": "pages/cart/cart", "text": "CART" },
      { "pagePath": "pages/profile/profile", "text": "IDENTITY" }
    ]
  },
  "sitemapLocation": "sitemap.json"
}
```

- [ ] **Step 2: Commit**

```bash
git add app.json
git commit -m "feat: app.json 添加管理员页面路由"
```

---

### Task 14: 更新 README 和 CHANGELOG，最终提交

- [ ] **Step 1: 更新 README.md 后端部分说明**（更新云开发架构描述）

- [ ] **Step 2: 更新 CHANGELOG.md**（添加本次重构记录）

- [ ] **Step 3: Final commit**

```bash
git add README.md CHANGELOG.md
git commit -m "docs: 更新 README 和 CHANGELOG - 微信云开发后端重构"
```

---

## 部署说明（重构完成后操作步骤）

1. **开通云开发**：微信开发者工具 → 点击「云开发」→ 开通并记录环境 ID
2. **替换环境 ID**：将 `app.js` 中的 `YOUR_ENV_ID` 替换为实际环境 ID
3. **创建云数据库集合**：在云开发控制台手动创建以下集合（权限设置为"所有用户可读，仅创建者可写"，orders/reservations 可设为"仅创建者可读写"）：
   - `banners`、`main_categories`、`categories`、`dishes`、`orders`、`reservations`、`users`
4. **上传并部署云函数**：在开发者工具中右键每个云函数目录 → 上传并部署（记得先 npm install）
5. **获取管理员 openid**：在小程序中调用 `api.adminAction('getOpenid')` 或在 profile 页面查看控制台输出
6. **配置管理员白名单**：将获取到的 openid 填入 `cloudfunctions/admin/index.js` 的 `ADMIN_OPENIDS` 数组，重新部署 admin 云函数
7. **初始化数据**：管理员登录后，进入管理后台 → 点击「初始化默认数据」
