# 家庭点餐小程序

一个用于家庭内部使用的微信点餐系统，包含微信小程序前端和 FastAPI 后端。

---

## 快速启动后端

### 1. 安装依赖

```bash
cd backend
pip install -r requirements.txt
```

### 2. 启动服务

```bash
cd backend
python main.py
```

启动成功后终端会显示：

```
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
✅ 示例数据初始化完成
```

> 首次启动会自动创建 `menu.db` 数据库，并写入示例菜品数据。

**局域网访问配置：**

后端服务监听 `0.0.0.0:8000`，支持局域网内其他设备访问。小程序需配置本机IP地址：

```js
// utils/api.js
const BASE_URL = "http://192.168.1.172:8000";  // 替换为你的本机IP
```

获取本机IP：Windows 运行 `ipconfig`，macOS/Linux 运行 `ifconfig`。

### 3. 验证运行

浏览器访问以下地址确认服务正常：

| 地址 | 说明 |
|------|------|
| http://127.0.0.1:8000 | API 根节点（返回 JSON） |
| http://127.0.0.1:8000/docs | 自动生成的 Swagger 接口文档 |
| http://127.0.0.1:8000/admin | 后台管理界面（添加菜品/分类） |

---

## 前端（微信小程序）

用微信开发者工具打开项目根目录（`电子菜单/`），确保 `utils/api.js` 中的 `BASE_URL` 与后端地址一致：

```js
// utils/api.js
const BASE_URL = "http://localhost:8000";
```

---

## 项目结构

```
电子菜单/
├── pages/               # 小程序页面
│   ├── home/            # 首页（Banner + 功能入口）
│   ├── index/           # 点单页（菜品列表）
│   ├── cart/            # 购物车
│   ├── orders/          # 历史订单
│   ├── profile/         # 我的
│   ├── random/          # 随机推荐
│   └── reservation/     # 想吃什么（菜单外预约）
├── images/              # 图片素材
├── utils/api.js         # 后端请求封装
├── app.js               # 全局状态（购物车）
└── backend/
    ├── main.py          # FastAPI 入口
    ├── models.py        # 数据库模型
    ├── schemas.py       # Pydantic Schema
    ├── database.py      # SQLite 连接
    ├── routers/         # 路由模块
    │   ├── dishes.py    # 菜品接口
    │   ├── categories.py# 分类接口
    │   ├── orders.py    # 订单接口
    │   └── reservations.py # 预约接口
    ├── static/
    │   └── admin.html   # 后台管理界面
    ├── menu.db          # SQLite 数据库（自动生成）
    └── requirements.txt
```

---

## 主要功能

- **三级分类系统** — 主分类（饭菜/咖啡/酒）+ 子分类，独立管理各分类体系
- **点菜** — 按分类浏览菜品，加入购物车下单，点击菜品查看详细介绍
- **首页快捷入口** — 点击 COOKING/COFFEE/WINE 直接跳转到对应分类
- **随机推荐** — 随机生成今日菜单，三种动画特效，智能过滤已加入的菜品
- **历史订单** — 查看订单记录，支持编辑数量、重新下单、取消/删除订单
- **想吃什么** — 预约菜单上没有的菜，支持编辑和删除预约
- **后台管理** — 浏览器打开 `/admin` 即可添加/编辑菜品和分类
- **轮播Banner** — 首页展示精选推荐，支持自定义上传
- **自定义TabBar** — 玻璃态效果底部导航栏

---

## 预约功能说明

首页新增「想吃什么」入口，可以预约目前菜单上没有的菜：

1. 输入**菜名**（必填）
2. 粘贴**抖音或小红书链接**（可选，方便参考做法）
3. 填写**备注**，如口味偏好、特殊要求（可选）
4. 提交后可查看历史预约记录，状态分为**待处理** / **已处理**
5. 点击预约记录可进入详情页，支持编辑和删除（已处理的预约无法修改）

后端 API：

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /reservations | 提交预约 |
| GET | /reservations?user_id=1 | 查询预约列表 |
| PUT | /reservations/{id} | 更新预约内容 |
| DELETE | /reservations/{id} | 删除预约 |

---

## 停止服务

终端按 `Ctrl + C` 即可。
