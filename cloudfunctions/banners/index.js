const cloud = require('wx-server-sdk')
cloud.init({ env: 'cloud1-6g24anub992426c4' })
const db = cloud.database()

function normalize(doc) {
  const obj = Object.assign({}, doc, { id: doc._id })
  delete obj._id
  if (obj.create_time instanceof Date) obj.create_time = obj.create_time.toISOString()
  return obj
}

async function getFamilyId(openid) {
  const res = await db.collection('users').where({ openid }).limit(1).get()
  if (res.data.length === 0 || !res.data[0].family_id) return null
  return res.data[0].family_id
}

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const family_id = await getFamilyId(OPENID)
  if (!family_id) return []

  const res = await db.collection('banners')
    .where({ family_id, is_active: true })
    .orderBy('sort_order', 'asc')
    .limit(100)
    .get()
  return res.data.map(normalize)
}
