const api = require('../../../utils/api');

Page({
  goToDishes() {
    wx.navigateTo({ url: '/pages/admin/dishes/index' });
  },
  goToBanners() {
    wx.navigateTo({ url: '/pages/admin/banners/index' });
  },
  goToOrders() {
    wx.navigateTo({ url: '/pages/admin/orders/index' });
  },
  goToIngredients() {
    wx.navigateTo({ url: '/pages/admin/ingredients/index' });
  },
  goToReservations() {
    wx.navigateTo({ url: '/pages/admin/reservations/index' });
  },
  goToMembers() {
    wx.navigateTo({ url: '/pages/admin/members/index' });
  },
  async initData() {
    wx.showModal({
      title: '确认初始化',
      content: '将写入默认分类和菜品数据（如已存在则跳过），确定继续？',
      success: async (res) => {
        if (!res.confirm) return;
        wx.showLoading({ title: '初始化中...' });
        try {
          const result = await api.adminAction('initData');
          wx.hideLoading();
          if (result && result.error) {
            wx.showToast({ title: result.error, icon: 'error' });
          } else {
            wx.showToast({ title: result.message || '完成', icon: 'success' });
          }
        } catch (e) {
          wx.hideLoading();
          wx.showToast({ title: '初始化失败', icon: 'error' });
        }
      },
    });
  },
});
