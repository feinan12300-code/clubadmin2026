// ordering.js — 用户端点单：使用绑定的桌台，移除开台/管理操作
const app = getApp()
const Store = require('../../../utils/store.js')
const util = require('../../../utils/util.js')

const STATUS_LABEL = { idle: '空闲', occupied: '使用中', reserved: '预留' }

function fmtMoney(n) { return Number(n || 0).toFixed(2) }

Page({
  data: {
    venueId: '',
    venueName: '',
    activeTableId: '',
    activeTable: null,
    activeOrderId: '',
    orderItems: [],
    orderTotalStr: '0.00',
    hasBinding: false,
    // 菜单
    cats: [],
    cat: '',
    filteredMenu: [],
  },

  onLoad(options) {
    const venueId = options.venueId || app.getCurrentVenueId()
    const venue = Store.getById(Store.KEYS.venues, venueId)
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
    if (!venueId) { this.setData({ filteredMenu: [] }); return }

    // 读取绑定的桌台
    const token = app.getToken()
    const binding = Store.getUserTable(token)
    if (!binding || binding.venueId !== venueId) {
      this.setData({ hasBinding: false, activeTable: null, filteredMenu: [] })
      util.toast('请先选择桌位')
      setTimeout(() => {
        wx.redirectTo({
          url: `/pages/user/table-bind/table-bind?venueId=${venueId}`,
        })
      }, 800)
      return
    }

    const table = Store.getById(Store.KEYS.tables, binding.tableId)
    if (!table) {
      this.setData({ hasBinding: false, activeTable: null, filteredMenu: [] })
      util.toast('桌台不存在，请重新选择')
      setTimeout(() => {
        Store.clearUserTable(token)
        wx.redirectTo({
          url: `/pages/user/table-bind/table-bind?venueId=${venueId}`,
        })
      }, 800)
      return
    }

    this.setData({ activeTableId: table.id, hasBinding: true })
    // 检查是否有进行中的订单
    let order = Store.ordersByVenue(venueId).find(o => o.tableId === table.id && o.status === 'open')
    // 未开台则自动开台
    if (!order && table.status === 'idle') {
      order = Store.create(Store.KEYS.orders, {
        venueId,
        tableId: table.id,
        items: [],
        status: 'open',
        settledAt: null,
      }, { prefix: 'ord' })
      Store.setTableStatus(venueId, table.id, 'occupied')
      util.toast('已自动开台', 'success')
    }
    this.setData({ activeTableId: table.id })
    this.refreshActive()
    this.refreshMenu()
  },

  refreshActive() {
    const id = this.data.activeTableId
    if (!id) return
    const table = Store.getById(Store.KEYS.tables, id)
    const order = Store.ordersByVenue(this.data.venueId).find(o => o.tableId === id && o.status === 'open')
    const items = order ? (order.items || []).map((it, idx) => Object.assign({}, it, { idx, priceStr: fmtMoney(it.price) })) : []
    const total = items.reduce((s, it) => s + it.price * it.qty, 0)
    const activeTable = table ? Object.assign({}, table, {
      statusLabel: STATUS_LABEL[table.status] || table.status,
    }) : null
    this.setData({
      activeTable,
      activeOrderId: order ? order.id : '',
      orderItems: items,
      orderTotalStr: fmtMoney(total),
    })
  },

  // ====== 菜单 ======
  refreshMenu() {
    const menu = Store.menuByVenue(this.data.venueId)
    const cats = [...new Set(menu.map(m => m.category).filter(Boolean))]
    let cat = this.data.cat
    if (!cat || !cats.includes(cat)) cat = ''
    const filtered = (cat ? menu.filter(m => m.category === cat) : menu)
      .map(m => Object.assign({}, m, { priceStr: fmtMoney(m.price) }))
    this.setData({ cats, cat, filteredMenu: filtered })
  },

  setCat(e) {
    this.setData({ cat: e.currentTarget.dataset.cat })
    this.refreshMenu()
  },

  // 加单
  addToOrder(e) {
    if (!this.data.activeOrderId) { util.toast('请先开台'); return }
    const id = e.currentTarget.dataset.id
    const item = Store.getById(Store.KEYS.menu, id)
    if (!item || !item.available || item.stock <= 0) { util.toast('该菜品不可点'); return }
    const order = Store.getById(Store.KEYS.orders, this.data.activeOrderId)
    const existing = (order.items || []).find(it => it.itemId === id)
    if (existing) existing.qty += 1
    else (order.items = order.items || []).push({ itemId: id, name: item.name, price: item.price, qty: 1, notes: '' })
    Store.update(Store.KEYS.menu, id, { stock: item.stock - 1 })
    Store.update(Store.KEYS.orders, order.id, { items: order.items })
    util.toast(`已加入 ${item.name}`, 'success')
    this.refresh()
  },

  incQty(e) {
    const idx = Number(e.currentTarget.dataset.idx)
    const order = Store.getById(Store.KEYS.orders, this.data.activeOrderId)
    const it = order.items[idx]
    if (!it) return
    const m = Store.getById(Store.KEYS.menu, it.itemId)
    if (m && m.stock <= 0) { util.toast('库存不足'); return }
    it.qty += 1
    if (m) Store.update(Store.KEYS.menu, m.id, { stock: Math.max(0, m.stock - 1) })
    Store.update(Store.KEYS.orders, order.id, { items: order.items })
    this.refresh()
  },

  decQty(e) {
    const idx = Number(e.currentTarget.dataset.idx)
    const order = Store.getById(Store.KEYS.orders, this.data.activeOrderId)
    const it = order.items[idx]
    if (!it) return
    const m = Store.getById(Store.KEYS.menu, it.itemId)
    it.qty -= 1
    if (m) Store.update(Store.KEYS.menu, m.id, { stock: m.stock + 1 })
    if (it.qty <= 0) order.items.splice(idx, 1)
    Store.update(Store.KEYS.orders, order.id, { items: order.items })
    this.refresh()
  },

  removeItem(e) {
    const idx = Number(e.currentTarget.dataset.idx)
    const order = Store.getById(Store.KEYS.orders, this.data.activeOrderId)
    const it = order.items[idx]
    if (!it) return
    const m = Store.getById(Store.KEYS.menu, it.itemId)
    if (m) Store.update(Store.KEYS.menu, m.id, { stock: m.stock + it.qty })
    order.items.splice(idx, 1)
    Store.update(Store.KEYS.orders, order.id, { items: order.items })
    this.refresh()
  },

  cancelOrder() {
    wx.showModal({
      title: '确认撤单',
      content: '确认撤销此订单？所有菜品库存将归还。',
      confirmColor: '#ef4444',
      success: res => {
        if (!res.confirm) return
        const order = Store.getById(Store.KEYS.orders, this.data.activeOrderId)
        if (order) {
          (order.items || []).forEach(it => {
            const m = Store.getById(Store.KEYS.menu, it.itemId)
            if (m) Store.update(Store.KEYS.menu, m.id, { stock: m.stock + it.qty })
          })
          Store.update(Store.KEYS.orders, order.id, { status: 'cancelled', settledAt: Date.now() })
        }
        if (this.data.activeTableId) Store.setTableStatus(this.data.venueId, this.data.activeTableId, 'idle')
        this.setData({ activeOrderId: '' })
        util.toast('订单已撤销', 'success')
        this.refresh()
      },
    })
  },

  goBill() {
    if (!this.data.activeOrderId) { util.toast('当前无订单'); return }
    wx.redirectTo({ url: `/pages/user/billing/billing?venueId=${this.data.venueId}` })
  },
})
