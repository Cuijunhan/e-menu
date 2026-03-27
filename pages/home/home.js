// pages/home/home.js
const api = require('../../utils/api');

Page({
  data: {
    statusBarHeight: 0,
    banners: []
  },

  onLoad() {
    // 获取系统状态栏高度
    const systemInfo = wx.getSystemInfoSync();
    this.setData({
      statusBarHeight: systemInfo.statusBarHeight
    });

    // 获取轮播图数据
    this.loadBanners();
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 0 });
    }
  },

  // 加载轮播图
  async loadBanners() {
    try {
      const res = await api.getBanners();
      this.setData({
        banners: res.data || []
      });
    } catch (error) {
      console.error('获取轮播图失败:', error);
      // 使用默认图片
      this.setData({
        // banners: [
        //   { id: 1, image: '/images/banner-cooking.png', title: '今天有没有好好吃饭！' },
        //   { id: 2, image: '/images/banner-coffee.png', title: '来杯咖啡提提神' },
        //   { id: 3, image: '/images/banner-cocktail.png', title: '小酌怡情' }
        // ]
        banners: [
          { id: 1, image: '/images/banner-cooking.png', title: ' ' },
          { id: 2, image: '/images/banner-coffee.png', title: ' ' },
          { id: 3, image: '/images/banner-cocktail.png', title: ' ' }
        ]
      });
    }
  },

  // 点菜 → 全部菜品
  goToFood() {
    wx.setStorageSync('preSelectCategory', '');
    wx.switchTab({ url: '/pages/index/index' });
  },

  // 咖啡 → 自动筛选咖啡分类
  goToCoffee() {
    wx.setStorageSync('preSelectCategory', '咖啡');
    wx.switchTab({ url: '/pages/index/index' });
  },

  // 喝酒 → 自动筛选酒水分类
  goToCocktail() {
    wx.setStorageSync('preSelectCategory', '酒');
    wx.switchTab({ url: '/pages/index/index' });
  },

  // 随机推荐页
  goToRandom() {
    wx.navigateTo({ url: '/pages/random/random' });
  },

  // 历史订单页
  goToHistory() {
    wx.navigateTo({ url: '/pages/orders/orders' });
  },

  // 想吃什么预约页
  goToReservation() {
    wx.navigateTo({ url: '/pages/reservation/reservation' });
  },
});
