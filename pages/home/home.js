// pages/home/home.js
const api = require('../../utils/api');

Page({
  data: {
    dishes: [],
  },

  onLoad() {
    this.loadRecommended();
  },

  async loadRecommended() {
    const dishes = await api.getDishes(null);
    this.setData({ dishes: dishes.slice(0, 3) });
  },

  goToOrder() {
    wx.switchTab({ url: '/pages/index/index' });
  },

  goToOrders() {
    wx.navigateTo({ url: '/pages/orders/orders' });
  },
});
