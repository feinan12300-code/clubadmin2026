const app = getApp()
const Store = require('../../../utils/store.js')
const util = require('../../../utils/util.js')

const METHOD_LABEL = { cash: '现金', wechat: '微信', alipay: '支付宝', card: '刷卡' }

Page({
  data: {
    venueId: '',
    venueName: '',
    records: [],
    totalStr: '0.00',
    count: 0,
  },

  onLoad(options) {
    const venueId = options.venueId || app.getCurrentVenueId()
    const venue = Store.getById(Store.KEYS.venues, venueId)
    this.setData({ venueId, venueName: venue ? venue.name : '' })
  },

  onShow() {
    this.refresh()
  },

  refresh() {
    const venueId = this.data.venueId
    if (!venueId) { this.setData({ records: [], totalStr: '0.00', count: 0 }); return }
    const tables = Store.tablesByVenue(venueId)
    const tableMap = {}
    tables.forEach(t => { tableMap[t.id] = t.name })

    const settlements = Store.settlementsByVenue(venueId)
      .sort((a, b) => (b.paidAt || 0) - (a.paidAt || 0))
      .map(s => {
        // 关联订单的桌台名
        const tableNames = (s.orderIds || [])
          .map(oid => {
            const o = Store.getById(Store.KEYS.orders, oid)
            return o && tableMap[o.tableId] ? tableMap[o.tableId] : ''
          })
          .filter(Boolean)
          .join('、')
        return Object.assign({}, s, {
          methodLabel: METHOD_LABEL[s.method] || s.method,
          timeStr: s.paidAt ? util.formatTime(s.paidAt) : '-',
          tableNames: tableNames || '-',
          totalStr: Number(s.total || 0).toFixed(2),
        })
      })

    const total = settlements.reduce((s, r) => s + Number(r.total || 0), 0)
    this.setData({
      records: settlements,
      totalStr: total.toFixed(2),
      count: settlements.length,
    })
  },
})
