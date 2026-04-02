// utils/api.js - 统一封装后端请求
const BASE_URL = "http://114.67.227.216:8000";

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
  getBanners: () => request("GET", "/banners"),
  getMainCategories: () => request("GET", "/api/main-categories"),
  getCategories: (mainCategoryId) => {
    const path = mainCategoryId ? `/categories?main_category_id=${mainCategoryId}` : "/categories";
    return request("GET", path);
  },
  getDishes: (categoryId, mainCategoryId) => {
    let path = "/dishes";
    if (categoryId) {
      path += `?category_id=${categoryId}`;
    } else if (mainCategoryId) {
      path += `?main_category_id=${mainCategoryId}`;
    }
    console.log('getDishes API 调用:', { categoryId, mainCategoryId, path });
    return request("GET", path);
  },
  getRandomDishes: (count = 5) => request("GET", `/dishes/random?count=${count}`),
  createOrder: (payload) => request("POST", "/orders", payload),
  getOrders: (userId) => request("GET", `/orders?user_id=${userId}`),
  deleteOrder: (id) => request("DELETE", `/orders/${id}`),
  // 预约
  createReservation: (payload) => request("POST", "/reservations", payload),
  getReservations: (userId) => request("GET", `/reservations?user_id=${userId}`),
  updateReservation: (id, payload) => request("PUT", `/reservations/${id}`, payload),
  deleteReservation: (id) => request("DELETE", `/reservations/${id}`),
};
