const app = getApp()
const Store = require('../../../utils/store.js')
const util = require('../../../utils/util.js')

const STATUS_LABEL = { open: '进行中', settled: '已结算', cancelled: '已取消' }
const METHOD_LABEL = { cash: '现金', wechat: '微信', alipay: '支付宝', card: '刷卡' }

Page({
  data: {
    venueId: '',
    venueName: '',
    orders: [],
    expandedId: '',
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
    if (!venueId) { this.setData({ orders: [] }); return }
    const tables = Store.tablesByVenue(venueId)
    const tableMap = {}
    tables.forEach(t => { tableMap[t.id] = t.name })
    const orders = Store.ordersByVenue(venueId)
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
      .map(o => {
        const total = (o.items || []).reduce((s, it) => s + it.price * it.qty, 0)
        return Object.assign({}, o, {
          statusLabel: STATUS_LABEL[o.status] || o.status,
          tableName: tableMap[o.tableId] || '-',
          totalStr: total.toFixed(2),
          timeStr: o.createdAt ? util.formatTime(o.createdAt) : '-',
          itemCount: (o.items || []).length,
        })
      })
    this.setData({ orders })
  },

  toggleExpand(e) {
    const id = e.currentTarget.dataset.id
    this.setData({ expandedId: this.data.expandedId === id ? '' : id })
  },
})
