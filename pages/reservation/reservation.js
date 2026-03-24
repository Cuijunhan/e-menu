// pages/reservation/reservation.js
const api = require('../../utils/api');
const app = getApp();

Page({
  data: {
    dishName: '',
    link: '',
    note: '',
    submitting: false,
    list: [],
  },

  onLoad() {
    this.loadList();
  },

  onShow() {
    this.loadList();
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

  async submit() {
    const { dishName, link, note } = this.data;
    if (!dishName.trim()) {
      wx.showToast({ title: '请输入菜名', icon: 'none' });
      return;
    }
    this.setData({ submitting: true });
    try {
      await api.createReservation({
        user_id: app.globalData.userId,
        dish_name: dishName.trim(),
        link: link.trim(),
        note: note.trim(),
      });
      wx.showToast({ title: '提交成功！', icon: 'success' });
      this.setData({ dishName: '', link: '', note: '' });
      this.loadList();
    } catch (e) {
      wx.showToast({ title: '提交失败', icon: 'error' });
    } finally {
      this.setData({ submitting: false });
    }
  },

  async loadList() {
    try {
      const list = await api.getReservations(app.globalData.userId);
      // 格式化时间
      const fmt = list.map(r => ({
        ...r,
        create_time: r.create_time.replace('T', ' ').substring(0, 16),
      }));
      this.setData({ list: fmt });
    } catch (e) {
      // 加载失败静默处理
    }
  },

  copyLink(e) {
    const link = e.currentTarget.dataset.link;
    wx.setClipboardData({
      data: link,
      success: () => wx.showToast({ title: '链接已复制', icon: 'success' }),
    });
  },
});
