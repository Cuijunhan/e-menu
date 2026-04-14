// app.js
// ⚠️ 将 YOUR_ENV_ID 替换为你的云开发环境 ID（在微信开发者工具 → 云开发控制台中查看）
const ENV_ID = 'YOUR_ENV_ID'

App({
  globalData: {
    openid: '',
    isAdmin: false,
    cart: [],
  },

  onLaunch() {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上基础库')
      return
    }
    wx.cloud.init({
      env: ENV_ID,
      traceUser: true,
    })
    this._fetchOpenid()
  },

  _fetchOpenid() {
    wx.cloud.callFunction({
      name: 'admin',
      data: { action: 'getOpenid' },
      success: res => {
        const openid = res.result && res.result.openid
        if (openid) {
          this.globalData.openid = openid
          wx.setStorageSync('openid', openid)
        }
      },
      fail: err => {
        console.error('获取 openid 失败', err)
      },
    })
  },

  addToCart(dish) {
    const cart = this.globalData.cart
    const existing = cart.find(item => item.dish.id === dish.id)
    if (existing) {
      existing.quantity += 1
    } else {
      cart.push({ dish, quantity: 1 })
    }
  },

  removeFromCart(dishId) {
    const cart = this.globalData.cart
    const idx = cart.findIndex(item => item.dish.id === dishId)
    if (idx === -1) return
    if (cart[idx].quantity > 1) {
      cart[idx].quantity -= 1
    } else {
      cart.splice(idx, 1)
    }
  },

  getCartCount() {
    return this.globalData.cart.reduce((sum, item) => sum + item.quantity, 0)
  },

  getCartTotal() {
    return this.globalData.cart
      .reduce((sum, item) => sum + item.dish.price * item.quantity, 0)
      .toFixed(2)
  },

  clearCart() {
    this.globalData.cart = []
  },
})
