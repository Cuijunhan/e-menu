const api = require('../../../utils/api');

const TYPE_OPTIONS = [
  { key: 'food',   label: '饭菜' },
  { key: 'coffee', label: '咖啡' },
  { key: 'drink',  label: '酒水' },
];

const UNITS = ['g', 'kg', 'ml', 'L', '个', '根', '片', '块', '勺', '适量'];

const EMPTY_FORM = {
  name: '', price: '', description: '', category_id: '',
  image: '', ingredient_list: [], instructions: '', notes: '',
};

Page({
  data: {
    typeOptions: TYPE_OPTIONS,
    typeIndex: 0,
    activeType: 'food',
    dishes: [],
    categories: [],
    categoryNames: [],
    categoryIndex: 0,
    editingId: null,
    form: Object.assign({}, EMPTY_FORM, { ingredient_list: [] }),

    // 食材选择器
    showIngPicker: false,
    allIngredients: [],
    ingSearch: '',
    ingStep: 'list',          // 'list' | 'amount' | 'new'
    ingPending: null,         // { id, name, unit } 待确认的食材
    ingAmount: '',
    ingUnitOptions: UNITS,
    ingUnitIndex: 0,
    newIngName: '',
    newIngUnit: 'g',
    newIngUnitIndex: 0,
  },

  onShow() {
    this._loadAll(this.data.activeType);
  },

  goBack() { wx.navigateBack(); },

  onTypeChange(e) {
    const idx = parseInt(e.detail.value);
    const type = TYPE_OPTIONS[idx].key;
    this.setData({ typeIndex: idx, activeType: type, editingId: null,
      form: Object.assign({}, EMPTY_FORM, { ingredient_list: [] }), categoryIndex: 0 });
    this._loadAll(type);
  },

  async _loadAll(type) {
    await Promise.all([this._loadCategories(type), this._loadDishes(type)]);
  },

  async _loadCategories(type) {
    try {
      const cats = await api.adminAction('listCategories', { type });
      if (!Array.isArray(cats)) { this.setData({ categories: [], categoryNames: [] }); return; }
      this.setData({ categories: cats, categoryNames: cats.map(c => c.name) });
    } catch (e) {}
  },

  async _loadDishes(type) {
    try {
      const dishes = await api.adminAction('listDishes', { type });
      const cats = this.data.categories;
      const enriched = (Array.isArray(dishes) ? dishes : []).map(d => {
        const cat = cats.find(c => c.id === d.category_id);
        return Object.assign({}, d, { category_name: cat ? cat.name : '' });
      });
      this.setData({ dishes: enriched });
    } catch (e) {}
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ form: Object.assign({}, this.data.form, { [field]: e.detail.value }) });
  },

  onCategoryChange(e) {
    const idx = parseInt(e.detail.value);
    const cat = this.data.categories[idx];
    this.setData({
      categoryIndex: idx,
      form: Object.assign({}, this.data.form, { category_id: cat ? cat.id : '' }),
    });
  },

  async uploadImage() {
    wx.chooseMedia({
      count: 1, mediaType: ['image'],
      success: async (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath;
        wx.showLoading({ title: '上传中...' });
        try {
          const ext = tempFilePath.split('.').pop();
          const cloudPath = `dishes/${Date.now()}.${ext}`;
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

  editDish(e) {
    const dish = e.currentTarget.dataset.dish;
    const idx = this.data.categories.findIndex(c => c.id === dish.category_id);
    this.setData({
      editingId: dish.id,
      categoryIndex: idx >= 0 ? idx : 0,
      form: {
        name: dish.name || '',
        price: String(dish.price || ''),
        description: dish.description || '',
        category_id: dish.category_id || '',
        image: dish.image || '',
        ingredient_list: dish.ingredient_list || [],
        instructions: dish.instructions || '',
        notes: dish.notes || '',
      },
    });
  },

  cancelEdit() {
    this.setData({
      editingId: null, categoryIndex: 0,
      form: Object.assign({}, EMPTY_FORM, { ingredient_list: [] }),
    });
  },

  async submitDish() {
    const { form, editingId, activeType } = this.data;
    if (!form.name.trim()) { wx.showToast({ title: '请输入菜名', icon: 'none' }); return; }
    if (!form.price || isNaN(parseFloat(form.price))) { wx.showToast({ title: '请输入有效价格', icon: 'none' }); return; }
    if (!form.category_id) { wx.showToast({ title: '请选择分类', icon: 'none' }); return; }

    const dish = {
      name: form.name.trim(),
      price: parseFloat(form.price),
      description: form.description.trim(),
      category_id: form.category_id,
      image: form.image || '',
      ingredient_list: form.ingredient_list || [],
      instructions: form.instructions.trim(),
      notes: form.notes.trim(),
    };
    wx.showLoading({ title: '提交中...' });
    try {
      if (editingId) {
        await api.adminAction('updateDish', { type: activeType, id: editingId, dish });
        wx.showToast({ title: '修改成功', icon: 'success' });
      } else {
        await api.adminAction('createDish', { type: activeType, dish });
        wx.showToast({ title: '新增成功', icon: 'success' });
      }
      wx.hideLoading();
      this.cancelEdit();
      await this._loadDishes(activeType);
    } catch (e) {
      wx.hideLoading();
      wx.showToast({ title: '操作失败', icon: 'error' });
    }
  },

  deleteDish(e) {
    const { id } = e.currentTarget.dataset;
    const { activeType } = this.data;
    wx.showModal({
      title: '确认删除', content: '确定要删除这个菜品吗？',
      success: async (res) => {
        if (!res.confirm) return;
        try {
          await api.adminAction('deleteDish', { type: activeType, id });
          wx.showToast({ title: '删除成功', icon: 'success' });
          await this._loadDishes(activeType);
        } catch (e) {
          wx.showToast({ title: '删除失败', icon: 'error' });
        }
      },
    });
  },

  // ── 食材选择器 ─────────────────────────────────────
  async openIngPicker() {
    wx.showLoading({ title: '加载食材...' });
    try {
      const list = await api.adminAction('listIngredients');
      this.setData({
        showIngPicker: true,
        allIngredients: list || [],
        ingSearch: '',
        ingStep: 'list',
        ingPending: null,
        ingAmount: '',
        ingUnitIndex: 0,
        newIngName: '',
        newIngUnit: UNITS[0],
        newIngUnitIndex: 0,
      });
    } catch (e) {
      wx.showToast({ title: '加载失败', icon: 'error' });
    } finally {
      wx.hideLoading();
    }
  },

  closeIngPicker() {
    this.setData({ showIngPicker: false });
  },

  onIngSearch(e) {
    this.setData({ ingSearch: e.detail.value });
  },

  selectIng(e) {
    const ing = e.currentTarget.dataset.ing;
    const alreadyAdded = this.data.form.ingredient_list.some(i => i.id === ing.id);
    if (alreadyAdded) {
      wx.showToast({ title: '已添加该食材', icon: 'none' });
      return;
    }
    const unitIdx = UNITS.indexOf(ing.unit);
    this.setData({
      ingStep: 'amount',
      ingPending: ing,
      ingAmount: '',
      ingUnitIndex: unitIdx >= 0 ? unitIdx : 0,
    });
  },

  onIngAmountInput(e) {
    this.setData({ ingAmount: e.detail.value });
  },

  onIngUnitChange(e) {
    this.setData({ ingUnitIndex: parseInt(e.detail.value) });
  },

  confirmAddIng() {
    const { ingPending, ingAmount, ingUnitIndex, ingUnitOptions } = this.data;
    if (!ingAmount || isNaN(parseFloat(ingAmount))) {
      wx.showToast({ title: '请输入用量', icon: 'none' });
      return;
    }
    const newList = [...this.data.form.ingredient_list, {
      id: ingPending.id,
      name: ingPending.name,
      amount: ingAmount,
      unit: ingUnitOptions[ingUnitIndex],
    }];
    this.setData({
      form: Object.assign({}, this.data.form, { ingredient_list: newList }),
      showIngPicker: false,
    });
  },

  backToList() {
    this.setData({ ingStep: 'list', ingPending: null, ingAmount: '' });
  },

  showNewIngForm() {
    this.setData({ ingStep: 'new', newIngName: '', newIngUnit: UNITS[0], newIngUnitIndex: 0 });
  },

  onNewIngNameInput(e) {
    this.setData({ newIngName: e.detail.value });
  },

  onNewIngUnitChange(e) {
    const idx = parseInt(e.detail.value);
    this.setData({ newIngUnitIndex: idx, newIngUnit: UNITS[idx] });
  },

  async createAndAddIng() {
    const { newIngName, newIngUnit } = this.data;
    if (!newIngName.trim()) { wx.showToast({ title: '请输入食材名称', icon: 'none' }); return; }
    wx.showLoading({ title: '创建中...' });
    try {
      const res = await api.adminAction('createIngredient', { name: newIngName.trim(), unit: newIngUnit });
      wx.hideLoading();
      const unitIdx = UNITS.indexOf(newIngUnit);
      this.setData({
        ingStep: 'amount',
        ingPending: { id: res.id, name: newIngName.trim(), unit: newIngUnit },
        ingAmount: '',
        ingUnitIndex: unitIdx >= 0 ? unitIdx : 0,
      });
    } catch (e) {
      wx.hideLoading();
      wx.showToast({ title: '创建失败', icon: 'error' });
    }
  },

  removeIng(e) {
    const index = e.currentTarget.dataset.index;
    const newList = this.data.form.ingredient_list.filter((_, i) => i !== index);
    this.setData({ form: Object.assign({}, this.data.form, { ingredient_list: newList }) });
  },

  // ── 分类管理 ────────────────────────────────────
  async addCategory() {
    const { activeType } = this.data;
    wx.showModal({
      title: '新增分类', editable: true, placeholderText: '分类名称',
      success: async (res) => {
        if (!res.confirm || !res.content.trim()) return;
        wx.showLoading({ title: '添加中...' });
        try {
          await api.adminAction('createCategory', { type: activeType, name: res.content.trim() });
          wx.hideLoading();
          wx.showToast({ title: '添加成功', icon: 'success' });
          await this._loadCategories(activeType);
        } catch (e) {
          wx.hideLoading();
          wx.showToast({ title: '添加失败', icon: 'error' });
        }
      },
    });
  },

  deleteCategory(e) {
    const { id, name } = e.currentTarget.dataset;
    const { activeType } = this.data;
    wx.showModal({
      title: '删除分类', content: `确定删除分类「${name}」？`,
      success: async (res) => {
        if (!res.confirm) return;
        try {
          await api.adminAction('deleteCategory', { type: activeType, id });
          wx.showToast({ title: '已删除', icon: 'success' });
          await this._loadCategories(activeType);
        } catch (e) {
          wx.showToast({ title: '删除失败', icon: 'error' });
        }
      },
    });
  },
});
