// pages/index/index.js
const api = require("../../utils/api");
const app = getApp();

Page({
  data: {
    mainCategories: [],
    categories: [],
    dishes: [],
    activeMainCategoryId: null,
    activeCategoryId: null,
    cartCount: 0,
    cartTotal: "0.00",
    dishQuantities: {},
    cartBarHidden: false,
    lastScrollTop: 0,
    scrollTimer: null,
    showDishDetail: false,
    selectedDish: {},
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 1 });
    }
    this.refreshCart();

    const preSelect = wx.getStorageSync('preSelectMainCategory');
    if (preSelect && this.data.mainCategories.length > 0) {
      wx.removeStorageSync('preSelectMainCategory');
      const code = preSelect.replace(/__/g, '');
      const match = this.data.mainCategories.find(mc => mc.code === code);
      if (match) {
        this.setData({ activeMainCategoryId: match.id });
        this.loadCategories(match.id);
      }
    }
  },

  onLoad() {
    this.loadMainCategories();
  },

  async loadMainCategories() {
    const mainCats = await api.getMainCategories();
    this.setData({ mainCategories: mainCats });

    // 检查是否有预选分类
    const preSelect = wx.getStorageSync('preSelectMainCategory');
    if (preSelect) {
      wx.removeStorageSync('preSelectMainCategory');
      const code = preSelect.replace(/__/g, '');
      const match = mainCats.find(mc => mc.code === code);
      if (match) {
        this.setData({ activeMainCategoryId: match.id });
        this.loadCategories(match.id);
        return;
      }
    }

    if (mainCats.length > 0) {
      this.setData({ activeMainCategoryId: mainCats[0].id });
      this.loadCategories(mainCats[0].id);
    }
  },

  async loadCategories(mainCategoryId) {
    const cats = await api.getCategories(mainCategoryId);
    this.setData({
      categories: cats,
      activeCategoryId: null,
      activeMainCategoryId: mainCategoryId
    });
    this.loadDishes(null, mainCategoryId);
  },

  async loadDishes(categoryId, mainCategoryId) {
    const dishes = await api.getDishes(categoryId, mainCategoryId || this.data.activeMainCategoryId);
    this.setData({ dishes, activeCategoryId: categoryId });
    this.refreshCart();
  },

  onCategoryTap(e) {
    const id = e.currentTarget.dataset.id;
    const categoryId = (id === 0 || id === null || id === '') ? null : id;
    this.loadDishes(categoryId, this.data.activeMainCategoryId);
    this.setData({ activeCategoryId: categoryId });
  },

  onMainCategoryTap(e) {
    const id = e.currentTarget.dataset.id;
    this.setData({ activeMainCategoryId: id });
    this.loadCategories(id);
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
      wx.showToast({ title: "购物车是空的", icon: "none" });
      return;
    }
    wx.switchTab({ url: "/pages/cart/cart" });
  },

  onScroll(e) {
    const scrollTop = e.detail.scrollTop;
    const delta = scrollTop - this.data.lastScrollTop;
    if (this.data.scrollTimer) clearTimeout(this.data.scrollTimer);
    if (delta > 5) {
      this.setData({ cartBarHidden: true });
    } else if (delta < -5) {
      this.setData({ cartBarHidden: false });
    }
    const timer = setTimeout(() => {
      this.setData({ cartBarHidden: false });
    }, 200);
    this.setData({ lastScrollTop: scrollTop, scrollTimer: timer });
  },
});
