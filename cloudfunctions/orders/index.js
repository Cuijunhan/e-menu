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
  const { action } = event
  const wxContext = cloud.getWXContext()
  const OPENID = wxContext.OPENID || wxContext.openId || ''

  if (!OPENID) return action === 'list' ? [] : { error: '无法获取用户身份' }

  const family_id = await getFamilyId(OPENID)
  if (!family_id) return action === 'list' ? [] : { error: '你还未加入任何家庭' }

  switch (action) {
    case 'create':
      return await createOrder(OPENID, family_id, event)
    case 'list':
      return await listOrders(OPENID, family_id)
    case 'delete':
      return await deleteOrder(OPENID, event)
    default:
      return { error: 'Unknown action' }
  }
}

async function createOrder(openid, family_id, { items }) {
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const res = await db.collection('orders').add({
    data: {
      openid,
      family_id,
      total_price: parseFloat(total.toFixed(2)),
      status: '已下单',
      create_time: new Date(),
      items,
    }
  })
  return { id: res._id }
}

async function listOrders(openid, family_id) {
  const res = await db.collection('orders')
    .where({ openid, family_id })
    .orderBy('create_time', 'desc')
    .limit(100)
    .get()
  return res.data.map(normalize)
}

async function deleteOrder(openid, { id }) {
  const orderRes = await db.collection('orders').doc(id).get()
  if (!orderRes.data || orderRes.data.openid !== openid) return { error: '无权限' }
  await db.collection('orders').doc(id).remove()
  return { ok: true }
}
