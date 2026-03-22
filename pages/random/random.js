// pages/random/random.js
const api = require('../../utils/api');
const app = getApp();

Page({
  data: {
    dishes: [],       // 当前随机菜单（带 cartQty 字段）
    loading: false,
    cartCount: 0,
    cartTotal: '0.00',
  },

  onLoad() {
    this.loadRandom();
  },

  onShow() {
    this._syncCart();
  },

  async loadRandom() {
    this.setData({ loading: true });
    try {
      const dishes = await api.getRandomDishes(5);
      // 补充每道菜在购物车中的数量
      this.setData({ dishes: this._withCartQty(dishes) });
    } catch (e) {
      wx.showToast({ title: '加载失败', icon: 'error' });
    } finally {
      this.setData({ loading: false });
      this._syncCart();
    }
  },

  // 为菜品列表注入购物车数量
  _withCartQty(dishes) {
    const cart = app.globalData.cart;
    return dishes.map(d => {
      const item = cart.find(c => c.dish.id === d.id);
      return { ...d, cartQty: item ? item.quantity : 0 };
    });
  },

  // 同步购物车汇总数据到页面
  _syncCart() {
    this.setData({
      cartCount: app.getCartCount(),
      cartTotal: app.getCartTotal(),
      dishes: this._withCartQty(this.data.dishes),
    });
  },

  onAdd(e) {
    const dish = e.currentTarget.dataset.dish;
    app.addToCart(dish);
    this._syncCart();
  },

  onRemove(e) {
    const dishId = e.currentTarget.dataset.id;
    app.removeFromCart(dishId);
    this._syncCart();
  },

  onRandom() {
    this.loadRandom();
  },

  goToCart() {
    wx.switchTab({ url: '/pages/cart/cart' });
  },
});
