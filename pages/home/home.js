// pages/home/home.js
const api = require('../../utils/api');

Page({
  data: {
    statusBarHeight: 0,
    banners: []
  },

  onLoad() {
    const systemInfo = wx.getSystemInfoSync();
    this.setData({ statusBarHeight: systemInfo.statusBarHeight });
    this.loadBanners();
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 0 });
    }
  },

  async loadBanners() {
    try {
      const res = await api.getBanners();
      this.setData({ banners: res || [] });
    } catch (error) {
      console.error('获取轮播图失败:', error);
      this.setData({
        banners: [
          { id: '1', image: '/images/banner-cooking.png', title: ' ' },
          { id: '2', image: '/images/banner-coffee.png', title: ' ' },
          { id: '3', image: '/images/banner-cocktail.png', title: ' ' }
        ]
      });
    }
  },

  goToFood() {
    wx.setStorageSync('preSelectMainCategory', '__food__');
    wx.switchTab({ url: '/pages/index/index' });
  },

  goToCoffee() {
    wx.setStorageSync('preSelectMainCategory', '__coffee__');
    wx.switchTab({ url: '/pages/index/index' });
  },

  goToCocktail() {
    wx.setStorageSync('preSelectMainCategory', '__wine__');
    wx.switchTab({ url: '/pages/index/index' });
  },

  goToRandom() {
    wx.navigateTo({ url: '/pages/random/random' });
  },

  goToHistory() {
    wx.navigateTo({ url: '/pages/orders/orders' });
  },

  goToReservation() {
    wx.navigateTo({ url: '/pages/reservation/reservation' });
  },
});
