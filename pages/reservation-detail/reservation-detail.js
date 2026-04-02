const api = require('../../utils/api');
const app = getApp();

Page({
  data: {
    id: null,
    detail: null,
    dishName: '',
    link: '',
    note: '',
  },

  onLoad(options) {
    this.setData({ id: options.id });
    this.loadDetail();
  },

  async loadDetail() {
    try {
      const list = await api.getReservations(app.globalData.userId);
      const detail = list.find(item => item.id == this.data.id);
      if (detail) {
        this.setData({
          detail: {
            ...detail,
            create_time: detail.create_time.replace('T', ' ').substring(0, 16),
          },
          dishName: detail.dish_name,
          link: detail.link || '',
          note: detail.note || '',
        });
      }
    } catch (e) {
      wx.showToast({ title: '加载失败', icon: 'error' });
    }
  },

  onDishNameInput(e) {
    this.setData({ dishName: e.detail.value });
  },

  onLinkInput(e) {
    this.setData({ link: e.detail.value });
  },

  onNoteInput(e) {
    this.setData({ note: e.detail.value });
  },

  async save() {
    const { id, dishName, link, note } = this.data;
    if (!dishName.trim()) {
      wx.showToast({ title: '请输入菜名', icon: 'none' });
      return;
    }
    try {
      await api.updateReservation(id, {
        user_id: app.globalData.userId,
        dish_name: dishName.trim(),
        link: link.trim(),
        note: note.trim(),
      });
      wx.showToast({ title: '保存成功', icon: 'success' });
      setTimeout(() => wx.navigateBack(), 1500);
    } catch (e) {
      wx.showToast({ title: '保存失败', icon: 'error' });
    }
  },

  deleteItem() {
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条预约吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            await api.deleteReservation(this.data.id);
            wx.showToast({ title: '删除成功', icon: 'success' });
            setTimeout(() => wx.navigateBack(), 1500);
          } catch (e) {
            wx.showToast({ title: '删除失败', icon: 'error' });
          }
        }
      },
    });
  },
});
