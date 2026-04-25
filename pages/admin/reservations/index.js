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
    reservations: [],
    showForm: false,
    processingId: null,

    // 表单基础
    typeOptions: TYPE_OPTIONS,
    typeIndex: 0,
    activeType: 'food',
    categories: [],
    categoryNames: [],
    categoryIndex: 0,
    form: Object.assign({}, EMPTY_FORM, { ingredient_list: [] }),

    // 图片上传预览
    showImgPreview: false,
    imgPreviewSrc: '',
    imgPendingFile: null,

    // 食材选择器（复用dishes页逻辑）
    showIngPicker: false,
    allIngredients: [],
    ingSearch: '',
    ingStep: 'list',
    ingPending: null,
    ingAmount: '',
    ingUnitOptions: UNITS,
    ingUnitIndex: 0,
    newIngName: '',
    newIngUnit: 'g',
    newIngUnitIndex: 0,
  },

  onShow() { this.loadReservations(); },

  goBack() { wx.navigateBack(); },

  async loadReservations() {
    wx.showLoading({ title: '加载中...' });
    try {
      const raw = await api.adminAction('listAllReservations');
      this.setData({ reservations: raw || [] });
    } catch (e) {
      wx.showToast({ title: '加载失败', icon: 'error' });
    } finally {
      wx.hideLoading();
    }
  },

  handleReservation(e) {
    const item = e.currentTarget.dataset.item;
    this.setData({
      showForm: true,
      processingId: item.id,
      typeIndex: 0,
      activeType: 'food',
      categoryIndex: 0,
      categories: [],
      categoryNames: [],
      form: Object.assign({}, EMPTY_FORM, {
        ingredient_list: [],
        name: item.dish_name || '',
        notes: item.note || '',
      }),
      showImgPreview: false,
      imgPreviewSrc: '',
      imgPendingFile: null,
    });
    this._loadCategories('food');
  },

  cancelForm() {
    this.setData({
      showForm: false,
      processingId: null,
      form: Object.assign({}, EMPTY_FORM, { ingredient_list: [] }),
    });
  },

  // ── 类型 & 分类 ──────────────────────────────────
  onTypeChange(e) {
    const idx = parseInt(e.detail.value);
    const type = TYPE_OPTIONS[idx].key;
    this.setData({
      typeIndex: idx,
      activeType: type,
      categoryIndex: 0,
      categories: [],
      categoryNames: [],
      form: Object.assign({}, this.data.form, { category_id: '' }),
    });
    this._loadCategories(type);
  },

  async _loadCategories(type) {
    try {
      const cats = await api.adminAction('listCategories', { type });
      if (!Array.isArray(cats) || cats.length === 0) {
        this.setData({ categories: [], categoryNames: [] });
        return;
      }
      this.setData({
        categories: cats,
        categoryNames: cats.map(c => c.name),
        categoryIndex: 0,
        form: Object.assign({}, this.data.form, { category_id: cats[0].id }),
      });
    } catch (e) {}
  },

  onCategoryChange(e) {
    const idx = parseInt(e.detail.value);
    const cat = this.data.categories[idx];
    this.setData({
      categoryIndex: idx,
      form: Object.assign({}, this.data.form, { category_id: cat ? cat.id : '' }),
    });
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ form: Object.assign({}, this.data.form, { [field]: e.detail.value }) });
  },

  // ── 图片上传 ──────────────────────────────────────
  chooseImage() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      success: (res) => {
        const path = res.tempFiles[0].tempFilePath;
        const ext = path.split('.').pop();
        this.setData({ showImgPreview: true, imgPreviewSrc: path, imgPendingFile: { path, ext } });
      },
    });
  },

  cancelImgPreview() {
    this.setData({ showImgPreview: false, imgPreviewSrc: '', imgPendingFile: null });
  },

  async confirmImg() {
    const { imgPendingFile } = this.data;
    if (!imgPendingFile) return;
    this.setData({ showImgPreview: false });
    wx.showLoading({ title: '上传中...' });
    try {
      const cloudPath = `dishes/${Date.now()}.${imgPendingFile.ext}`;
      const res = await wx.cloud.uploadFile({ cloudPath, filePath: imgPendingFile.path });
      this.setData({
        form: Object.assign({}, this.data.form, { image: res.fileID }),
        imgPendingFile: null,
        imgPreviewSrc: '',
      });
      wx.hideLoading();
      wx.showToast({ title: '上传成功', icon: 'success' });
    } catch (e) {
      wx.hideLoading();
      wx.showToast({ title: '上传失败', icon: 'error' });
    }
  },

  // ── 食材选择器 ────────────────────────────────────
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
    if (this.data.form.ingredient_list.some(i => i.id === ing.id)) {
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

  onIngAmountInput(e) { this.setData({ ingAmount: e.detail.value }); },

  onIngUnitChange(e) { this.setData({ ingUnitIndex: parseInt(e.detail.value) }); },

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

  onNewIngNameInput(e) { this.setData({ newIngName: e.detail.value }); },

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

  // ── 提交 ─────────────────────────────────────────
  async submitDish() {
    const { form, activeType, processingId } = this.data;
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
    wx.showLoading({ title: '添加中...' });
    try {
      await api.adminAction('createDish', { type: activeType, dish });
      if (processingId) {
        await api.adminAction('updateReservationStatus', { id: processingId, status: '已处理' });
      }
      wx.hideLoading();
      wx.showToast({ title: '已加入菜单', icon: 'success' });
      this.cancelForm();
      this.loadReservations();
    } catch (e) {
      wx.hideLoading();
      wx.showToast({ title: '操作失败', icon: 'error' });
    }
  },

  // ── 预约操作 ──────────────────────────────────────
  async markProcessed(e) {
    const id = e.currentTarget.dataset.id;
    try {
      await api.adminAction('updateReservationStatus', { id, status: '已处理' });
      wx.showToast({ title: '已标记处理', icon: 'success' });
      this.loadReservations();
    } catch (e) {
      wx.showToast({ title: '操作失败', icon: 'error' });
    }
  },

  deleteReservation(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '确认删除',
      content: '确定删除这条预约吗？',
      success: async (res) => {
        if (!res.confirm) return;
        try {
          await api.adminAction('adminDeleteReservation', { id });
          wx.showToast({ title: '已删除', icon: 'success' });
          this.loadReservations();
        } catch (e) {
          wx.showToast({ title: '删除失败', icon: 'error' });
        }
      },
    });
  },
});
