Component({
  data: {
    selected: 0,
    list: [
      {
        pagePath: "/pages/home/home",
        text: "HOME",
        iconPath: "/images/底部/home.png",
        selectedIconPath: "/images/底部/home.png"
      },
      {
        pagePath: "/pages/index/index",
        text: "TASTE",
        iconPath: "/images/底部/菜单.png",
        selectedIconPath: "/images/底部/菜单.png"
      },
      {
        pagePath: "/pages/cart/cart",
        text: "CART",
        iconPath: "/images/底部/购车.png",
        selectedIconPath: "/images/底部/购车.png"
      },
      {
        pagePath: "/pages/profile/profile",
        text: "IDENTITY",
        iconPath: "/images/底部/个人.png",
        selectedIconPath: "/images/底部/个人.png"
      }
    ]
  },
  methods: {
    switchTab(e) {
      const data = e.currentTarget.dataset;
      const url = data.path;
      wx.switchTab({ url });
      this.setData({
        selected: data.index
      });
    }
  }
});
