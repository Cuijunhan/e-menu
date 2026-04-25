const api = require('../../../utils/api');

const EMPTY_FORM = { image: '', title: '', sort_order: '0' };

Page({
  data: {
    banners: [],
    editingId: null,
    form: Object.assign({}, EMPTY_FORM),
    // 上传预览
    showPreview: false,
    previewSrc: '',
    pendingFile: null,
    uploadingForEdit: false,
  },

  onShow() {
    this.loadBanners();
  },

  goBack() { wx.navigateBack(); },

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

  // 选择图片 → 先弹出预览，确认后上传
  chooseImage() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      success: (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath;
        const ext = tempFilePath.split('.').pop();
        this.setData({
          showPreview: true,
          previewSrc: tempFilePath,
          pendingFile: { path: tempFilePath, ext },
        });
      },
    });
  },

  cancelPreview() {
    this.setData({ showPreview: false, previewSrc: '', pendingFile: null });
  },

  async confirmPreview() {
    const { pendingFile } = this.data;
    if (!pendingFile) return;
    this.setData({ showPreview: false });
    wx.showLoading({ title: '上传中...' });
    try {
      const cloudPath = `banners/${Date.now()}.${pendingFile.ext}`;
      const uploadRes = await wx.cloud.uploadFile({ cloudPath, filePath: pendingFile.path });
      this.setData({
        form: Object.assign({}, this.data.form, { image: uploadRes.fileID }),
        pendingFile: null,
        previewSrc: '',
      });
      wx.hideLoading();
      wx.showToast({ title: '上传成功', icon: 'success' });
    } catch (e) {
      wx.hideLoading();
      wx.showToast({ title: '上传失败', icon: 'error' });
    }
  },

  // 编辑模式
  editBanner(e) {
    const banner = e.currentTarget.dataset.banner;
    this.setData({
      editingId: banner.id,
      form: {
        image: banner.image || '',
        title: banner.title || '',
        sort_order: String(banner.sort_order || '0'),
      },
    });
  },

  cancelEdit() {
    this.setData({ editingId: null, form: Object.assign({}, EMPTY_FORM) });
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

  async saveBanner() {
    const { form, editingId } = this.data;
    if (!form.image) {
      wx.showToast({ title: '请选择图片', icon: 'none' });
      return;
    }
    wx.showLoading({ title: '提交中...' });
    try {
      if (editingId) {
        await api.adminAction('updateBanner', {
          id: editingId,
          banner: {
            image: form.image,
            title: form.title || '',
            sort_order: parseInt(form.sort_order) || 0,
          },
        });
        wx.showToast({ title: '更新成功', icon: 'success' });
        this.setData({ editingId: null });
      } else {
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
        wx.showToast({ title: '新增成功', icon: 'success' });
      }
      wx.hideLoading();
      this.setData({ form: Object.assign({}, EMPTY_FORM) });
      this.loadBanners();
    } catch (e) {
      wx.hideLoading();
      wx.showToast({ title: '操作失败', icon: 'error' });
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
