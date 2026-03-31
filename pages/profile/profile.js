// pages/profile/profile.js
const app = getApp();

Page({
  data: {
    cartCount: 0,
    balance: 0,
    showToast: false,
    toastMsg: '',
    avatarUrl: '',
    nickName: '家庭用户',
    hasAuth: false,
  },

  onLoad() {
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo && userInfo.avatarUrl) {
      this.setData({
        avatarUrl: userInfo.avatarUrl,
        nickName: userInfo.nickName || '家庭用户',
        hasAuth: true
      });
    }
  },

  onChooseAvatar(e) {
    const { avatarUrl } = e.detail;
    this.setData({ avatarUrl, hasAuth: true });
    const userInfo = wx.getStorageSync('userInfo') || {};
    userInfo.avatarUrl = avatarUrl;
    wx.setStorageSync('userInfo', userInfo);
  },

  onNicknameBlur(e) {
    const nickName = e.detail.value;
    if (nickName) {
      this.setData({ nickName });
      const userInfo = wx.getStorageSync('userInfo') || {};
      userInfo.nickName = nickName;
      wx.setStorageSync('userInfo', userInfo);
    }
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 3 });
    }
    this.setData({
      cartCount: app.getCartCount(),
      balance: wx.getStorageSync('userBalance') || 0
    });
  },

  onCouponTap() {
    this.showToast('尚未开放');
  },

  onRecharge() {
    const newBalance = this.data.balance + 1000000;
    wx.setStorageSync('userBalance', newBalance);
    this.setData({ balance: newBalance });
    this.showToast('充值成功 +¥1,000,000');
  },

  showToast(msg) {
    this.setData({ showToast: true, toastMsg: msg });
    setTimeout(() => {
      this.setData({ showToast: false });
    }, 2000);
  },

  goToOrders() {
    wx.navigateTo({ url: '/pages/orders/orders' });
  },

  goToCart() {
    wx.switchTab({ url: '/pages/cart/cart' });
  },
});
