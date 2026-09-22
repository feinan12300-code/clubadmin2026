const app = getApp()
const Store = require('../../../utils/store.js')
const util = require('../../../utils/util.js')

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
    tableName: '',
    allItems: [],      // 合并后的商品列表
    totalStr: '0.00',   // 原价合计
    payTotalStr: '0.00', // 应付（扣折扣/抹零后）
    discount: 0,
    roundIndex: 0,
    methodIndex: 1,
    roundNames: ROUND_NAMES,
    methodNames: METHOD_NAMES,
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
    wx.redirectTo({ url: '/pages/user/ordering/ordering?venueId=' + this.data.venueId })
  },

  refresh() {
    const venueId = this.data.venueId
    if (!venueId) { this.setData({ allItems: [] }); return }

    // 读取绑定的桌台
    const token = app.getToken()
    const binding = Store.getUserTable(token)
    if (!binding || binding.venueId !== venueId) {
      this.setData({ allItems: [], tableName: '' })
      return
    }

    const table = Store.getById(Store.KEYS.tables, binding.tableId)
    const tableName = table ? table.name : '?'

    // 合并该桌台所有 open 订单的商品
    const orders = Store.ordersByVenue(venueId).filter(o => o.status === 'open' && o.tableId === binding.tableId)
    const itemMap = {}
    orders.forEach(o => {
      ;(o.items || []).forEach(it => {
        if (!itemMap[it.itemId]) {
          itemMap[it.itemId] = { name: it.name, price: it.price, qty: 0, itemId: it.itemId }
        }
        itemMap[it.itemId].qty += it.qty
      })
    })

    const allItems = Object.values(itemMap).map(it => ({
      ...it,
      subStr: fmtMoney(it.price * it.qty),
    }))
    const total = allItems.reduce((s, it) => s + it.price * it.qty, 0)

    this._orders = orders
    this._subtotal = total
    this.setData({
      tableName,
      allItems,
      totalStr: fmtMoney(total),
    })
    this._updatePayTotal()
  },

  onDiscount(e) {
    this.setData({ discount: Number(e.detail.value) || 0 })
    this._updatePayTotal()
  },

  onRound(e) {
    this.setData({ roundIndex: Number(e.detail.value) })
    this._updatePayTotal()
  },

  onMethod(e) {
    this.setData({ methodIndex: Number(e.detail.value) })
  },

  _updatePayTotal() {
    const subtotal = this._subtotal || 0
    const disc = this.data.discount || 0
    const round = this.data.roundIndex === 1
    let total = subtotal - disc
    if (round) total = Math.floor(total)
    if (total < 0) total = 0
    this._payTotal = total
    this.setData({ payTotalStr: fmtMoney(total) })
  },

  confirmSettle() {
    if (!this._orders || this._orders.length === 0) {
      util.toast('暂无可结算的订单')
      return
    }
    const orderIds = this._orders.map(o => o.id)
    const subtotal = this._subtotal
    const total = this._payTotal
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
    const tableIds = new Set()
    orderIds.forEach(id => {
      const o = Store.getById(Store.KEYS.orders, id)
      if (o) {
        Store.update(Store.KEYS.orders, id, { status: 'settled', settledAt: Date.now() })
        tableIds.add(o.tableId)
      }
    })
    tableIds.forEach(tid => {
      const stillOpen = Store.ordersByVenue(this.data.venueId).some(o => o.tableId === tid && o.status === 'open')
      if (!stillOpen) Store.setTableStatus(this.data.venueId, tid, 'idle')
    })

    util.toast('结算成功：¥' + fmtMoney(total) + '（' + METHOD_NAMES[this.data.methodIndex] + '）', 'success')
    this.refresh()
  },
})
