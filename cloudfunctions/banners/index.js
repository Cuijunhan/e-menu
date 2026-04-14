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
