// pages/cart/cart.js
const api = require("../../utils/api");
const app = getApp();

Page({
  data: {
    cart: [],
    cartTotal: "0.00",
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 2 });
    }
    this.refreshCart();
  },

  refreshCart() {
    this.setData({
      cart: app.globalData.cart,
      cartTotal: app.getCartTotal(),
    });
  },

  onAdd(e) {
    const dish = e.currentTarget.dataset.dish;
    app.addToCart(dish);
    this.refreshCart();
  },

  onRemove(e) {
    const dish = e.currentTarget.dataset.dish;
    app.removeFromCart(dish.id);
    this.refreshCart();
  },

  async onSubmit() {
    if (app.getCartCount() === 0) {
      wx.showToast({ title: "购物车是空的", icon: "none" });
      return;
    }

    const items = app.globalData.cart.map(item => ({
      dish_id: item.dish.id,
      quantity: item.quantity,
      price: item.dish.price,
    }));

    wx.showLoading({ title: "提交中..." });
    try {
      await api.createOrder({ user_id: app.globalData.userId, items });
      app.clearCart();
      wx.hideLoading();
      wx.showToast({ title: "下单成功！", icon: "success" });
      setTimeout(() => {
        wx.navigateTo({ url: "/pages/orders/orders" });
      }, 1200);
    } catch (e) {
      wx.hideLoading();
    }
  },
});
