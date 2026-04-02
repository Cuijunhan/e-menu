// pages/random/random.js
const api = require('../../utils/api');
const app = getApp();

Page({
  data: {
    dishes: [],
    loading: false,
    cartBlink: false,
    showEmptyTip: false,
    emptyTipText: '',
    lastTipText: '',
  },

  onLoad() {
    this.loadRandom();
  },

  onShow() {
    this._syncCart();
  },

  async loadRandom() {
    this.setData({ loading: true, showEmptyTip: false });
    try {
      const allDishes = await api.getRandomDishes(20);
      // 过滤掉已在购物车中的菜品
      const cart = app.globalData.cart;
      const cartDishIds = cart.map(c => c.dish.id);
      const availableDishes = allDishes.filter(d => !cartDishIds.includes(d.id));

      if (availableDishes.length === 0) {
        // 没有可用菜品，显示随机提示
        const tips = ['你挺能造啊！', '吃多些啊？', '还吃！'];
        let tipText = tips[Math.floor(Math.random() * tips.length)];
        // 避免连续重复
        while (tipText === this.data.lastTipText && tips.length > 1) {
          tipText = tips[Math.floor(Math.random() * tips.length)];
        }
        this.setData({
          showEmptyTip: true,
          emptyTipText: tipText,
          lastTipText: tipText,
          dishes: []
        });
      } else {
        // 取前5个
        const dishes = availableDishes.slice(0, 5);
        this.setData({ dishes: this._withCartCount(dishes) });
      }
    } catch (e) {
      wx.showToast({ title: '加载失败', icon: 'error' });
    } finally {
      this.setData({ loading: false });
      this._syncCart();
    }
  },

  _withCartCount(dishes) {
    const cart = app.globalData.cart;
    return dishes.map(d => {
      const item = cart.find(c => c.dish.id === d.id);
      return { ...d, count: item ? item.quantity : 0 };
    });
  },

  _syncCart() {
    this.setData({
      dishes: this._withCartCount(this.data.dishes),
    });
  },

  addToCart(e) {
    const { id, name, price } = e.currentTarget.dataset;
    app.addToCart({ id, name, price });

    // 随机选择动画效果
    const effects = ['removing', 'removing-bounce', 'removing-explode'];
    const randomEffect = effects[Math.floor(Math.random() * effects.length)];

    // 标记为移除状态，触发动画
    const dishes = this.data.dishes.map(d =>
      d.id === id ? { ...d, [randomEffect]: true } : d
    );
    this.setData({ dishes });

    // 根据动画类型设置不同的时长
    const duration = randomEffect === 'removing-bounce' ? 600 : 500;

    // 动画结束时触发购物车闪烁
    setTimeout(() => {
      if (randomEffect !== 'removing-explode') {
        this.setData({ cartBlink: true });
        setTimeout(() => {
          this.setData({ cartBlink: false });
        }, 400);
      }
    }, duration);

    // 动画结束后移除卡片
    setTimeout(() => {
      this.setData({
        dishes: this.data.dishes.filter(d => d.id !== id)
      });
    }, duration);
  },

  decreaseCart(e) {
    const id = e.currentTarget.dataset.id;
    app.removeFromCart(id);
    this._syncCart();
  },

  onRandom() {
    this.loadRandom();
  },

  goToCart() {
    // 触发菜篮子动画
    this.setData({ cartBlink: true });
    setTimeout(() => {
      this.setData({ cartBlink: false });
      wx.switchTab({ url: '/pages/cart/cart' });
    }, 400);
  },
});
