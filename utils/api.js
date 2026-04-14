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

  // 分类
  getMainCategories: () => call('categories', { action: 'listMain' }),
  getCategories: (mainCategoryId) => call('categories', { action: 'list', mainCategoryId }),

  // 菜品
  getDishes: (categoryId, mainCategoryId) =>
    call('dishes', { action: 'list', categoryId, mainCategoryId }),
  getRandomDishes: (count = 5) => call('dishes', { action: 'random', count }),
  getDish: (id) => call('dishes', { action: 'get', id }),

  // 订单（openid 由云函数从 wx.cloud 上下文自动获取，无需前端传递）
  createOrder: (items) => call('orders', { action: 'create', items }),
  getOrders: () => call('orders', { action: 'list' }),
  deleteOrder: (id) => call('orders', { action: 'delete', id }),

  // 预约
  createReservation: (payload) => call('reservations', { action: 'create', ...payload }),
  getReservations: () => call('reservations', { action: 'list' }),
  updateReservation: (id, payload) =>
    call('reservations', { action: 'update', id, ...payload }),
  deleteReservation: (id) => call('reservations', { action: 'delete', id }),

  // 管理员
  adminAction: (action, data = {}) => call('admin', { action, ...data }),
}
