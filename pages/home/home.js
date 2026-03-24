// pages/home/home.js
Page({
  data: {},

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
});
