// pages/orders/orders.js
const api = require("../../utils/api");
const app = getApp();

Page({
  data: {
    orders: [],
    loading: true,
  },

  onShow() {
    this.loadOrders();
  },

  async loadOrders() {
    this.setData({ loading: true });
    const orders = await api.getOrders(app.globalData.userId);
    this.setData({ orders, loading: false });
  },
});
