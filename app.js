// app.js - 全局逻辑，存储购物车和用户信息
App({
  globalData: {
    userId: 1,          // 测试用固定用户 id，后续替换为真实 openid 登录
    cart: [],           // 购物车：[{ dish, quantity }]
  },

  // 购物车工具方法
  addToCart(dish) {
    const cart = this.globalData.cart;
    const existing = cart.find(item => item.dish.id === dish.id);
    if (existing) {
      existing.quantity += 1;
    } else {
      cart.push({ dish, quantity: 1 });
    }
  },

  removeFromCart(dishId) {
    const cart = this.globalData.cart;
    const idx = cart.findIndex(item => item.dish.id === dishId);
    if (idx === -1) return;
    if (cart[idx].quantity > 1) {
      cart[idx].quantity -= 1;
    } else {
      cart.splice(idx, 1);
    }
  },

  getCartCount() {
    return this.globalData.cart.reduce((sum, item) => sum + item.quantity, 0);
  },

  getCartTotal() {
    return this.globalData.cart
      .reduce((sum, item) => sum + item.dish.price * item.quantity, 0)
      .toFixed(2);
  },

  clearCart() {
    this.globalData.cart = [];
  },
});
