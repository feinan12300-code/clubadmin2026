const app = getApp()
const Store = require('../../../utils/store.js')
const util = require('../../../utils/util.js')

// 台位类型选项
const TABLE_TYPES = [
  { key: 'round',  name: '圆桌' },
  { key: 'square', name: '方桌' },
  { key: 'booth',  name: '卡座' },
  { key: 'bar',    name: '吧台' },
]

Page({
  data: {
    venues: [],
    cashCount: 0,
    reservationCount: 0,
    formShow: false,
    formId: '',
    form: { name: '', address: '', phone: '', openHours: '' },
    // 台位管理
    tables: [],
    tableTypes: TABLE_TYPES,
    tableFormShow: false,
    tableForm: { name: '', typeIdx: 0, capacity: '' },
  },

  onShow() {
    this.refresh()
  },

  refresh() {
    const venues = Store.list(Store.KEYS.venues).map(v => {
      const tableCount = Store.tablesByVenue(v.id).length
      const menuCount = Store.menuByVenue(v.id).length
      return Object.assign({}, v, { tableCount, menuCount })
    })
    const cashCount = Store.list(Store.KEYS.cashNotices).filter(n => n.status === 'pending').length
    const reservationCount = Store.list(Store.KEYS.reservationNotices).filter(n => n.status !== 'handled').length
    this.setData({ venues, cashCount, reservationCount })
  },

  goCashNotice() {
    wx.navigateTo({ url: '/pages/admin/cash-notice/cash-notice' })
  },

  goReservationNotice() {
    wx.navigateTo({ url: '/pages/admin/reservation-notice/reservation-notice' })
  },

  onInput(e) {
    const key = e.currentTarget.dataset.key
    this.setData({ [`form.${key}`]: e.detail.value })
  },

  openAdd() {
    this.setData({
      formShow: true,
      formId: '',
      form: { name: '', address: '', phone: '', openHours: '' },
      tables: [],
      tableFormShow: false,
      tableForm: { name: '', typeIdx: 0, capacity: '' },
    })
  },

  openEdit(e) {
    const id = e.currentTarget.dataset.id
    const v = Store.getById(Store.KEYS.venues, id)
    if (!v) return
    this.setData({
      formShow: true,
      formId: id,
      form: { name: v.name || '', address: v.address || '', phone: v.phone || '', openHours: v.openHours || '' },
      tables: Store.tablesByVenue(id),
      tableFormShow: false,
      tableForm: { name: '', typeIdx: 0, capacity: '' },
    })
  },

  closeForm() { this.setData({ formShow: false }) },

  onSave() {
    const { name, address, phone, openHours } = this.data.form
    if (!name.trim()) { util.toast('请填写门店名称', 'none'); return }
    const data = { name: name.trim(), address: address.trim(), phone: phone.trim(), openHours: openHours.trim() }
    if (this.data.formId) {
      Store.update(Store.KEYS.venues, this.data.formId, data)
      util.toast('门店已更新', 'success')
    } else {
      Store.create(Store.KEYS.venues, data, { prefix: 'ven' })
      util.toast('门店已创建', 'success')
    }
    this.setData({ formShow: false })
    this.refresh()
  },

  // ============ 台位增删 ============
  openTableForm() {
    this.setData({
      tableFormShow: true,
      tableForm: { name: '', typeIdx: 0, capacity: '' },
    })
  },

  closeTableForm() {
    this.setData({ tableFormShow: false })
  },

  onTableInput(e) {
    const key = e.currentTarget.dataset.key
    this.setData({ [`tableForm.${key}`]: e.detail.value })
  },

  onTableType(e) {
    this.setData({ 'tableForm.typeIdx': Number(e.detail.value) })
  },

  addTable() {
    const { name, typeIdx, capacity } = this.data.tableForm
    const trimmedName = (name || '').trim()
    if (!trimmedName) { util.toast('请填写台位名称', 'none'); return }
    const cap = parseInt(capacity, 10)
    if (!cap || cap < 1) { util.toast('请填写有效容纳人数', 'none'); return }
    const typeKey = TABLE_TYPES[typeIdx].key
    Store.create(Store.KEYS.tables, {
      venueId: this.data.formId,
      name: trimmedName,
      type: typeKey,
      capacity: cap,
      status: 'idle',
    }, { prefix: 'tbl' })
    util.toast('台位已添加', 'success')
    this.setData({
      tables: Store.tablesByVenue(this.data.formId),
      tableFormShow: false,
      tableForm: { name: '', typeIdx: 0, capacity: '' },
    })
  },

  removeTable(e) {
    const id = e.currentTarget.dataset.id
    const t = Store.getById(Store.KEYS.tables, id)
    if (!t) return
    // 占用中的台位不允许删除
    if (t.status === 'occupied') {
      util.toast('该台位正在被使用，无法删除', 'none')
      return
    }
    wx.showModal({
      title: '确认删除',
      content: `确认删除台位「${t.name}」？`,
      confirmColor: '#ef4444',
      success: res => {
        if (!res.confirm) return
        Store.remove(Store.KEYS.tables, id)
        util.toast('台位已删除', 'success')
        this.setData({ tables: Store.tablesByVenue(this.data.formId) })
      },
    })
  },

  enterSeatmap(e) {
    const id = e.currentTarget.dataset.id
    app.setCurrentVenue(id)
    wx.navigateTo({
      url: `/pages/admin/seatmap/seatmap?venueId=${id}`,
    })
  },

  onDelete(e) {
    const id = e.currentTarget.dataset.id
    const v = Store.getById(Store.KEYS.venues, id)
    if (!v) return
    wx.showModal({
      title: '确认删除',
      content: `确认删除门店「${v.name}」？该门店下的所有桌台、菜单、订单也将一并删除。`,
      confirmColor: '#ef4444',
      success: res => {
        if (!res.confirm) return
        Store.list(Store.KEYS.tables).filter(t => t.venueId === id).forEach(t => Store.remove(Store.KEYS.tables, t.id))
        Store.list(Store.KEYS.menu).filter(m => m.venueId === id).forEach(m => Store.remove(Store.KEYS.menu, m.id))
        Store.list(Store.KEYS.orders).filter(o => o.venueId === id).forEach(o => Store.remove(Store.KEYS.orders, o.id))
        Store.list(Store.KEYS.reservations).filter(r => r.venueId === id).forEach(r => Store.remove(Store.KEYS.reservations, r.id))
        Store.list(Store.KEYS.settlements).filter(s => s.venueId === id).forEach(s => Store.remove(Store.KEYS.settlements, s.id))
        Store.remove(Store.KEYS.venues, id)
        util.toast('门店已删除', 'success')
        this.refresh()
      },
    })
  },

  backToIndex() {
    wx.reLaunch({ url: '/pages/index/index' })
  },
})
