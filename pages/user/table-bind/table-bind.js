// table-bind.js — 用户进入门店后绑定空闲桌台
// 新流程：用户不再自选桌台，必须由管理端在预定通知页指派具体台位。
// 访问本页时直接提示并跳转到预定页。
const app = getApp()
const Store = require('../../../utils/store.js')
const util = require('../../../utils/util.js')

Page({
  data: {
    venueId: '',
    venueName: '',
    hasBinding: false,
    boundTableName: '',
  },

  onLoad(options) {
    const venueId = options.venueId || app.getCurrentVenueId()
    const venue = Store.getById(Store.KEYS.venues, venueId)
    wx.setNavigationBarTitle({ title: venue ? venue.name : '台位指派' })
    this.setData({
      venueId,
      venueName: venue ? venue.name : '',
    })
  },

  onShow() {
    const token = app.getToken()
    const bound = Store.getUserTable(token)
    const hasBinding = !!(bound && bound.venueId === this.data.venueId)
    let boundTableName = ''
    if (hasBinding) {
      const t = Store.getById(Store.KEYS.tables, bound.tableId)
      boundTableName = t ? t.name : '?'
    }
    this.setData({ hasBinding, boundTableName })
  },

  // 已有 binding 直接去点单
  goOrdering() {
    wx.reLaunch({
      url: '/pages/user/ordering/ordering?venueId=' + this.data.venueId,
    })
  },

  // 跳转预定页
  goReservation() {
    wx.reLaunch({
      url: '/pages/user/reservation/reservation?venueId=' + this.data.venueId,
    })
  },
})
