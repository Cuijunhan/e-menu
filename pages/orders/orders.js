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
    try {
      const orders = await api.getOrders();
      const formatted = orders.map(o => ({
        ...o,
        create_time: o.create_time ? o.create_time.replace('T', ' ').substring(0, 16) : '',
        expanded: false,
      }));
      this.setData({ orders: formatted, loading: false });
    } catch (e) {
      this.setData({ loading: false });
    }
  },

  goBack() {
    wx.navigateBack();
  },

  toggleOrder(e) {
    const id = e.currentTarget.dataset.id;
    const orders = this.data.orders.map(o => ({
      ...o,
      expanded: o.id === id ? !o.expanded : o.expanded,
    }));
    this.setData({ orders });
  },

  increaseQty(e) {
    const { orderId, dishId } = e.currentTarget.dataset;
    const orders = this.data.orders.map(o => {
      if (o.id === orderId) {
        const newItems = o.items.map(item =>
          item.dish_id === dishId ? { ...item, quantity: item.quantity + 1 } : item
        );
        const newTotal = newItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
        return { ...o, items: newItems, total_price: parseFloat(newTotal.toFixed(2)) };
      }
      return o;
    });
    this.setData({ orders });
  },

  decreaseQty(e) {
    const { orderId, dishId } = e.currentTarget.dataset;
    const orders = this.data.orders.map(o => {
      if (o.id === orderId) {
        const newItems = o.items
          .map(item => item.dish_id === dishId ? { ...item, quantity: item.quantity - 1 } : item)
          .filter(item => item.quantity > 0);
        const newTotal = newItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
        return { ...o, items: newItems, total_price: parseFloat(newTotal.toFixed(2)) };
      }
      return o;
    });
    this.setData({ orders });
  },

  async reorder(e) {
    const id = e.currentTarget.dataset.id;
    const order = this.data.orders.find(o => o.id === id);
    if (!order || !order.items || order.items.length === 0) {
      wx.showToast({ title: '订单无菜品', icon: 'error' });
      return;
    }
    try {
      await api.deleteOrder(id);
      await api.createOrder(order.items.map(item => ({
        dish_id: item.dish_id,
        dish_name: item.dish_name,
        quantity: item.quantity,
        price: item.price,
      })));
      wx.showToast({ title: '下单成功', icon: 'success' });
      setTimeout(() => this.loadOrders(), 1500);
    } catch (e) {
      wx.showToast({ title: '下单失败', icon: 'error' });
    }
  },

  addToCart(e) {
    const id = e.currentTarget.dataset.id;
    const order = this.data.orders.find(o => o.id === id);
    if (!order) return;
    order.items.forEach(item => {
      for (let i = 0; i < item.quantity; i++) {
        app.addToCart({ id: item.dish_id, name: item.dish_name, price: item.price });
      }
    });
    wx.showToast({ title: '已加入购物车', icon: 'success' });
    setTimeout(() => wx.switchTab({ url: '/pages/cart/cart' }), 1500);
  },

  async cancelOrder(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '确认取消',
      content: '确定要取消这个订单吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            await api.deleteOrder(id);
            wx.showToast({ title: '订单已取消', icon: 'success' });
            this.loadOrders();
          } catch (e) {
            wx.showToast({ title: '取消失败', icon: 'error' });
          }
        }
      },
    });
  },

  async deleteOrder(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个订单吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            await api.deleteOrder(id);
            wx.showToast({ title: '订单已删除', icon: 'success' });
            this.loadOrders();
          } catch (e) {
            wx.showToast({ title: '删除失败', icon: 'error' });
          }
        }
      },
    });
  },
});
