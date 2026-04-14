const api = require('../../../utils/api');

Page({
  data: {
    banners: [],
    form: { image: '', title: '', sort_order: '0' },
  },

  onShow() {
    this.loadBanners();
  },

  async loadBanners() {
    try {
      const banners = await api.adminAction('listBanners');
      this.setData({ banners: banners || [] });
    } catch (e) {
      wx.showToast({ title: '加载失败', icon: 'error' });
    }
  },

  onTitleInput(e) {
    this.setData({ form: Object.assign({}, this.data.form, { title: e.detail.value }) });
  },

  onSortInput(e) {
    this.setData({ form: Object.assign({}, this.data.form, { sort_order: e.detail.value }) });
  },

  async uploadImage() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      success: async (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath;
        wx.showLoading({ title: '上传中...' });
        try {
          const ext = tempFilePath.split('.').pop();
          const cloudPath = `banners/${Date.now()}.${ext}`;
          const uploadRes = await wx.cloud.uploadFile({ cloudPath, filePath: tempFilePath });
          this.setData({ form: Object.assign({}, this.data.form, { image: uploadRes.fileID }) });
          wx.hideLoading();
          wx.showToast({ title: '上传成功', icon: 'success' });
        } catch (e) {
          wx.hideLoading();
          wx.showToast({ title: '上传失败', icon: 'error' });
        }
      },
    });
  },

  async toggleBanner(e) {
    const { id, active } = e.currentTarget.dataset;
    try {
      await api.adminAction('updateBanner', { id, banner: { is_active: !active } });
      this.loadBanners();
    } catch (e) {
      wx.showToast({ title: '操作失败', icon: 'error' });
    }
  },

  async addBanner() {
    const { form } = this.data;
    if (!form.image) {
      wx.showToast({ title: '请选择图片', icon: 'none' });
      return;
    }
    wx.showLoading({ title: '提交中...' });
    try {
      await api.adminAction('createBanner', {
        banner: {
          image: form.image,
          title: form.title || '',
          link: '',
          sort_order: parseInt(form.sort_order) || 0,
          is_active: true,
          is_default: false,
        },
      });
      wx.hideLoading();
      wx.showToast({ title: '新增成功', icon: 'success' });
      this.setData({ form: { image: '', title: '', sort_order: '0' } });
      this.loadBanners();
    } catch (e) {
      wx.hideLoading();
      wx.showToast({ title: '新增失败', icon: 'error' });
    }
  },

  deleteBanner(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这张轮播图吗？',
      success: async (res) => {
        if (!res.confirm) return;
        try {
          await api.adminAction('deleteBanner', { id });
          wx.showToast({ title: '删除成功', icon: 'success' });
          this.loadBanners();
        } catch (e) {
          wx.showToast({ title: '删除失败', icon: 'error' });
        }
      },
    });
  },
});
