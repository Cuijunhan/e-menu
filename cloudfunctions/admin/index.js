const cloud = require('wx-server-sdk')
cloud.init({ env: 'cloud1-6g24anub992426c4' })
const db = cloud.database()

const CAT_COLLECTIONS = {
  food:   'food_categories',
  coffee: 'coffee_categories',
  drink:  'drink_categories',
}
const DISH_COLLECTIONS = {
  food:   'food_dishes',
  coffee: 'coffee_dishes',
  drink:  'drink_dishes',
}

function normalize(doc) {
  const obj = Object.assign({}, doc, { id: doc._id })
  delete obj._id
  if (obj.create_time instanceof Date) obj.create_time = obj.create_time.toISOString()
  return obj
}

async function getContext(openid) {
  const res = await db.collection('users').where({ openid }).limit(1).get()
  if (res.data.length === 0 || !res.data[0].family_id) return null
  return { family_id: res.data[0].family_id, role: res.data[0].role }
}

exports.main = async (event) => {
  const { action, data = {} } = event
  const { OPENID } = cloud.getWXContext()

  if (action === 'getOpenid') return { openid: OPENID }
  if (action === 'initData') return await initData(OPENID)

  const ctx = await getContext(OPENID)
  if (!ctx) return { error: '你还未加入任何家庭' }

  const { family_id, role } = ctx
  const isAdmin = role === 'admin'

  switch (action) {

    // ── 分类管理 ──────────────────────────────────────
    case 'listCategories': {
      const col = CAT_COLLECTIONS[data.type]
      if (!col) return { error: '无效 type' }
      const res = await db.collection(col).where({ family_id }).limit(100).get()
      return res.data.map(normalize)
    }
    case 'createCategory': {
      if (!isAdmin) return { error: '无权限' }
      const col = CAT_COLLECTIONS[data.type]
      if (!col) return { error: '无效 type' }
      const res = await db.collection(col).add({ data: { name: data.name, family_id } })
      return { id: res._id }
    }
    case 'deleteCategory': {
      if (!isAdmin) return { error: '无权限' }
      const col = CAT_COLLECTIONS[data.type]
      if (!col) return { error: '无效 type' }
      await db.collection(col).doc(data.id).remove()
      return { ok: true }
    }

    // ── 菜品管理 ──────────────────────────────────────
    case 'listDishes': {
      const col = DISH_COLLECTIONS[data.type]
      if (!col) return { error: '无效 type' }
      const res = await db.collection(col).where({ family_id }).limit(200).get()
      return res.data.map(normalize)
    }
    case 'createDish': {
      if (!isAdmin) return { error: '无权限' }
      const col = DISH_COLLECTIONS[data.type]
      if (!col) return { error: '无效 type' }
      const res = await db.collection(col).add({ data: Object.assign({}, data.dish, { family_id }) })
      return { id: res._id }
    }
    case 'updateDish': {
      if (!isAdmin) return { error: '无权限' }
      const col = DISH_COLLECTIONS[data.type]
      if (!col) return { error: '无效 type' }
      await db.collection(col).doc(data.id).update({ data: data.dish })
      return { ok: true }
    }
    case 'deleteDish': {
      if (!isAdmin) return { error: '无权限' }
      const col = DISH_COLLECTIONS[data.type]
      if (!col) return { error: '无效 type' }
      await db.collection(col).doc(data.id).remove()
      return { ok: true }
    }

    // ── 轮播图管理 ────────────────────────────────────
    case 'listBanners': {
      const res = await db.collection('banners').where({ family_id }).orderBy('sort_order', 'asc').limit(100).get()
      return res.data.map(normalize)
    }
    case 'createBanner': {
      if (!isAdmin) return { error: '无权限' }
      const res = await db.collection('banners').add({ data: Object.assign({}, data.banner, { family_id }) })
      return { id: res._id }
    }
    case 'updateBanner': {
      if (!isAdmin) return { error: '无权限' }
      await db.collection('banners').doc(data.id).update({ data: data.banner })
      return { ok: true }
    }
    case 'deleteBanner': {
      if (!isAdmin) return { error: '无权限' }
      await db.collection('banners').doc(data.id).remove()
      return { ok: true }
    }

    // ── 订单管理 ──────────────────────────────────────
    case 'listAllOrders': {
      if (!isAdmin) return { error: '无权限' }
      const [ordersRes, usersRes] = await Promise.all([
        db.collection('orders').where({ family_id }).orderBy('create_time', 'desc').limit(100).get(),
        db.collection('users').where({ family_id }).limit(50).get(),
      ])
      const nicknameMap = {}
      usersRes.data.forEach(u => { nicknameMap[u.openid] = u.nickname || '未知用户' })
      return ordersRes.data.map(doc => {
        const order = normalize(doc)
        order.user_nickname = nicknameMap[order.openid] || '未知用户'
        return order
      })
    }
    case 'updateOrderStatus': {
      if (!isAdmin) return { error: '无权限' }
      await db.collection('orders').doc(data.id).update({ data: { status: data.status } })
      return { ok: true }
    }
    case 'deleteOrder': {
      if (!isAdmin) return { error: '无权限' }
      await db.collection('orders').doc(data.id).remove()
      return { ok: true }
    }

    // ── 食材数据库 ────────────────────────────────────
    case 'listIngredients': {
      const res = await db.collection('ingredients').where({ family_id }).orderBy('name', 'asc').limit(200).get()
      return res.data.map(normalize)
    }
    case 'createIngredient': {
      if (!isAdmin) return { error: '无权限' }
      if (!data.name || !data.name.trim()) return { error: '名称不能为空' }
      const exist = await db.collection('ingredients').where({ family_id, name: data.name.trim() }).limit(1).get()
      if (exist.data.length > 0) return { error: '食材已存在', id: exist.data[0]._id }
      const res = await db.collection('ingredients').add({ data: { name: data.name.trim(), unit: data.unit || '', family_id } })
      return { id: res._id }
    }
    case 'deleteIngredient': {
      if (!isAdmin) return { error: '无权限' }
      await db.collection('ingredients').doc(data.id).remove()
      return { ok: true }
    }

    // ── 预约管理（管理员） ────────────────────────────
    case 'listAllReservations': {
      if (!isAdmin) return { error: '无权限' }
      const [resvRes, usersRes] = await Promise.all([
        db.collection('reservations').where({ family_id }).orderBy('create_time', 'desc').limit(100).get(),
        db.collection('users').where({ family_id }).limit(50).get(),
      ])
      const nicknameMap = {}
      usersRes.data.forEach(u => { nicknameMap[u.openid] = u.nickname || '未知用户' })
      return resvRes.data.map(doc => {
        const r = normalize(doc)
        r.user_nickname = nicknameMap[r.openid] || '未知用户'
        r.user_initial = r.user_nickname.slice(0, 1)
        return r
      })
    }
    case 'updateReservationStatus': {
      if (!isAdmin) return { error: '无权限' }
      await db.collection('reservations').doc(data.id).update({ data: { status: data.status } })
      return { ok: true }
    }
    case 'adminDeleteReservation': {
      if (!isAdmin) return { error: '无权限' }
      await db.collection('reservations').doc(data.id).remove()
      return { ok: true }
    }

    // ── 订单食材汇总 ──────────────────────────────────
    case 'getOrderIngredients': {
      if (!isAdmin) return { error: '无权限' }
      const orderDoc = await db.collection('orders').doc(data.id).get()
      if (!orderDoc.data) return { error: '订单不存在' }
      const items = orderDoc.data.items || []
      const enriched = await Promise.all(items.map(async item => {
        const dish = await getDishById(db, item.dish_id)
        return {
          dish_name: item.dish_name,
          quantity: item.quantity,
          price: item.price,
          ingredient_list: dish ? (dish.ingredient_list || []) : [],
          instructions: dish ? (dish.instructions || '') : '',
          notes: dish ? (dish.notes || '') : '',
        }
      }))
      // 按食材名称聚合（amount × 菜品数量）
      const summaryMap = {}
      enriched.forEach(item => {
        ;(item.ingredient_list || []).forEach(ing => {
          const key = ing.name
          if (!summaryMap[key]) summaryMap[key] = { name: ing.name, unit: ing.unit || '', total: 0 }
          summaryMap[key].total += (parseFloat(ing.amount) || 0) * item.quantity
        })
      })
      return {
        items: enriched,
        summary: Object.values(summaryMap),
        total_price: orderDoc.data.total_price,
      }
    }

    default:
      return { error: 'Unknown action' }
  }
}

