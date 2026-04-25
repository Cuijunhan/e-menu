const app = getApp();

Page({
  data: {
    cartCount: 0,
    nickname: '',
    avatar: '',
    familyName: '',
    role: '',
    isAdmin: false,
    inviteCode: '',
    loading: true,
  },

  async onLoad() {
    await this._loadProfile()
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 3 });
    }
    this.setData({ cartCount: app.getCartCount() });
    this._loadProfile();
  },

  async _loadProfile() {
    this.setData({ loading: true })
    try {
      const r = await wx.cloud.callFunction({ name: 'user', data: { action: 'getProfile' } })
      const p = r.result || {}
      this.setData({
        nickname: p.nickname || '未命名',
        avatar: p.avatar || '',
        familyName: p.family_name || '',
        role: p.role || '',
        isAdmin: p.role === 'admin',
        inviteCode: p.invite_code || '',
        loading: false,
      })
    } catch (e) {
      this.setData({ loading: false })
    }
  },

  copyInviteCode() {
    wx.setClipboardData({
      data: this.data.inviteCode,
      success: () => wx.showToast({ title: '已复制邀请码', icon: 'success' }),
    })
  },

  goToEditProfile() {
    wx.navigateTo({ url: '/pages/profile-edit/index' });
  },

  goToOrders() {
    wx.navigateTo({ url: '/pages/orders/orders' });
  },

  goToCart() {
    wx.switchTab({ url: '/pages/cart/cart' });
  },

  goToAdmin() {
    wx.navigateTo({ url: '/pages/admin/index/index' });
  },

  leaveFamily() {
    wx.showModal({
      title: '退出家庭',
      content: this.data.isAdmin
        ? '你是管理员，退出前请确保还有其他管理员，否则无法退出。确定退出？'
        : '确定退出当前家庭？',
      confirmColor: '#e74c3c',
      success: async (res) => {
        if (!res.confirm) return
        wx.showLoading({ title: '退出中...' })
        try {
          const r = await wx.cloud.callFunction({ name: 'user', data: { action: 'leaveFamily' } })
          wx.hideLoading()
          if (r.result && r.result.ok) {
            app.globalData.familyId = null
            app.globalData.role = null
            app.globalData.isAdmin = false
            wx.reLaunch({ url: '/pages/onboarding/index' })
          } else {
            wx.showToast({ title: r.result.error || '退出失败', icon: 'error' })
          }
        } catch (e) {
          wx.hideLoading()
          wx.showToast({ title: '退出失败', icon: 'error' })
        }
      },
    })
  },
});
