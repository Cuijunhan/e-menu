const api = require('../../utils/api');
const app = getApp();

// 三种固定类型，顺序固定
const TYPES = [
  { key: 'food',   label: '饭菜',  storageKey: '__food__' },
  { key: 'coffee', label: '咖啡',  storageKey: '__coffee__' },
  { key: 'drink',  label: '酒水',  storageKey: '__wine__' },
]

Page({
  data: {
    types: TYPES,
    activeType: 'food',
    categories: [],
    dishes: [],
    activeCategoryId: null,
    cartCount: 0,
    cartTotal: '0.00',
    dishQuantities: {},
    cartBarHidden: false,
    lastScrollTop: 0,
    showDishDetail: false,
    selectedDish: {},
    statusBarHeight: 0,
    headerHeight: 0,
  },

  onLoad() {
    const { statusBarHeight = 20 } = wx.getSystemInfoSync();
    // header = 状态栏 + 标题行(约40px) + tab行(约46px)
    const headerHeight = statusBarHeight + 40 + 46;
    this.setData({ statusBarHeight, headerHeight });
    this._initType();
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 1 });
    }
    this.refreshCart();

    // 处理从首页跳转过来的预选类型
    const preSelect = wx.getStorageSync('preSelectMainCategory');
    if (preSelect) {
      wx.removeStorageSync('preSelectMainCategory');
      const match = TYPES.find(t => t.storageKey === preSelect);
      if (match && match.key !== this.data.activeType) {
        this.switchType(match.key);
        return;
      }
    }
  },

  _initType() {
    const preSelect = wx.getStorageSync('preSelectMainCategory');
    let initKey = 'food';
    if (preSelect) {
      wx.removeStorageSync('preSelectMainCategory');
      const match = TYPES.find(t => t.storageKey === preSelect);
      if (match) initKey = match.key;
    }
    this.switchType(initKey);
  },

  switchType(key) {
    this.setData({ activeType: key, categories: [], dishes: [], activeCategoryId: null });
    this._loadCategories(key);
    this._loadDishes(key, null);
  },

  onTypeTap(e) {
    const key = e.currentTarget.dataset.key;
    if (key === this.data.activeType) return;
    this.switchType(key);
  },

  async _loadCategories(type) {
    try {
      const cats = await api.getCategories(type);
      if (Array.isArray(cats)) {
        this.setData({ categories: cats });
      }
    } catch (e) {}
  },

  async _loadDishes(type, categoryId) {
    try {
      const dishes = await api.getDishes(type, categoryId);
      this.setData({ dishes: Array.isArray(dishes) ? dishes : [], activeCategoryId: categoryId });
      this.refreshCart();
    } catch (e) {}
  },

  onCategoryTap(e) {
    const id = e.currentTarget.dataset.id || null;
    this._loadDishes(this.data.activeType, id);
  },

  onDishTap(e) {
    const dish = e.currentTarget.dataset.dish;
    this.setData({ showDishDetail: true, selectedDish: dish });
  },

  closeDishDetail() {
    this.setData({ showDishDetail: false });
  },

  stopPropagation() {},

  onAddTap(e) {
    const dish = e.currentTarget.dataset.dish;
    app.addToCart(dish);
    this.refreshCart();
  },

  onRemoveTap(e) {
    const dish = e.currentTarget.dataset.dish;
    app.removeFromCart(dish.id);
    this.refreshCart();
  },

  refreshCart() {
    const quantities = {};
    app.globalData.cart.forEach(item => {
      quantities[item.dish.id] = item.quantity;
    });
    this.setData({
      cartCount: app.getCartCount(),
      cartTotal: app.getCartTotal(),
      dishQuantities: quantities,
    });
  },

  goToCart() {
    if (app.getCartCount() === 0) {
      wx.showToast({ title: '购物车是空的', icon: 'none' });
      return;
    }
    wx.switchTab({ url: '/pages/cart/cart' });
  },

  onScroll(e) {
    const scrollTop = e.detail.scrollTop;
    const delta = scrollTop - this.data.lastScrollTop;
    if (delta > 5) {
      this.setData({ cartBarHidden: true });
    } else if (delta < -5) {
      this.setData({ cartBarHidden: false });
    }
    setTimeout(() => this.setData({ cartBarHidden: false }), 200);
    this.setData({ lastScrollTop: scrollTop });
  },
});
