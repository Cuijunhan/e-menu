const cloud = require('wx-server-sdk')
cloud.init({ env: 'cloud1-6g24anub992426c4' })
const db = cloud.database()

// 三种固定类型对应的菜品集合
const DISH_COLLECTIONS = {
  food:   'food_dishes',
  coffee: 'coffee_dishes',
  drink:  'drink_dishes',
}

function normalize(doc) {
  const obj = Object.assign({}, doc, { id: doc._id })
  delete obj._id
  return obj
}

async function getFamilyId(openid) {
  const res = await db.collection('users').where({ openid }).limit(1).get()
  if (res.data.length === 0 || !res.data[0].family_id) return null
  return res.data[0].family_id
}

exports.main = async (event) => {
  const { action } = event
  const { OPENID } = cloud.getWXContext()
  const family_id = await getFamilyId(OPENID)
  if (!family_id) return action === 'list' ? [] : { error: '未加入家庭' }

  switch (action) {
    case 'list':   return await listDishes(family_id, event)
    case 'random': return await randomDishes(family_id, event)
    case 'get':    return await getDish(event)
    default:       return { error: 'Unknown action' }
  }
}

async function listDishes(family_id, { type, categoryId }) {
  const col = DISH_COLLECTIONS[type]
  if (!col) return []

  const query = categoryId
    ? db.collection(col).where({ family_id, category_id: categoryId }).limit(100)
    : db.collection(col).where({ family_id }).limit(100)

  const res = await query.get()
  return res.data.map(normalize)
}

async function randomDishes(family_id, { count = 5 }) {
  // 从三个集合各取数据，合并后随机
  const [r1, r2, r3] = await Promise.all([
    db.collection('food_dishes').where({ family_id }).limit(200).get(),
    db.collection('coffee_dishes').where({ family_id }).limit(200).get(),
    db.collection('drink_dishes').where({ family_id }).limit(200).get(),
  ])
  const all = [
    ...r1.data.map(d => Object.assign(normalize(d), { type: 'food' })),
    ...r2.data.map(d => Object.assign(normalize(d), { type: 'coffee' })),
    ...r3.data.map(d => Object.assign(normalize(d), { type: 'drink' })),
  ]
  if (all.length <= count) return all
  return all.slice().sort(() => Math.random() - 0.5).slice(0, count)
}

async function getDish({ type, id }) {
  const col = DISH_COLLECTIONS[type]
  if (!col || !id) return { error: '参数错误' }
  const res = await db.collection(col).doc(id).get()
  return normalize(res.data)
}
