const app = getApp()
const Store = require('../../utils/store.js')

Page({
  data: {
    venues: [],
  },

  onShow() {
    this.refresh()
  },

  refresh() {
    const venues = Store.list(Store.KEYS.venues).map(v => {
      const tableCount = Store.tablesByVenue(v.id).length
      return Object.assign({}, v, { tableCount })
    })
    this.setData({ venues })
  },

  enterVenue(e) {
    const id = e.currentTarget.dataset.id
    app.setCurrentVenue(id)
    wx.navigateTo({
      url: `/pages/user/venue-seats/venue-seats?venueId=${id}`,
    })
  },

  logout() {
    wx.showModal({
      title: '退出登录',
      content: '确认退出登录？',
      success: res => {
        if (!res.confirm) return
        app.logout()
        wx.reLaunch({ url: '/pages/index/index' })
      },
    })
  },
})
