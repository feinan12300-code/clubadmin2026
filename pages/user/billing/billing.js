const app = getApp()
const Store = require('../../utils/store.js')
const util = require('../../utils/util.js')

const METHOD_LIST = ['cash', 'wechat', 'alipay', 'card']
const METHOD_NAMES = ['现金', '微信', '支付宝', '刷卡']
const ROUND_NAMES = ['不抹零', '抹零(向下取整)']

function fmtMoney(n) { return Number(n || 0).toFixed(2) }

function orderTotal(order) {
  return (order.items || []).reduce((s, it) => s + it.price * it.qty, 0)
}

Page({
  data: {
    venueId: '',
    venueName: '',
    stats: { todayRevenueStr: '0.00', todayOrderCount: 0, tableUsage: 0, avgPerOrderStr: '0.00', topItems: [], timeStr: '' },
    openOrders: [],
    selectedCount: 0,
    // 结算弹窗
    settleShow: false,
    settleOrders: [],
    settleTableNames: '',
    settleItems: [],
    settleSubtotalStr: '0.00',
    settleTotalStr: '0.00',
    discount: 0,
    roundIndex: 0,
    methodIndex: 1,
    roundNames: ROUND_NAMES,
    methodNames: METHOD_NAMES,
    // 拆分
    splitShow: false,
    splitOrderId: '',
    splitTableName: '',
    splitItems: [],
    splitTotalStr: '0.00',
    splitMethodIndex: 1,
  },

  onLoad(options) {
    const venueId = options.venueId || app.getCurrentVenueId()
    const venue = Store.getById(Store.KEYS.venues, venueId)
    this.setData({ venueId, venueName: venue ? venue.name : '' })
  },
  onShow() {
    this.refresh()
  },
  goOrdering() {
    wx.redirectTo({ url: `/pages/user/ordering/ordering?venueId=${this.data.venueId}` })
  },
  onVenueChange(e) {
    const venueId = e.detail.venueId
    app.setCurrentVenue(venueId)
    this.setData({ venueId, settleShow: false, splitShow: false })
    this.refresh()
  },

  refresh() {
    const venueId = this.data.venueId
    if (!venueId) { this.setData({ openOrders: [] }); return }
    // 待结算
    const openOrders = Store.ordersByVenue(venueId).filter(o => o.status === 'open').map(o => {
      const t = Store.getById(Store.KEYS.tables, o.tableId)
      return Object.assign({}, o, {
        tableName: t ? t.name : '?',
        timeStr: util.formatTime(o.createdAt),
        totalStr: fmtMoney(orderTotal(o)),
        detail: (o.items || []).map(it => `${it.name}×${it.qty}`).join('，') || '空',
        checked: false,
      })
    })
    this.setData({ openOrders, selectedCount: 0 })
    // 统计
    this.setData({ stats: this.computeStats(venueId) })
  },

  computeStats(venueId) {
    const today = util.today()
    const settlements = Store.settlementsByVenue(venueId).filter(s => {
      const d = new Date(s.paidAt)
      const pad = n => String(n).padStart(2, '0')
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` === today
    })
    const todayRevenue = settlements.reduce((s, st) => s + st.total, 0)
    const orderIds = new Set()
    settlements.forEach(s => s.orderIds.forEach(id => orderIds.add(id)))
    const todayOrderCount = orderIds.size
    const allTables = Store.tablesByVenue(venueId)
    const openTables = Store.ordersByVenue(venueId).filter(o => o.status === 'open').length
    const tableUsage = allTables.length === 0 ? 0 : Math.round(openTables / allTables.length * 100)
    const avgPerOrder = todayOrderCount > 0 ? todayRevenue / todayOrderCount : 0

    const itemMap = {}
    settlements.forEach(s => {
      s.orderIds.forEach(oid => {
        const o = Store.getById(Store.KEYS.orders, oid)
        if (!o) return
        ;(o.items || []).forEach(it => {
          if (!itemMap[it.itemId]) itemMap[it.itemId] = { name: it.name, qty: 0, revenue: 0 }
          itemMap[it.itemId].qty += it.qty
          itemMap[it.itemId].revenue += it.price * it.qty
        })
      })
    })
    const topItems = Object.values(itemMap)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5)
      .map(it => Object.assign({}, it, { revenueStr: fmtMoney(it.revenue) }))

    return {
      todayRevenueStr: fmtMoney(todayRevenue),
      todayOrderCount,
      tableUsage,
      avgPerOrderStr: fmtMoney(avgPerOrder),
      topItems,
      timeStr: util.formatTime(Date.now()),
    }
  },

  toggleCheck(e) {
    const id = e.currentTarget.dataset.id
    const openOrders = this.data.openOrders.map(o => o.id === id ? Object.assign({}, o, { checked: !o.checked }) : o)
    const selectedCount = openOrders.filter(o => o.checked).length
    this.setData({ openOrders, selectedCount })
  },

  // 结算弹窗
  openSettle(e) {
    const id = e.currentTarget.dataset.id
    this._openSettleDialog([id])
  },
  onMerge() {
    const ids = this.data.openOrders.filter(o => o.checked).map(o => o.id)
    if (ids.length < 2) { util.toast('合并结算需勾选至少 2 个订单'); return }
    this._openSettleDialog(ids)
  },
  onBatch() {
    const ids = this.data.openOrders.filter(o => o.checked).map(o => o.id)
    if (ids.length === 0) { util.toast('请先勾选订单'); return }
    this._openSettleDialog(ids)
  },
  _openSettleDialog(orderIds) {
    const orders = orderIds.map(id => Store.getById(Store.KEYS.orders, id)).filter(Boolean)
    if (orders.length === 0) return
    const subtotal = orders.reduce((s, o) => s + orderTotal(o), 0)
    const tableNames = orders.map(o => { const t = Store.getById(Store.KEYS.tables, o.tableId); return t ? t.name : '?' })
    const items = []
    let idx = 0
    orders.forEach(o => (o.items || []).forEach(it => {
      items.push({ idx: idx++, name: it.name, priceStr: fmtMoney(it.price), qty: it.qty, subStr: fmtMoney(it.price * it.qty) })
    }))
    this.setData({
      settleShow: true,
      settleOrders: orders,
      settleTableNames: tableNames.join('，'),
      settleItems: items,
      settleSubtotalStr: fmtMoney(subtotal),
      discount: 0,
      roundIndex: 0,
      methodIndex: 1,
    })
    this._settleSubtotal = subtotal
    this._updateSettleTotal()
  },
  onDiscount(e) {
    const v = Number(e.detail.value) || 0
    this.setData({ discount: v })
    this._updateSettleTotal()
  },
  onRound(e) {
    this.setData({ roundIndex: Number(e.detail.value) })
    this._updateSettleTotal()
  },
  onMethod(e) {
    this.setData({ methodIndex: Number(e.detail.value) })
  },
  _updateSettleTotal() {
    const subtotal = this._settleSubtotal || 0
    const disc = this.data.discount || 0
    const round = this.data.roundIndex === 1
    let total = subtotal - disc
    if (round) total = Math.floor(total)
    if (total < 0) total = 0
    this._settleTotal = total
    this.setData({ settleTotalStr: fmtMoney(total) })
  },
  closeSettle() { this.setData({ settleShow: false }) },
  confirmSettle() {
    const orderIds = this.data.settleOrders.map(o => o.id)
    const subtotal = this._settleSubtotal
    const total = this._settleTotal
    const method = METHOD_LIST[this.data.methodIndex]
    Store.create(Store.KEYS.settlements, {
      venueId: this.data.venueId,
      orderIds,
      subtotal,
      discount: subtotal - total,
      total,
      method,
      paidAt: Date.now(),
    }, { prefix: 'stl', noTimestamp: true })
    // 更新订单状态、释放桌台
    const releasedTableIds = new Set()
    orderIds.forEach(id => {
      const o = Store.getById(Store.KEYS.orders, id)
      if (o) {
        Store.update(Store.KEYS.orders, id, { status: 'settled', settledAt: Date.now() })
        releasedTableIds.add(o.tableId)
      }
    })
    releasedTableIds.forEach(tid => {
      const stillOpen = Store.ordersByVenue(this.data.venueId).some(o => o.tableId === tid && o.status === 'open')
      if (!stillOpen) Store.setTableStatus(this.data.venueId, tid, 'idle')
    })
    this.setData({ settleShow: false })
    util.toast(`结算成功：¥${fmtMoney(total)}（${METHOD_NAMES[this.data.methodIndex]}）`, 'success')
    this.refresh()
  },

  // 拆分
  openSplit(e) {
    const id = e.currentTarget.dataset.id
    const order = Store.getById(Store.KEYS.orders, id)
    if (!order) return
    const t = Store.getById(Store.KEYS.tables, order.tableId)
    const splitItems = (order.items || []).map((it, idx) => ({
      idx,
      itemId: it.itemId,
      name: it.name,
      price: it.price,
      priceStr: fmtMoney(it.price),
      qty: it.qty,
      subStr: fmtMoney(it.price * it.qty),
      checked: true,
    }))
    this.setData({
      splitShow: true,
      splitOrderId: id,
      splitTableName: t ? t.name : '?',
      splitItems,
      splitMethodIndex: 1,
    })
    this._updateSplitTotal()
  },
  toggleSplit(e) {
    const idx = Number(e.currentTarget.dataset.idx)
    const splitItems = this.data.splitItems.map((it, i) => i === idx ? Object.assign({}, it, { checked: !it.checked }) : it)
    this.setData({ splitItems })
    this._updateSplitTotal()
  },
  _updateSplitTotal() {
    const total = this.data.splitItems.filter(it => it.checked).reduce((s, it) => s + it.price * it.qty, 0)
    this.setData({ splitTotalStr: fmtMoney(total) })
  },
  onSplitMethod(e) { this.setData({ splitMethodIndex: Number(e.detail.value) }) },
  closeSplit() { this.setData({ splitShow: false }) },
  confirmSplit() {
    const selected = this.data.splitItems.filter(it => it.checked)
    if (selected.length === 0) { util.toast('请至少选择一项结算'); return }
    const unselected = this.data.splitItems.filter(it => !it.checked)
    const method = METHOD_LIST[this.data.splitMethodIndex]
    const settleTotal = selected.reduce((s, it) => s + it.price * it.qty, 0)
    const order = Store.getById(Store.KEYS.orders, this.data.splitOrderId)
    Store.create(Store.KEYS.settlements, {
      venueId: this.data.venueId,
      orderIds: [order.id],
      subtotal: settleTotal,
      discount: 0,
      total: settleTotal,
      method,
      paidAt: Date.now(),
    }, { prefix: 'stl', noTimestamp: true })
    if (unselected.length === 0) {
      Store.update(Store.KEYS.orders, order.id, { status: 'settled', settledAt: Date.now() })
      const stillOpen = Store.ordersByVenue(this.data.venueId).some(o => o.tableId === order.tableId && o.status === 'open')
      if (!stillOpen) Store.setTableStatus(this.data.venueId, order.tableId, 'idle')
    } else {
      const remainItems = unselected.map(it => ({ itemId: it.itemId, name: it.name, price: it.price, qty: it.qty, notes: '' }))
      Store.update(Store.KEYS.orders, order.id, { items: remainItems })
    }
    this.setData({ splitShow: false })
    util.toast(`拆分结算成功：¥${fmtMoney(settleTotal)}（${METHOD_NAMES[this.data.splitMethodIndex]}）`, 'success')
    this.refresh()
  },
})
