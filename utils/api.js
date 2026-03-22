// utils/api.js - 统一封装后端请求
const BASE_URL = "http://localhost:8000";

function request(method, path, data) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: BASE_URL + path,
      method,
      data,
      header: { "Content-Type": "application/json" },
      success: res => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);
        } else {
          wx.showToast({ title: "请求失败", icon: "error" });
          reject(res);
        }
      },
      fail: err => {
        wx.showToast({ title: "网络错误", icon: "error" });
        reject(err);
      },
    });
  });
}

module.exports = {
  getCategories: () => request("GET", "/categories"),
  getDishes: (categoryId) => {
    const path = categoryId ? `/dishes?category_id=${categoryId}` : "/dishes";
    return request("GET", path);
  },
  getRandomDishes: (count = 5) => request("GET", `/dishes/random?count=${count}`),
  createOrder: (payload) => request("POST", "/orders", payload),
  getOrders: (userId) => request("GET", `/orders?user_id=${userId}`),
};
