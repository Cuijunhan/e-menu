const cloud = require('wx-server-sdk')
cloud.init({ env: 'cloud1-6g24anub992426c4' })
const db = cloud.database()
const _ = db.command

function normalize(doc) {
  const obj = Object.assign({}, doc, { id: doc._id })
  delete obj._id
  if (obj.joined_at instanceof Date) obj.joined_at = obj.joined_at.toISOString()
  if (obj.created_at instanceof Date) obj.created_at = obj.created_at.toISOString()
  return obj
}

// 生成6位邀请码
function genInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

// 生成唯一邀请码（避免重复）
async function genUniqueCode() {
  for (let i = 0; i < 10; i++) {
    const code = genInviteCode()
    const exist = await db.collection('families').where({ invite_code: code }).limit(1).get()
    if (exist.data.length === 0) return code
  }
  throw new Error('生成邀请码失败，请重试')
}

// 获取当前用户信息（含家庭信息）
async function getProfile(openid) {
  const userRes = await db.collection('users').where({ openid }).limit(1).get()
  if (userRes.data.length === 0) return { openid }

  const user = normalize(userRes.data[0])
  if (!user.family_id) return user

  const familyRes = await db.collection('families').doc(user.family_id).get()
  const family = familyRes.data ? normalize(familyRes.data) : null
  return Object.assign({}, user, {
    family_name: family ? family.name : '',
    invite_code: family ? family.invite_code : '',
  })
}

// 创建家庭，当前用户成为 admin
async function createFamily(openid, { family_name, nickname }) {
  // 检查是否已有家庭
  const existing = await db.collection('users').where({ openid }).limit(1).get()
  if (existing.data.length > 0 && existing.data[0].family_id) {
    return { error: '你已加入一个家庭，请先退出再创建' }
  }

  const invite_code = await genUniqueCode()
  const familyRes = await db.collection('families').add({
    data: {
      name: family_name.trim(),
      invite_code,
      created_by: openid,
      created_at: new Date(),
    }
  })
  const family_id = familyRes._id

  // 创建或更新用户记录
  if (existing.data.length > 0) {
    await db.collection('users').doc(existing.data[0]._id).update({
      data: { family_id, role: 'admin', nickname: nickname || '管理员', joined_at: new Date() }
    })
  } else {
    await db.collection('users').add({
      data: { openid, family_id, role: 'admin', nickname: nickname || '管理员', joined_at: new Date() }
    })
  }

  return { family_id, invite_code, family_name: family_name.trim() }
}

// 加入家庭
async function joinFamily(openid, { invite_code, nickname }) {
  // 检查是否已有家庭
  const existing = await db.collection('users').where({ openid }).limit(1).get()
  if (existing.data.length > 0 && existing.data[0].family_id) {
    return { error: '你已加入一个家庭，请先退出再加入其他家庭' }
  }

  const familyRes = await db.collection('families')
    .where({ invite_code: invite_code.trim().toUpperCase() })
    .limit(1).get()
  if (familyRes.data.length === 0) {
    return { error: '邀请码无效，请检查后重试' }
  }

  const family = familyRes.data[0]
  const family_id = family._id

  if (existing.data.length > 0) {
    await db.collection('users').doc(existing.data[0]._id).update({
      data: { family_id, role: 'member', nickname: nickname || '成员', joined_at: new Date() }
    })
  } else {
    await db.collection('users').add({
      data: { openid, family_id, role: 'member', nickname: nickname || '成员', joined_at: new Date() }
    })
  }

  return { family_id, family_name: family.name }
}

// 获取家庭成员列表（需 admin）
async function getMembers(openid) {
  const me = await db.collection('users').where({ openid }).limit(1).get()
  if (me.data.length === 0 || !me.data[0].family_id) return { error: '你还未加入家庭' }
  if (me.data[0].role !== 'admin') return { error: '无权限' }

  const family_id = me.data[0].family_id
  const res = await db.collection('users').where({ family_id }).limit(100).get()
  return res.data.map(normalize)
}

