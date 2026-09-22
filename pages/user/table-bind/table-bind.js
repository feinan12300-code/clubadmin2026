// table-bind.js — 用户进入门店后绑定空闲桌台
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

Page({
  data: {
    venueId: '',
    venueName: '',
    tables: [],     // 空闲桌台列表
    boundTableId: '', // 已绑定的桌台（如有）
  },

  onLoad(options) {
    const venueId = options.venueId || app.getCurrentVenueId()
    const venue = Store.getById(Store.KEYS.venues, venueId)
    wx.setNavigationBarTitle({ title: venue ? venue.name : '选择桌位' })
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
    if (!venueId) { this.setData({ tables: [] }); return }
    // 仅展示空闲桌台供选择
    const token = app.getToken()
    const bound = Store.getUserTable(token)
    const tables = Store.tablesByVenue(venueId)
      .filter(t => t.status === 'idle')
      .slice()
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
      .map(t => Object.assign({}, t, {
        typeLabel: TYPE_LABEL[t.type] || t.type,
      }))
    this.setData({
      tables,
      boundTableId: bound && bound.venueId === venueId ? bound.tableId : '',
    })
  },

  // 绑定桌台
  bindTable(e) {
    const id = e.currentTarget.dataset.id
    const table = Store.getById(Store.KEYS.tables, id)
    if (!table) { util.toast('桌台不存在'); return }
    if (table.status !== 'idle') { util.toast('该桌台已被占用'); return }
    const token = app.getToken()
    if (!token) { util.toast('请先登录'); return }
    Store.setUserTable(token, this.data.venueId, id)
    util.toast('已绑定 ' + (table.name || ''), 'success')
    // 绑定后直接进入座位图（只展示自己桌台）
    setTimeout(() => {
      wx.reLaunch({
        url: `/pages/user/venue-seats/venue-seats?venueId=${this.data.venueId}`,
      })
    }, 600)
  },

  // 切换桌台：清除原绑定后重新选择
  switchTable() {
    const token = app.getToken()
    Store.clearUserTable(token)
    this.setData({ boundTableId: '' })
    util.toast('已解除绑定，请重新选择', 'none')
  },
})
