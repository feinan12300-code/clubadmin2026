const app = getApp()
const Store = require('../../../utils/store.js')
const util = require('../../../utils/util.js')

const AVAIL_NAMES = ['上架', '下架']
const STATUS_LABEL = { idle: '空闲', occupied: '使用中', reserved: '预留' }

function fmtMoney(n) { return Number(n || 0).toFixed(2) }

Page({
  data: {
    venueId: '',
    venueName: '',
    isAdmin: false,
    tables: [],
    activeTableId: '',
    activeTable: null,
    activeOrderId: '',
    orderItems: [],
    orderTotalStr: '0.00',
    // 菜单
    cats: [],
    cat: '',
    filteredMenu: [],
    // 菜品管理
    mgrShow: false,
    menuList: [],
    itemFormShow: false,
    itemId: '',
    itemForm: { name: '', category: '', price: 0, stock: 50, available: true },
    availIndex: 0,
    availNames: AVAIL_NAMES,
  },

  onLoad(options) {
    const venueId = options.venueId || app.getCurrentVenueId()
    const venue = Store.getById(Store.KEYS.venues, venueId)
    this.setData({
      venueId,
      venueName: venue ? venue.name : '',
      isAdmin: app.getRole() === 'admin',
    })
  },
  onShow() {
    this.refresh()
  },

  refresh() {
    const venueId = this.data.venueId
    if (!venueId) { this.setData({ tables: [], filteredMenu: [] }); return }
    // 桌台列表
    const orders = Store.ordersByVenue(venueId).filter(o => o.status === 'open')
    const tableOrderMap = {}
    orders.forEach(o => { tableOrderMap[o.tableId] = o })
    const tables = Store.tablesByVenue(venueId).slice().sort((a, b) => (a.name || '').localeCompare(b.name || ''))
      .map(t => {
        const o = tableOrderMap[t.id]
        const total = o ? (o.items || []).reduce((s, it) => s + it.price * it.qty, 0) : 0
        const hasOpen = !!o
        const statusTag = hasOpen ? 'occupied' : t.status
        return Object.assign({}, t, {
          statusTag,
          statusLabel: hasOpen ? '使用中' : (STATUS_LABEL[t.status] || t.status),
          total,
          totalStr: fmtMoney(total),
        })
      })
    this.setData({ tables })
    // 维持选中桌台
    if (this.data.activeTableId) {
      this.refreshActive()
    }
    this.refreshMenu()
  },

  // 选中桌台
  selectTable(e) {
    const id = e.currentTarget.dataset.id
    this.setData({ activeTableId: id })
    this.refreshActive()
  },

  refreshActive() {
    const id = this.data.activeTableId
    const table = Store.getById(Store.KEYS.tables, id)
    const order = Store.ordersByVenue(this.data.venueId).find(o => o.tableId === id && o.status === 'open')
    const items = order ? (order.items || []).map((it, idx) => Object.assign({}, it, { idx, priceStr: fmtMoney(it.price) })) : []
    const total = items.reduce((s, it) => s + it.price * it.qty, 0)
    this.setData({
      activeTable: table,
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

  // 开台
  openTable() {
    const order = Store.create(Store.KEYS.orders, {
      venueId: this.data.venueId,
      tableId: this.data.activeTableId,
      items: [],
      status: 'open',
      settledAt: null,
    }, { prefix: 'ord' })
    Store.setTableStatus(this.data.venueId, this.data.activeTableId, 'occupied')
    this.setData({ activeOrderId: order.id })
    util.toast('已开台，请点单', 'success')
    this.refresh()
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

  // ====== 菜品管理 ======
  openMenuMgr() {
    this.setData({ mgrShow: true })
    this.refreshMenuList()
  },
  closeMgr() { this.setData({ mgrShow: false }) },
  refreshMenuList() {
    const menuList = Store.menuByVenue(this.data.venueId)
      .map(m => Object.assign({}, m, { priceStr: fmtMoney(m.price) }))
    this.setData({ menuList })
  },

  onItemInput(e) {
    const key = e.currentTarget.dataset.key
    let v = e.detail.value
    if (key === 'price') v = Number(v) || 0
    if (key === 'stock') v = Number(v) || 0
    this.setData({ [`itemForm.${key}`]: v })
  },

  onItemAvail(e) {
    const idx = Number(e.detail.value)
    this.setData({ availIndex: idx, 'itemForm.available': idx === 0 })
  },

  openItemAdd() {
    this.setData({
      itemFormShow: true,
      itemId: '',
      itemForm: { name: '', category: '', price: 0, stock: 50, available: true },
      availIndex: 0,
    })
  },

  openItemEdit(e) {
    const id = e.currentTarget.dataset.id
    const m = Store.getById(Store.KEYS.menu, id)
    if (!m) return
    this.setData({
      itemFormShow: true,
      itemId: id,
      itemForm: { name: m.name || '', category: m.category || '', price: m.price || 0, stock: m.stock || 0, available: !!m.available },
      availIndex: m.available ? 0 : 1,
    })
  },

  closeItemForm() { this.setData({ itemFormShow: false }) },

  saveItem() {
    const f = this.data.itemForm
    if (!f.name.trim()) { util.toast('请填写名称'); return }
    const data = {
      name: f.name.trim(),
      category: (f.category || '').trim() || '未分类',
      price: Math.max(0, Number(f.price) || 0),
      stock: Math.max(0, Number(f.stock) || 0),
      available: !!f.available,
    }
    if (this.data.itemId) {
      Store.update(Store.KEYS.menu, this.data.itemId, data)
      util.toast('菜品已更新', 'success')
    } else {
      Store.create(Store.KEYS.menu, Object.assign({ venueId: this.data.venueId }, data), { prefix: 'menu' })
      util.toast('菜品已新增', 'success')
    }
    this.setData({ itemFormShow: false })
    this.refreshMenuList()
    this.refreshMenu()
  },

  onDeleteItem(e) {
    const id = e.currentTarget.dataset.id
    const m = Store.getById(Store.KEYS.menu, id)
    if (!m) return
    wx.showModal({
      title: '确认删除',
      content: `确认删除菜品「${m.name}」？`,
      confirmColor: '#ef4444',
      success: res => {
        if (!res.confirm) return
        Store.remove(Store.KEYS.menu, id)
        util.toast('已删除', 'success')
        this.refreshMenuList()
        this.refreshMenu()
      },
    })
  },
})
