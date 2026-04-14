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
      return await createReservation(OPENID, data)
    case 'list':
      return await listReservations(OPENID)
    case 'update':
      return await updateReservation(OPENID, data)
    case 'delete':
      return await deleteReservation(OPENID, data)
    default:
      return { error: 'Unknown action' }
  }
}

async function createReservation(openid, { dish_name, link, note }) {
  const res = await db.collection('reservations').add({
    data: {
      openid,
      dish_name: dish_name.trim(),
      link: link || '',
      note: note || '',
      status: '待处理',
      create_time: new Date(),
    }
  })
  return { id: res._id }
}

async function listReservations(openid) {
  const res = await db.collection('reservations')
    .where({ openid })
    .orderBy('create_time', 'desc')
    .limit(100)
    .get()
  return res.data.map(normalize)
}

async function updateReservation(openid, { id, dish_name, link, note }) {
  const r = await db.collection('reservations').doc(id).get()
  if (r.data.openid !== openid) return { error: '无权限' }
  if (r.data.status === '已处理') return { error: '已处理的预约无法修改' }
  await db.collection('reservations').doc(id).update({
    data: {
      dish_name: dish_name.trim(),
      link: link || '',
      note: note || '',
    }
  })
  return { ok: true }
}

async function deleteReservation(openid, { id }) {
  const r = await db.collection('reservations').doc(id).get()
  if (r.data.openid !== openid) return { error: '无权限' }
  await db.collection('reservations').doc(id).remove()
  return { ok: true }
}
