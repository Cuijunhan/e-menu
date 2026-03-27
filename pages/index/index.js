// pages/index/index.js
const api = require("../../utils/api");
const app = getApp();

Page({
  data: {
    categories: [],
    dishes: [],
    activeCategoryId: null,
    cartCount: 0,
    cartTotal: "0.00",
    dishQuantities: {},
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 1 });
    }
    // 如果首页预选了分类（如"咖啡"/"酒"），自动切换过去
    if (this.data.categories.length > 0) {
      const pre = wx.getStorageSync('preSelectCategory');
      if (pre !== undefined && pre !== null) {
        wx.removeStorageSync('preSelectCategory');
        if (pre === '') {
          this.loadDishes(null);
        } else {
          const match = this.data.categories.find(c => c.name && c.name.includes(pre));
          this.loadDishes(match ? match.id : null);
        }
        return;
      }
    }
    this.refreshCart();
  },

  onLoad() {
    this.loadCategories();
  },

  async loadCategories() {
    const cats = await api.getCategories();
    this.setData({ categories: cats });

    // 首次加载时检查预选分类
    const pre = wx.getStorageSync('preSelectCategory');
    if (pre !== undefined && pre !== null) {
      wx.removeStorageSync('preSelectCategory');
      if (pre === '') {
        this.loadDishes(null);
      } else {
        const match = cats.find(c => c.name && c.name.includes(pre));
        this.loadDishes(match ? match.id : null);
      }
    } else {
      this.loadDishes(null);
    }
  },

  async loadDishes(categoryId) {
    const dishes = await api.getDishes(categoryId);
    this.setData({ dishes, activeCategoryId: categoryId });
    this.refreshCart();
  },

  onCategoryTap(e) {
    const id = e.currentTarget.dataset.id;
    const next = id === this.data.activeCategoryId ? null : id;
    this.loadDishes(next);
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
});