async function getDishById(db, dishId) {
  if (!dishId) return null
  const cols = ['food_dishes', 'coffee_dishes', 'drink_dishes']
  const results = await Promise.allSettled(cols.map(col => db.collection(col).doc(dishId).get()))
  for (const r of results) {
    if (r.status === 'fulfilled' && r.value && r.value.data) return r.value.data
  }
  return null
}

async function initData(openid) {
  const userRes = await db.collection('users').where({ openid }).limit(1).get()
  if (userRes.data.length === 0 || !userRes.data[0].family_id) {
    return { error: '请先创建或加入家庭再初始化数据' }
  }
  const family_id = userRes.data[0].family_id

  // 检查是否已初始化（以 food_categories 为基准）
  const existing = await db.collection('food_categories').where({ family_id }).limit(1).get()
  if (existing.data.length > 0) return { message: '数据已存在，跳过初始化' }

  // ── 饭菜分类（6个）────────────────────────────────
  const [fc1, fc2, fc3, fc4, fc5, fc6] = await Promise.all([
    db.collection('food_categories').add({ data: { name: '热菜', family_id } }),
    db.collection('food_categories').add({ data: { name: '凉菜', family_id } }),
    db.collection('food_categories').add({ data: { name: '汤类', family_id } }),
    db.collection('food_categories').add({ data: { name: '主食', family_id } }),
    db.collection('food_categories').add({ data: { name: '小炒', family_id } }),
    db.collection('food_categories').add({ data: { name: '炖菜', family_id } }),
  ])

  // ── 咖啡分类（4个）────────────────────────────────
  const [cc1, cc2, cc3, cc4] = await Promise.all([
    db.collection('coffee_categories').add({ data: { name: '美式', family_id } }),
    db.collection('coffee_categories').add({ data: { name: '拿铁', family_id } }),
    db.collection('coffee_categories').add({ data: { name: '手冲', family_id } }),
    db.collection('coffee_categories').add({ data: { name: '特调', family_id } }),
  ])

  // ── 酒水分类（4个）────────────────────────────────
  const [dc1, dc2, dc3, dc4] = await Promise.all([
    db.collection('drink_categories').add({ data: { name: '红酒', family_id } }),
    db.collection('drink_categories').add({ data: { name: '白酒', family_id } }),
    db.collection('drink_categories').add({ data: { name: '啤酒', family_id } }),
    db.collection('drink_categories').add({ data: { name: '鸡尾酒', family_id } }),
  ])

  // ── 饭菜（16道）──────────────────────────────────
  await Promise.all([
    // 热菜
    db.collection('food_dishes').add({ data: { name: '红烧肉', price: 38.0, category_id: fc1._id, description: '软烂入味，肥而不腻', image: '', ingredients: '五花肉、冰糖、料酒', instructions: '', family_id } }),
    db.collection('food_dishes').add({ data: { name: '鱼香肉丝', price: 28.0, category_id: fc1._id, description: '经典川菜，酸甜微辣', image: '', ingredients: '猪里脊、木耳、胡萝卜', instructions: '', family_id } }),
    db.collection('food_dishes').add({ data: { name: '番茄炒蛋', price: 18.0, category_id: fc1._id, description: '家常必备，下饭神器', image: '', ingredients: '番茄、鸡蛋', instructions: '', family_id } }),
    db.collection('food_dishes').add({ data: { name: '宫保鸡丁', price: 32.0, category_id: fc1._id, description: '香辣爽口，回味悠长', image: '', ingredients: '鸡胸肉、花生、干辣椒', instructions: '', family_id } }),
    // 凉菜
    db.collection('food_dishes').add({ data: { name: '拍黄瓜', price: 12.0, category_id: fc2._id, description: '清脆爽口，蒜香十足', image: '', ingredients: '黄瓜、蒜、香油', instructions: '', family_id } }),
    db.collection('food_dishes').add({ data: { name: '口水鸡', price: 36.0, category_id: fc2._id, description: '麻辣鲜香，嫩滑多汁', image: '', ingredients: '鸡腿、花椒、辣椒油', instructions: '', family_id } }),
    db.collection('food_dishes').add({ data: { name: '凉拌木耳', price: 14.0, category_id: fc2._id, description: '爽脆清淡，开胃解腻', image: '', ingredients: '木耳、红椒、香醋', instructions: '', family_id } }),
    // 汤类
    db.collection('food_dishes').add({ data: { name: '番茄蛋花汤', price: 12.0, category_id: fc3._id, description: '酸甜开胃，暖胃暖心', image: '', ingredients: '番茄、鸡蛋', instructions: '', family_id } }),
    db.collection('food_dishes').add({ data: { name: '冬瓜排骨汤', price: 42.0, category_id: fc3._id, description: '清甜润口，骨香浓郁', image: '', ingredients: '冬瓜、排骨、姜', instructions: '', family_id } }),
    // 主食
    db.collection('food_dishes').add({ data: { name: '米饭', price: 3.0, category_id: fc4._id, description: '东北大米，颗粒饱满', image: '', ingredients: '', instructions: '', family_id } }),
    db.collection('food_dishes').add({ data: { name: '手擀面', price: 16.0, category_id: fc4._id, description: '劲道有嚼劲，汤底鲜美', image: '', ingredients: '面粉、鸡蛋', instructions: '', family_id } }),
    // 小炒
    db.collection('food_dishes').add({ data: { name: '炒花甲', price: 26.0, category_id: fc5._id, description: '鲜辣入味，下酒神器', image: '', ingredients: '花甲、豆豉、辣椒', instructions: '', family_id } }),
    db.collection('food_dishes').add({ data: { name: '干煸四季豆', price: 22.0, category_id: fc5._id, description: '外焦里嫩，咸香可口', image: '', ingredients: '四季豆、猪肉末', instructions: '', family_id } }),
    // 炖菜
    db.collection('food_dishes').add({ data: { name: '东坡肘子', price: 68.0, category_id: fc6._id, description: '皮糯肉烂，酱香扑鼻', image: '', ingredients: '猪肘、冰糖、八角', instructions: '', family_id } }),
    db.collection('food_dishes').add({ data: { name: '白菜炖粉条', price: 18.0, category_id: fc6._id, description: '暖胃家常，软糯入味', image: '', ingredients: '白菜、粉条、猪肉', instructions: '', family_id } }),
    db.collection('food_dishes').add({ data: { name: '羊肉炖萝卜', price: 48.0, category_id: fc6._id, description: '鲜嫩不膻，冬日暖身', image: '', ingredients: '羊肉、白萝卜、姜片', instructions: '', family_id } }),
  ])

  // ── 咖啡（8款）───────────────────────────────────
  await Promise.all([
    db.collection('coffee_dishes').add({ data: { name: '冰美式', price: 22.0, category_id: cc1._id, description: '清爽微苦，提神利器', image: '', ingredients: '', instructions: '', family_id } }),
    db.collection('coffee_dishes').add({ data: { name: '热美式', price: 20.0, category_id: cc1._id, description: '醇厚苦香，经典不败', image: '', ingredients: '', instructions: '', family_id } }),
    db.collection('coffee_dishes').add({ data: { name: '拿铁', price: 28.0, category_id: cc2._id, description: '丝滑奶香，柔和醇厚', image: '', ingredients: '', instructions: '', family_id } }),
    db.collection('coffee_dishes').add({ data: { name: '燕麦拿铁', price: 32.0, category_id: cc2._id, description: '植物奶香，清甜顺滑', image: '', ingredients: '', instructions: '', family_id } }),
    db.collection('coffee_dishes').add({ data: { name: '耶加雪菲', price: 38.0, category_id: cc3._id, description: '花果茶香，明亮清新', image: '', ingredients: '', instructions: '', family_id } }),
    db.collection('coffee_dishes').add({ data: { name: '瑰夏', price: 58.0, category_id: cc3._id, description: '茉莉花香，复杂层次', image: '', ingredients: '', instructions: '', family_id } }),
    db.collection('coffee_dishes').add({ data: { name: '黑糖拿铁', price: 34.0, category_id: cc4._id, description: '焦糖甜蜜，浓郁回甘', image: '', ingredients: '', instructions: '', family_id } }),
    db.collection('coffee_dishes').add({ data: { name: '生椰拿铁', price: 36.0, category_id: cc4._id, description: '椰香浓郁，清甜爽口', image: '', ingredients: '', instructions: '', family_id } }),
  ])

  // ── 酒水（8款）───────────────────────────────────
  await Promise.all([
    db.collection('drink_dishes').add({ data: { name: '赤霞珠', price: 88.0, category_id: dc1._id, description: '饱满单宁，黑色浆果香', image: '', ingredients: '', instructions: '', family_id } }),
    db.collection('drink_dishes').add({ data: { name: '黑皮诺', price: 128.0, category_id: dc1._id, description: '优雅细腻，红果香气', image: '', ingredients: '', instructions: '', family_id } }),
    db.collection('drink_dishes').add({ data: { name: '酱香白酒', price: 58.0, category_id: dc2._id, description: '酱香浓郁，入口绵柔', image: '', ingredients: '', instructions: '', family_id } }),
    db.collection('drink_dishes').add({ data: { name: '清香白酒', price: 38.0, category_id: dc2._id, description: '清雅纯净，回甜爽口', image: '', ingredients: '', instructions: '', family_id } }),
    db.collection('drink_dishes').add({ data: { name: '精酿IPA', price: 38.0, category_id: dc3._id, description: '酒花浓郁，苦中带甜', image: '', ingredients: '', instructions: '', family_id } }),
    db.collection('drink_dishes').add({ data: { name: '小麦白啤', price: 28.0, category_id: dc3._id, description: '清爽微酸，香蕉丁香香', image: '', ingredients: '', instructions: '', family_id } }),
    db.collection('drink_dishes').add({ data: { name: '莫吉托', price: 48.0, category_id: dc4._id, description: '薄荷清新，酸甜平衡', image: '', ingredients: '朗姆酒、薄荷、青柠', instructions: '', family_id } }),
    db.collection('drink_dishes').add({ data: { name: '血腥玛丽', price: 52.0, category_id: dc4._id, description: '番茄辛辣，层次丰富', image: '', ingredients: '伏特加、番茄汁、辣椒', instructions: '', family_id } }),
  ])

  // ── 轮播图 ───────────────────────────────────────
  await Promise.all([
    db.collection('banners').add({ data: { image: '/images/banner-cooking.png', title: ' ', sort_order: 1, is_active: true, family_id } }),
    db.collection('banners').add({ data: { image: '/images/banner-coffee.png', title: ' ', sort_order: 2, is_active: true, family_id } }),
    db.collection('banners').add({ data: { image: '/images/banner-cocktail.png', title: ' ', sort_order: 3, is_active: true, family_id } }),
  ])

  return { message: '初始化完成' }
}
