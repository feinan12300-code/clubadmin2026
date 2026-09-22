// app.js — 小程序入口
const Store = require('./utils/store.js')
const Seed = require('./utils/seed.js')

App({
  globalData: {
    currentVenueId: null,
    role: 'user', // admin 管理端 / user 用户端（默认用户端，管理端后续补充）
  },

  onLaunch() {
    // 首次运行注入示例数据
    if (!Store.isSeeded()) {
      Seed.inject()
    }
    this.globalData.currentVenueId = Store.getCurrentVenueId()
    this.globalData.role = Store.getRole()
  },

  // 登录态
  getToken() {
    try { return wx.getStorageSync('bb_token') || '' } catch (e) { return '' }
  },
  hasLogin() {
    return !!this.getToken()
  },
  logout() {
    try {
      wx.removeStorageSync('bb_token')
      wx.removeStorageSync('bb_openid')
    } catch (e) {}
  },

  // 切换当前门店
  setCurrentVenue(venueId) {
    Store.setCurrentVenueId(venueId)
    this.globalData.currentVenueId = venueId
  },

  getCurrentVenueId() {
    if (this.globalData.currentVenueId) return this.globalData.currentVenueId
    return Store.getCurrentVenueId()
  },

  // 角色
  getRole() {
    if (this.globalData.role) return this.globalData.role
    return Store.getRole()
  },
  setRole(role) {
    Store.setRole(role)
    this.globalData.role = role
  },
})
