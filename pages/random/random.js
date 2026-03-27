// pages/random/random.js
const api = require('../../utils/api');
const app = getApp();

Page({
  data: {
    dishes: [],
    loading: false,
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
      this.setData({ dishes: this._withCartCount(dishes) });
    } catch (e) {
      wx.showToast({ title: '加载失败', icon: 'error' });
    } finally {
      this.setData({ loading: false });
      this._syncCart();
    }
  },

  _withCartCount(dishes) {
    const cart = app.globalData.cart;
    return dishes.map(d => {
      const item = cart.find(c => c.dish.id === d.id);
      return { ...d, count: item ? item.quantity : 0 };
    });
  },

  _syncCart() {
    this.setData({
      dishes: this._withCartCount(this.data.dishes),
    });
  },

  addToCart(e) {
    const { id, name, price } = e.currentTarget.dataset;
    app.addToCart({ id, name, price });
    this._syncCart();
  },

  decreaseCart(e) {
    const id = e.currentTarget.dataset.id;
    app.removeFromCart(id);
    this._syncCart();
  },

  onRandom() {
    this.loadRandom();
  },

  goToCart() {
    wx.switchTab({ url: '/pages/cart/cart' });
  },
});
