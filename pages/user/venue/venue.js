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
    const token = app.getToken()
    // 当前用户已有 binding（用于"进入门店"按钮的禁用判断）
    const userBinding = Store.getUserTable(token)
    const venues = Store.list(Store.KEYS.venues).map(v => {
      // 动态台位统计
      const stats = Store.tableStats(v.id)
      // canEnter: 用户必须在该门店有 binding 才可进入
      const canEnter = !!(userBinding && userBinding.venueId === v.id)
      const boundTableName = (function () {
        if (!canEnter) return ''
        const t = Store.getById(Store.KEYS.tables, userBinding.tableId)
        return t ? t.name : ''
      })()
      // 当日排队数：已提交预订但管理端尚未指派台位的数量
      const queueCount = Store.reservationsByVenue(v.id)
        .filter(r => r.date === today && r.status === 'pending' && !r.tableId)
        .length
      return Object.assign({}, v, {
        tableCount: stats.total,
        idleCount: stats.idle,
        occupiedCount: stats.occupied,
        reservedCount: stats.reserved,
        queueCount,
        canEnter,
        boundTableName,
      })
    })
    this.setData({ venues })
  },

  // 进入门店：必须已有 binding（即管理端已指派台位）；否则提示去预定
  enterVenue(e) {
    const id = e.currentTarget.dataset.id
    const item = this.data.venues.find(v => v.id === id)
    if (item && !item.canEnter) {
      wx.showModal({
        title: '请先预定',
        content: '您尚未获得该门店的台位指派\n请先创建预定，待门店确认并指派台位后再进入',
        confirmText: '去预定',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) {
            app.setCurrentVenue(id)
            wx.navigateTo({
              url: `/pages/user/reservation/reservation?venueId=${id}`,
            })
          }
        },
      })
      return
    }
    app.setCurrentVenue(id)
    // 有 binding 直接进入点单页（table-bind 不再让用户自选）
    wx.navigateTo({
      url: `/pages/user/ordering/ordering?venueId=${id}`,
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
