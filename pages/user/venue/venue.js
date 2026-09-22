const app = getApp()
const Store = require('../../../utils/store.js')
const util = require('../../../utils/util.js')

Page({
  data: {
    venues: [],
  },

  onShow() {
    this.refresh()
  },

  refresh() {
    const today = util.today()
    const venues = Store.list(Store.KEYS.venues).map(v => {
      const tableCount = Store.tablesByVenue(v.id).length
      // 当日待确认预订数即为排队数
      const queueCount = Store.reservationsByVenue(v.id)
        .filter(r => r.date === today && r.status === 'pending')
        .length
      return Object.assign({}, v, { tableCount, queueCount })
    })
    this.setData({ venues })
  },

  enterVenue(e) {
    const id = e.currentTarget.dataset.id
    app.setCurrentVenue(id)
    wx.navigateTo({
      url: `/pages/user/table-bind/table-bind?venueId=${id}`,
    })
  },

  // 预定排队入口：从门店列表直接进入 reservation 页面
  goReservation(e) {
    const id = e.currentTarget.dataset.id
    app.setCurrentVenue(id)
    wx.navigateTo({
      url: `/pages/user/reservation/reservation?venueId=${id}`,
    })
  },

  // 座位图入口：从门店列表进入 venue-seats（只读，查看该门店全部桌台）
  goVenueSeats(e) {
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
