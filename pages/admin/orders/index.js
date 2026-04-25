const api = require('../../../utils/api');

Page({
  data: {
    orders: [],
    showIngredients: false,
    ingredientLoading: false,
    ingredientOrder: null,
    ingredientItems: [],
    ingredientSummary: [],
  },

  onShow() {
    this.loadOrders();
  },

  goBack() { wx.navigateBack(); },

  async loadOrders() {
    wx.showLoading({ title: '加载中...' });
    try {
      const raw = await api.adminAction('listAllOrders');
      const orders = (raw || []).map((o, i) => ({
        ...o,
        display_id: String(i + 1),
        user_initial: o.user_nickname ? o.user_nickname.slice(0, 1) : '?',
      }));
      this.setData({ orders });
    } catch (e) {
      wx.showToast({ title: '加载失败', icon: 'error' });
    } finally {
      wx.hideLoading();
    }
  },

  async toggleStatus(e) {
    const { id, status } = e.currentTarget.dataset;
    const newStatus = status === '已完成' ? '已下单' : '已完成';
    try {
      await api.adminAction('updateOrderStatus', { id, status: newStatus });
      this.loadOrders();
    } catch (e) {
      wx.showToast({ title: '操作失败', icon: 'error' });
    }
  },

  async openIngredients(e) {
    const { id, displayId } = e.currentTarget.dataset;
    this.setData({ showIngredients: true, ingredientLoading: true, ingredientOrder: displayId, ingredientItems: [], ingredientSummary: [] });
    try {
      const result = await api.adminAction('getOrderIngredients', { id });
      this.setData({ ingredientItems: result.items || [], ingredientSummary: result.summary || [], ingredientLoading: false });
    } catch (err) {
      this.setData({ ingredientLoading: false });
      wx.showToast({ title: '加载失败', icon: 'error' });
    }
  },

  closeIngredients() {
    this.setData({ showIngredients: false, ingredientItems: [], ingredientOrder: null });
  },

  deleteOrder(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '确认删除',
      content: '删除后无法恢复，确定删除？',
      success: async (res) => {
        if (!res.confirm) return;
        try {
          await api.adminAction('deleteOrder', { id });
          wx.showToast({ title: '已删除', icon: 'success' });
          this.loadOrders();
        } catch (e) {
          wx.showToast({ title: '删除失败', icon: 'error' });
        }
      },
    });
  },
});
