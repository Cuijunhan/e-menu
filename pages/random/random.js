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
      // random action 内部合并三个集合
      const allDishes = await api.getRandomDishes(20);
      const cart = app.globalData.cart;
      const cartDishIds = cart.map(c => c.dish.id);
      const available = (Array.isArray(allDishes) ? allDishes : [])
        .filter(d => !cartDishIds.includes(d.id));

      if (available.length === 0) {
        const tips = ['你挺能造啊！', '吃多些啊？', '还吃！'];
        let tipText = tips[Math.floor(Math.random() * tips.length)];
        while (tipText === this.data.lastTipText && tips.length > 1) {
          tipText = tips[Math.floor(Math.random() * tips.length)];
        }
        this.setData({ showEmptyTip: true, emptyTipText: tipText, lastTipText: tipText, dishes: [] });
      } else {
        this.setData({ dishes: this._withCartCount(available.slice(0, 5)) });
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
    this.setData({ dishes: this._withCartCount(this.data.dishes) });
  },

  addToCart(e) {
    const { id, name, price } = e.currentTarget.dataset;
    app.addToCart({ id, name, price });

    const effects = ['removing', 'removing-bounce', 'removing-explode'];
    const randomEffect = effects[Math.floor(Math.random() * effects.length)];
    const dishes = this.data.dishes.map(d =>
      d.id === id ? { ...d, [randomEffect]: true } : d
    );
    this.setData({ dishes });

    const duration = randomEffect === 'removing-bounce' ? 600 : 500;
    setTimeout(() => {
      if (randomEffect !== 'removing-explode') {
        this.setData({ cartBlink: true });
        setTimeout(() => this.setData({ cartBlink: false }), 400);
      }
    }, duration);
    setTimeout(() => {
      this.setData({ dishes: this.data.dishes.filter(d => d.id !== id) });
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
    this.setData({ cartBlink: true });
    setTimeout(() => {
      this.setData({ cartBlink: false });
      wx.switchTab({ url: '/pages/cart/cart' });
    }, 400);
  },
});
