const api = require('../../../utils/api');

const UNITS = ['g', 'kg', 'ml', 'L', '个', '根', '片', '块', '勺', '适量'];

Page({
  data: {
    ingredients: [],
    form: { name: '', unit: 'g' },
    unitOptions: UNITS,
    unitIndex: 0,
  },

  onShow() { this.loadIngredients(); },

  goBack() { wx.navigateBack(); },

  async loadIngredients() {
    wx.showLoading({ title: '加载中...' });
    try {
      const list = await api.adminAction('listIngredients');
      this.setData({ ingredients: list || [] });
    } catch (e) {
      wx.showToast({ title: '加载失败', icon: 'error' });
    } finally {
      wx.hideLoading();
    }
  },

  onNameInput(e) {
    this.setData({ form: Object.assign({}, this.data.form, { name: e.detail.value }) });
  },

  onUnitChange(e) {
    const idx = parseInt(e.detail.value);
    this.setData({ unitIndex: idx, form: Object.assign({}, this.data.form, { unit: UNITS[idx] }) });
  },

  async addIngredient() {
    const { form } = this.data;
    if (!form.name.trim()) { wx.showToast({ title: '请输入食材名称', icon: 'none' }); return; }
    wx.showLoading({ title: '添加中...' });
    try {
      const res = await api.adminAction('createIngredient', { name: form.name.trim(), unit: form.unit });
      if (res && res.error) {
        wx.showToast({ title: res.error, icon: 'none' });
      } else {
        wx.showToast({ title: '添加成功', icon: 'success' });
        this.setData({ form: { name: '', unit: UNITS[this.data.unitIndex] } });
        this.loadIngredients();
      }
    } catch (e) {
      wx.showToast({ title: '添加失败', icon: 'error' });
    } finally {
      wx.hideLoading();
    }
  },

  deleteIngredient(e) {
    const { id, name } = e.currentTarget.dataset;
    wx.showModal({
      title: '确认删除',
      content: `删除「${name}」？已使用此食材的菜品不受影响。`,
      success: async (res) => {
        if (!res.confirm) return;
        try {
          await api.adminAction('deleteIngredient', { id });
          wx.showToast({ title: '已删除', icon: 'success' });
          this.loadIngredients();
        } catch (e) {
          wx.showToast({ title: '删除失败', icon: 'error' });
        }
      },
    });
  },
});
