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