// 修改成员角色（需 admin）
async function updateMemberRole(openid, { targetUserId, newRole }) {
  const me = await db.collection('users').where({ openid }).limit(1).get()
  if (me.data.length === 0 || me.data[0].role !== 'admin') return { error: '无权限' }

  const family_id = me.data[0].family_id
  const target = await db.collection('users').doc(targetUserId).get()
  if (!target.data || target.data.family_id !== family_id) return { error: '成员不在同一家庭' }
  if (target.data.openid === openid) return { error: '不能修改自己的角色' }

  if (newRole === 'member' && target.data.role === 'admin') {
    const admins = await db.collection('users').where({ family_id, role: 'admin' }).limit(10).get()
    if (admins.data.length <= 1) return { error: '家庭内至少保留一个管理员' }
  }

  await db.collection('users').doc(targetUserId).update({ data: { role: newRole } })
  return { ok: true }
}

// 踢出成员（需 admin）
async function removeMember(openid, { targetUserId }) {
  const me = await db.collection('users').where({ openid }).limit(1).get()
  if (me.data.length === 0 || me.data[0].role !== 'admin') return { error: '无权限' }

  const family_id = me.data[0].family_id
  const target = await db.collection('users').doc(targetUserId).get()
  if (!target.data || target.data.family_id !== family_id) return { error: '成员不在同一家庭' }
  if (target.data.openid === openid) return { error: '不能踢出自己' }

  await db.collection('users').doc(targetUserId).update({ data: { family_id: null, role: 'member' } })
  return { ok: true }
}

// 退出家庭
async function leaveFamily(openid) {
  const me = await db.collection('users').where({ openid }).limit(1).get()
  if (me.data.length === 0 || !me.data[0].family_id) return { error: '你还未加入家庭' }

  if (me.data[0].role === 'admin') {
    const family_id = me.data[0].family_id
    const admins = await db.collection('users').where({ family_id, role: 'admin' }).limit(10).get()
    if (admins.data.length <= 1) return { error: '你是唯一管理员，请先将管理员权限转让给其他成员' }
  }

  await db.collection('users').doc(me.data[0]._id).update({ data: { family_id: null } })
  return { ok: true }
}

// 刷新邀请码（需 admin）
async function refreshInviteCode(openid) {
  const me = await db.collection('users').where({ openid }).limit(1).get()
  if (me.data.length === 0 || me.data[0].role !== 'admin') return { error: '无权限' }

  const new_code = await genUniqueCode()
  await db.collection('families').doc(me.data[0].family_id).update({ data: { invite_code: new_code } })
  return { invite_code: new_code }
}

exports.main = async (event) => {
  const { action } = event
  const { OPENID } = cloud.getWXContext()

  if (!OPENID) return { error: '无法获取用户身份' }

  switch (action) {
    case 'getProfile':      return await getProfile(OPENID)
    case 'createFamily':    return await createFamily(OPENID, event)
    case 'joinFamily':      return await joinFamily(OPENID, event)
    case 'getMembers':      return await getMembers(OPENID)
    case 'updateMemberRole':return await updateMemberRole(OPENID, event)
    case 'removeMember':    return await removeMember(OPENID, event)
    case 'leaveFamily':     return await leaveFamily(OPENID)
    case 'refreshInviteCode': return await refreshInviteCode(OPENID)
    case 'updateProfile':      return await updateProfile(OPENID, event)
    case 'updateFamilyName':   return await updateFamilyName(OPENID, event)
    default: return { error: 'Unknown action' }
  }
}

async function updateFamilyName(openid, { family_name }) {
  if (!family_name || !family_name.trim()) return { error: '家庭名称不能为空' }
  const me = await db.collection('users').where({ openid }).limit(1).get()
  if (me.data.length === 0 || !me.data[0].family_id) return { error: '你还未加入家庭' }
  if (me.data[0].role !== 'admin') return { error: '无权限' }
  await db.collection('families').doc(me.data[0].family_id).update({ data: { name: family_name.trim() } })
  return { ok: true }
}

async function updateProfile(openid, { nickname, avatar }) {
  if (!nickname || !nickname.trim()) return { error: '昵称不能为空' }
  const me = await db.collection('users').where({ openid }).limit(1).get()
  if (me.data.length === 0) return { error: '用户不存在' }
  const updateData = { nickname: nickname.trim() }
  if (avatar !== undefined) updateData.avatar = avatar
  await db.collection('users').doc(me.data[0]._id).update({ data: updateData })
  return { ok: true }
}
