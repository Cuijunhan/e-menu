const api = require('../../../utils/api');

Page({
  data: {
    dishes: [],
    editingId: null,
    form: { name: '', price: '', description: '', category_id: '', image: '' },
  },

  onShow() {
    this.loadDishes();
  },

  async loadDishes() {
    try {
      const dishes = await api.adminAction('listDishes');
      this.setData({ dishes: dishes || [] });
    } catch (e) {
      wx.showToast({ title: '加载失败', icon: 'error' });
    }
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field;
    const form = Object.assign({}, this.data.form, { [field]: e.detail.value });
    this.setData({ form });
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
          const cloudPath = `dishes/${Date.now()}.${ext}`;
          const uploadRes = await wx.cloud.uploadFile({ cloudPath, filePath: tempFilePath });
          const form = Object.assign({}, this.data.form, { image: uploadRes.fileID });
          this.setData({ form });
          wx.hideLoading();
          wx.showToast({ title: '上传成功', icon: 'success' });
        } catch (e) {
          wx.hideLoading();
          wx.showToast({ title: '上传失败', icon: 'error' });
        }
      },
    });
  },

  editDish(e) {
    const dish = e.currentTarget.dataset.dish;
    this.setData({
      editingId: dish.id,
      form: {
        name: dish.name,
        price: String(dish.price),
        description: dish.description || '',
        category_id: dish.category_id || '',
        image: dish.image || '',
      },
    });
  },

  cancelEdit() {
    this.setData({
      editingId: null,
      form: { name: '', price: '', description: '', category_id: '', image: '' },
    });
  },

  async submitDish() {
    const { form, editingId } = this.data;
    if (!form.name.trim()) {
      wx.showToast({ title: '请输入菜名', icon: 'none' });
      return;
    }
    if (!form.price || isNaN(parseFloat(form.price))) {
      wx.showToast({ title: '请输入有效价格', icon: 'none' });
      return;
    }
    const dish = {
      name: form.name.trim(),
      price: parseFloat(form.price),
      description: form.description.trim(),
      category_id: form.category_id.trim(),
      image: form.image || '',
      ingredients: '',
      instructions: '',
    };
    wx.showLoading({ title: '提交中...' });
    try {
      if (editingId) {
        await api.adminAction('updateDish', { id: editingId, dish });
        wx.showToast({ title: '修改成功', icon: 'success' });
      } else {
        await api.adminAction('createDish', { dish });
        wx.showToast({ title: '新增成功', icon: 'success' });
      }
      wx.hideLoading();
      this.cancelEdit();
      this.loadDishes();
    } catch (e) {
      wx.hideLoading();
      wx.showToast({ title: '操作失败', icon: 'error' });
    }
  },

  deleteDish(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个菜品吗？',
      success: async (res) => {
        if (!res.confirm) return;
        try {
          await api.adminAction('deleteDish', { id });
          wx.showToast({ title: '删除成功', icon: 'success' });
          this.loadDishes();
        } catch (e) {
          wx.showToast({ title: '删除失败', icon: 'error' });
        }
      },
    });
  },
});
