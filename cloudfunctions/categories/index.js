const cloud = require('wx-server-sdk')
cloud.init({ env: 'cloud1-6g24anub992426c4' })
const db = cloud.database()

// 三种固定类型对应的分类集合
const CAT_COLLECTIONS = {
  food:   'food_categories',
  coffee: 'coffee_categories',
  drink:  'drink_categories',
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
  const { action, type } = event
  const { OPENID } = cloud.getWXContext()
  const family_id = await getFamilyId(OPENID)
  if (!family_id) return []

  const col = CAT_COLLECTIONS[type]
  if (!col) return { error: '无效的类型，type 须为 food / coffee / drink' }

  if (action === 'list') {
    const res = await db.collection(col).where({ family_id }).limit(100).get()
    return res.data.map(normalize)
  }

  return { error: 'Unknown action' }
}
