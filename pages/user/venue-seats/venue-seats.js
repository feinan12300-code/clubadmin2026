// venue-seats.js — 用户端座位图：仅显示当前绑定的桌台
const app = getApp()
const Store = require('../../../utils/store.js')
const util = require('../../../utils/util.js')

// 桌型显示名
const TYPE_LABEL = {
  round: '圆桌',
  square: '方桌',
  booth: '卡座',
  bar: '吧台',
}
const STATUS_LABEL = {
  idle: '空闲',
  occupied: '使用中',
  reserved: '预留',
}

Page({
  data: {
    venueId: '',
    venueName: '',
    boundTable: null,   // 当前绑定的桌台详情
    hasBinding: false,  // 是否已绑定桌台
    activeOrder: null,  // 当前桌台的进行中订单
  },

  onLoad(options) {
    const venueId = options.venueId || app.getCurrentVenueId()
    const venue = Store.getById(Store.KEYS.venues, venueId)
    wx.setNavigationBarTitle({ title: venue ? venue.name : '我的桌位' })
    this.setData({
      venueId,
      venueName: venue ? venue.name : '',
    })
  },

  onShow() {
    this.refresh()
  },

  refresh() {
    const venueId = this.data.venueId
    if (!venueId) { this.setData({ boundTable: null, hasBinding: false }); return }
    const token = app.getToken()
    const binding = Store.getUserTable(token)
    if (!binding || binding.venueId !== venueId) {
      this.setData({ boundTable: null, hasBinding: false, activeOrder: null })
      return
    }
    const table = Store.getById(Store.KEYS.tables, binding.tableId)
    if (!table) {
      this.setData({ boundTable: null, hasBinding: false, activeOrder: null })
      return
    }
    // 查找该桌台进行中的订单
    const order = Store.ordersByVenue(venueId).find(o => o.tableId === table.id && o.status === 'open')
    const total = order ? (order.items || []).reduce((s, it) => s + it.price * it.qty, 0) : 0
    const itemCount = order ? (order.items || []).reduce((s, it) => s + it.qty, 0) : 0
    const activeOrder = order ? Object.assign({}, order, {
      totalStr: total.toFixed(2),
      itemCount,
    }) : null
    const boundTable = Object.assign({}, table, {
      typeLabel: TYPE_LABEL[table.type] || table.type,
      statusLabel: STATUS_LABEL[table.status] || table.status,
    })
    this.setData({ boundTable, hasBinding: true, activeOrder })
  },

  // 跳转去绑定桌台
  goBind() {
    wx.navigateTo({
      url: `/pages/user/table-bind/table-bind?venueId=${this.data.venueId}`,
    })
  },

  // 跳转点单
  goOrdering() {
    wx.navigateTo({
      url: `/pages/user/ordering/ordering?venueId=${this.data.venueId}`,
    })
  },

  // 跳转结算
  goBilling() {
    wx.redirectTo({
      url: `/pages/user/billing/billing?venueId=${this.data.venueId}`,
    })
  },

  // 解绑并重新选择
  switchTable() {
    wx.showModal({
      title: '切换桌位',
      content: '确认解除当前桌位绑定并重新选择？',
      confirmColor: '#6366f1',
      success: res => {
        if (!res.confirm) return
        const token = app.getToken()
        Store.clearUserTable(token)
        util.toast('已解除绑定', 'success')
        wx.redirectTo({
          url: `/pages/user/table-bind/table-bind?venueId=${this.data.venueId}`,
        })
      },
    })
  },
})
