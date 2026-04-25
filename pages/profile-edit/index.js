Page({
  data: {
    nickname: '',
    avatar: '',
    familyName: '',
    isAdmin: false,
    pendingFile: null,
    previewSrc: '',
    showPreview: false,
    saving: false,
  },

  onLoad() {
    this._loadProfile();
  },

  goBack() { wx.navigateBack(); },

  async _loadProfile() {
    try {
      const r = await wx.cloud.callFunction({ name: 'user', data: { action: 'getProfile' } });
      const p = r.result || {};
      this.setData({
        nickname: p.nickname || '',
        avatar: p.avatar || '',
        familyName: p.family_name || '',
        isAdmin: p.role === 'admin',
      });
    } catch (e) {}
  },

  onNicknameInput(e) {
    this.setData({ nickname: e.detail.value });
  },

  onFamilyNameInput(e) {
    this.setData({ familyName: e.detail.value });
  },

  chooseAvatar() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      success: (res) => {
        const path = res.tempFiles[0].tempFilePath;
        const ext = path.split('.').pop();
        this.setData({ showPreview: true, previewSrc: path, pendingFile: { path, ext } });
      },
    });
  },

  cancelPreview() {
    this.setData({ showPreview: false, previewSrc: '', pendingFile: null });
  },

  async confirmAvatar() {
    const { pendingFile } = this.data;
    if (!pendingFile) return;
    this.setData({ showPreview: false });
    wx.showLoading({ title: '上传中...' });
    try {
      const cloudPath = `avatars/${Date.now()}.${pendingFile.ext}`;
      const res = await wx.cloud.uploadFile({ cloudPath, filePath: pendingFile.path });
      this.setData({ avatar: res.fileID, pendingFile: null, previewSrc: '' });
      wx.hideLoading();
    } catch (e) {
      wx.hideLoading();
      wx.showToast({ title: '上传失败', icon: 'error' });
    }
  },

  async save() {
    const { nickname, avatar, familyName, isAdmin } = this.data;
    if (!nickname.trim()) {
      wx.showToast({ title: '昵称不能为空', icon: 'none' });
      return;
    }
    this.setData({ saving: true });
    wx.showLoading({ title: '保存中...' });
    try {
      const tasks = [
        wx.cloud.callFunction({
          name: 'user',
          data: { action: 'updateProfile', nickname: nickname.trim(), avatar },
        }),
      ];
      if (isAdmin && familyName.trim()) {
        tasks.push(
          wx.cloud.callFunction({
            name: 'user',
            data: { action: 'updateFamilyName', family_name: familyName.trim() },
          })
        );
      }
      await Promise.all(tasks);
      wx.hideLoading();
      wx.showToast({ title: '保存成功', icon: 'success' });
      setTimeout(() => wx.navigateBack(), 1200);
    } catch (e) {
      wx.hideLoading();
      wx.showToast({ title: '保存失败', icon: 'error' });
    } finally {
      this.setData({ saving: false });
    }
  },
});
