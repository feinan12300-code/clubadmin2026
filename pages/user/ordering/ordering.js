// ordering.js — 用户端点单：左右分栏布局 + 底部弹窗订单详情
const app = getApp()
const Store = require('../../../utils/store.js')
const util = require('../../../utils/util.js')

const TYPE_LABEL = { round: '圆桌', square: '方桌', booth: '卡座', bar: '吧台' }
const STATUS_LABEL = { idle: '空闲', occupied: '使用中', reserved: '预留' }

// 分类 emoji 映射
const CAT_EMOJI = {
  '酒水': '🍺', '鸡尾酒': '🍸', '烈酒': '🥃', '小食': '🍟',
  '套餐': '🍱', '果盘': '🍇', '热饮': '☕', '冷饮': '🧊',
}
const DEFAULT_EMOJI = '🍹'

function fmtMoney(n) { return Number(n || 0).toFixed(2) }

Page({
  data: {
    venueId: '',
    venueName: '',
    activeTableId: '',
    activeTable: null,        // 当前桌台（含 typeLabel/statusLabel）
    activeOrderId: '',
    hasBinding: false,
    // 菜单：分类列表 + 当前分类菜品
    cats: [],
    cat: '',
    menuList: [],            // 当前分类下的菜品
    // 订单明细（用于底部弹窗）
    orderItems: [],           // [{ itemId, name, price, qty, notes, priceStr, subtotalStr }]
    orderTotalStr: '0.00',
    orderCount: 0,
    sheetOpen: false,         // 订单明细弹窗是否展开
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
    if (!venueId) { this.setData({ menuList: [] }); return }

    // 读取绑定的桌台
    const token = app.getToken()
    const binding = Store.getUserTable(token)
    if (!binding || binding.venueId !== venueId) {
      this.setData({ hasBinding: false, activeTable: null, menuList: [] })
      util.toast('请先选择桌位')
      setTimeout(() => {
        wx.redirectTo({ url: '/pages/user/table-bind/table-bind?venueId=' + venueId })
      }, 800)
      return
    }

    const table = Store.getById(Store.KEYS.tables, binding.tableId)
    if (!table) {
      this.setData({ hasBinding: false, activeTable: null, menuList: [] })
      util.toast('桌台不存在，请重新选择')
      setTimeout(() => {
        Store.clearUserTable(token)
        wx.redirectTo({ url: '/pages/user/table-bind/table-bind?venueId=' + venueId })
      }, 800)
      return
    }

    this.setData({ activeTableId: table.id, hasBinding: true })

    // 自动开台：绑定时桌台已置 occupied，但若无 open 订单则创建一个
    let order = Store.ordersByVenue(venueId).find(o => o.tableId === table.id && o.status === 'open')
    if (!order) {
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

    this.refreshActive()
    this.refreshMenu()
  },

  // 刷新桌台 + 订单明细
  refreshActive() {
    const id = this.data.activeTableId
    if (!id) return
    const table = Store.getById(Store.KEYS.tables, id)
    const order = Store.ordersByVenue(this.data.venueId).find(o => o.tableId === id && o.status === 'open')
    const items = order ? (order.items || []).map((it, idx) => Object.assign({}, it, {
      idx,
      priceStr: fmtMoney(it.price),
      subtotalStr: fmtMoney(it.price * it.qty),
    })) : []
    const total = items.reduce((s, it) => s + it.price * it.qty, 0)
    const count = items.reduce((s, it) => s + it.qty, 0)
    const activeTable = table ? Object.assign({}, table, {
      typeLabel: TYPE_LABEL[table.type] || table.type,
      statusLabel: STATUS_LABEL[table.status] || table.status,
    }) : null
    this.setData({
      activeTable,
      activeOrderId: order ? order.id : '',
      orderItems: items,
      orderTotalStr: fmtMoney(total),
      orderCount: count,
    })
  },

  // 刷新菜单：按分类分组，标注已点数量
  refreshMenu() {
    const all = Store.menuByVenue(this.data.venueId)
    const cats = [...new Set(all.map(m => m.category).filter(Boolean))]
    let cat = this.data.cat
    if (!cat || !cats.includes(cat)) cat = cats[0] || ''
    // 获取当前订单中的菜品数量映射
    const order = this.data.activeOrderId
      ? Store.getById(Store.KEYS.orders, this.data.activeOrderId)
      : null
    const inOrderMap = {}
    ;(order && order.items || []).forEach(it => { inOrderMap[it.itemId] = it.qty })
    const filtered = (cat ? all.filter(m => m.category === cat) : all)
      .map(m => Object.assign({}, m, {
        priceStr: fmtMoney(m.price),
        disabled: !m.available || m.stock <= 0,
        inOrder: inOrderMap[m.id] || 0,
        emoji: CAT_EMOJI[m.category] || DEFAULT_EMOJI,
      }))
    this.setData({ cats, cat, menuList: filtered })
  },

  // 切换分类
  setCat(e) {
    this.setData({ cat: e.currentTarget.dataset.cat })
    this.refreshMenu()
  },

  // 加菜：加号按钮
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
    this.refreshActive()
    this.refreshMenu()
  },

  // 减菜：底部弹窗中数量减号
  minusItem(e) {
    const idx = Number(e.currentTarget.dataset.idx)
    const order = Store.getById(Store.KEYS.orders, this.data.activeOrderId)
    const it = order.items[idx]
    if (!it) return
    const m = Store.getById(Store.KEYS.menu, it.itemId)
    it.qty -= 1
    if (m) Store.update(Store.KEYS.menu, m.id, { stock: m.stock + 1 })
    if (it.qty <= 0) order.items.splice(idx, 1)
    Store.update(Store.KEYS.orders, order.id, { items: order.items })
    this.refreshActive()
    this.refreshMenu()
  },

  // 跳转选择桌位
  goBind() {
    wx.redirectTo({ url: '/pages/user/table-bind/table-bind?venueId=' + this.data.venueId })
  },

  // 返回门店列表
  onBack() {
    wx.reLaunch({ url: '/pages/user/venue/venue' })
  },

  // 弹窗：展开订单明细
  openSheet() {
    if (!this.data.activeOrderId || this.data.orderItems.length === 0) {
      util.toast('当前订单为空')
      return
    }
    this.setData({ sheetOpen: true })
  },
  closeSheet() {
    this.setData({ sheetOpen: false })
  },
  catchSheetTap() {
    // 阻止遮罩层点击冒泡到背景
  },

  // 跳转结算
  goBill() {
    if (!this.data.activeOrderId) { util.toast('当前无订单'); return }
    if (this.data.orderItems.length === 0) { util.toast('订单为空，请先点单'); return }
    wx.redirectTo({ url: '/pages/user/billing/billing?venueId=' + this.data.venueId })
  },
})
