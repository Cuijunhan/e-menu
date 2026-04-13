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
