// utils/api.js - 统一封装云函数请求
function call(name, data = {}) {
  return new Promise((resolve, reject) => {
    wx.cloud.callFunction({
      name,
      data,
      success: res => resolve(res.result),
      fail: err => {
        wx.showToast({ title: '网络错误', icon: 'error' })
        reject(err)
      },
    })
  })
}

module.exports = {
  // 轮播图
  getBanners: () => call('banners'),

  // 分类（type: 'food' | 'coffee' | 'drink'）
  getCategories: (type) => call('categories', { action: 'list', type }),

  // 菜品（type: 'food' | 'coffee' | 'drink'）
  getDishes: (type, categoryId) => call('dishes', { action: 'list', type, categoryId }),
  getRandomDishes: (count = 5) => call('dishes', { action: 'random', count }),
  getDish: (type, id) => call('dishes', { action: 'get', type, id }),

  // 订单
  createOrder: (items) => call('orders', { action: 'create', items }),
  getOrders: () => call('orders', { action: 'list' }),
  deleteOrder: (id) => call('orders', { action: 'delete', id }),

  // 预约
  createReservation: (payload) => call('reservations', { action: 'create', ...payload }),
  getReservations: () => call('reservations', { action: 'list' }),
  updateReservation: (id, payload) => call('reservations', { action: 'update', id, ...payload }),
  deleteReservation: (id) => call('reservations', { action: 'delete', id }),

  // 管理员（action + data 封装）
  adminAction: (action, data = {}) => call('admin', { action, data }),

  // 用户/家庭
  getUserProfile: () => call('user', { action: 'getProfile' }),
  createFamily: (family_name, nickname) => call('user', { action: 'createFamily', family_name, nickname }),
  joinFamily: (invite_code, nickname) => call('user', { action: 'joinFamily', invite_code, nickname }),
  getMembers: () => call('user', { action: 'getMembers' }),
  updateMemberRole: (targetUserId, newRole) => call('user', { action: 'updateMemberRole', targetUserId, newRole }),
  removeMember: (targetUserId) => call('user', { action: 'removeMember', targetUserId }),
  leaveFamily: () => call('user', { action: 'leaveFamily' }),
  refreshInviteCode: () => call('user', { action: 'refreshInviteCode' }),
}
