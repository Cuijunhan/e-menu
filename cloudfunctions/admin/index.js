const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// ⚠️ 部署前替换为真实管理员 openid
// 可先调用 getOpenid action 获取你的 openid，然后填入此处并重新部署
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
