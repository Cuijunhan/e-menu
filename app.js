// app.js
const ENV_ID = 'cloud1-6g24anub992426c4'

App({
  globalData: {
    openid: '',
    familyId: '',
    familyName: '',
    role: '',       // 'admin' | 'member'
    isAdmin: false,
    nickname: '',
    cart: [],
  },

  onLaunch() {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上基础库')
      return
    }
    wx.cloud.init({ env: ENV_ID, traceUser: true })
    this._initUser()
  },

  async _initUser() {
    try {
      // 获取 openid
      const openidRes = await wx.cloud.callFunction({
        name: 'user',
        data: { action: 'getProfile' },
      })
      const profile = openidRes.result

      if (!profile) {
        // 新用户，无记录 → 跳引导页
        wx.reLaunch({ url: '/pages/onboarding/index' })
        return
      }

      if (!profile.family_id) {
        // 有用户记录但还未加入家庭 → 跳引导页
        wx.reLaunch({ url: '/pages/onboarding/index' })
        return
      }

      // 正常用户，写入全局
      this.globalData.openid = profile.openid || ''
      this.globalData.familyId = profile.family_id
      this.globalData.familyName = profile.family ? profile.family.name : ''
      this.globalData.role = profile.role
      this.globalData.isAdmin = profile.role === 'admin'
      this.globalData.nickname = profile.nickname || ''

    } catch (e) {
      console.error('初始化用户失败', e)
      // 网络失败时不强制跳转，允许继续使用（本地调试场景）
    }
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
