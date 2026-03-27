// pages/profile/profile.js
const app = getApp();

Page({
  data: {
    cartCount: 0,
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 3 });
    }
    this.setData({ cartCount: app.getCartCount() });
  },

  goToOrders() {
    wx.navigateTo({ url: '/pages/orders/orders' });
  },

  goToCart() {
    wx.switchTab({ url: '/pages/cart/cart' });
  },
});
