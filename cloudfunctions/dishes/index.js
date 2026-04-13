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
