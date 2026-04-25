const cloud = require('wx-server-sdk')
cloud.init({ env: 'cloud1-6g24anub992426c4' })
const db = cloud.database()

function normalize(doc) {
  const obj = Object.assign({}, doc, { id: doc._id })
  delete obj._id
  if (obj.create_time instanceof Date) obj.create_time = obj.create_time.toISOString()
  return obj
}

async function getContext(openid) {
  const res = await db.collection('users').where({ openid }).limit(1).get()
  if (res.data.length === 0 || !res.data[0].family_id) return null
  return { family_id: res.data[0].family_id }
}

exports.main = async (event) => {
  const { action } = event
  const { OPENID } = cloud.getWXContext()
  const ctx = await getContext(OPENID)
  if (!ctx) return action === 'list' ? [] : { error: '未加入家庭' }

  switch (action) {
    case 'create': return await createReservation(OPENID, ctx.family_id, event)
    case 'list':   return await listReservations(OPENID, ctx.family_id)
    case 'update': return await updateReservation(OPENID, event)
    case 'delete': return await deleteReservation(OPENID, event)
    default:       return { error: 'Unknown action' }
  }
}

async function createReservation(openid, family_id, { dish_name, link, note }) {
  const res = await db.collection('reservations').add({
    data: {
      openid, family_id,
      dish_name: dish_name.trim(),
      link: link || '',
      note: note || '',
      status: '待处理',
      create_time: new Date(),
    }
  })
  return { id: res._id }
}

async function listReservations(openid, family_id) {
  const res = await db.collection('reservations')
    .where({ openid, family_id })
    .orderBy('create_time', 'desc')
    .limit(100)
    .get()
  return res.data.map(normalize)
}

async function updateReservation(openid, { id, dish_name, link, note }) {
  const r = await db.collection('reservations').doc(id).get()
  if (!r.data || r.data.openid !== openid) return { error: '无权限' }
  if (r.data.status === '已处理') return { error: '已处理的预约无法修改' }
  await db.collection('reservations').doc(id).update({
    data: { dish_name: dish_name.trim(), link: link || '', note: note || '' }
  })
  return { ok: true }
}

async function deleteReservation(openid, { id }) {
  const r = await db.collection('reservations').doc(id).get()
  if (!r.data || r.data.openid !== openid) return { error: '无权限' }
  await db.collection('reservations').doc(id).remove()
  return { ok: true }
}
