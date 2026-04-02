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

    // 检查是否有预选的主分类
    const preSelectMainCategory = wx.getStorageSync('preSelectMainCategory');
    if (preSelectMainCategory) {
      wx.removeStorageSync('preSelectMainCategory');
      this.setData({ activeMainCategoryId: preSelectMainCategory });
      this.loadCategories(preSelectMainCategory);
    }
  },

  onLoad() {
    this.loadMainCategories();
  },

  async loadMainCategories() {
    const mainCats = await api.getMainCategories();
    this.setData({ mainCategories: mainCats });
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
    const categoryId = (id === 0 || id === null) ? null : id;
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

  stopPropagation() {
    // 阻止事件冒泡
  },

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

    // 清除之前的定时器
    if (this.data.scrollTimer) {
      clearTimeout(this.data.scrollTimer);
    }

    // 向下滚动隐藏，向上滚动显示
    if (delta > 5) {
      this.setData({ cartBarHidden: true });
    } else if (delta < -5) {
      this.setData({ cartBarHidden: false });
    }

    // 停止滚动200ms后显示
    const timer = setTimeout(() => {
      this.setData({ cartBarHidden: false });
    }, 200);

    this.setData({
      lastScrollTop: scrollTop,
      scrollTimer: timer
    });
  },
});
