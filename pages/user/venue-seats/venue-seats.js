// venue-seats.js — 用户端座位图：从门店列表进入，只读展示该门店全部桌台
const app = getApp()
const Store = require('../../../utils/store.js')

// 桌型显示名
const TYPE_LABEL = {
  round: '圆桌',
  square: '方桌',
  booth: '卡座',
  bar: '吧台',
}
const STATUS_LABEL = {
  idle: '空闲',
  occupied: '占用',
  reserved: '预留',
}

Page({
  data: {
    venueId: '',
    venueName: '',
    tables: [],        // 全部桌台（只读）
    boundTableId: '',  // 已绑定的桌台（高亮）
    hasBinding: false,
    summary: { idle: 0, occupied: 0, reserved: 0, total: 0 },
  },

  onLoad(options) {
    const venueId = options.venueId || app.getCurrentVenueId()
    const venue = Store.getById(Store.KEYS.venues, venueId)
    wx.setNavigationBarTitle({ title: venue ? venue.name + '·座位图' : '座位图' })
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

    // 读取当前用户绑定的桌台（用于高亮）
    const token = app.getToken()
    const binding = Store.getUserTable(token)
    const boundTableId = (binding && binding.venueId === venueId) ? binding.tableId : ''

    // 该门店全部桌台（只读，按名称排序）
    const tables = Store.tablesByVenue(venueId)
      .slice()
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
      .map(t => Object.assign({}, t, {
        typeLabel: TYPE_LABEL[t.type] || t.type,
        statusLabel: STATUS_LABEL[t.status] || t.status,
        isBound: t.id === boundTableId,
      }))

    // 统计
    const summary = tables.reduce((acc, t) => {
      acc.total += 1
      if (t.status === 'idle') acc.idle += 1
      else if (t.status === 'occupied') acc.occupied += 1
      else if (t.status === 'reserved') acc.reserved += 1
      return acc
    }, { idle: 0, occupied: 0, reserved: 0, total: 0 })

    this.setData({
      tables,
      boundTableId,
      hasBinding: !!boundTableId,
      summary,
    })
  },
})
