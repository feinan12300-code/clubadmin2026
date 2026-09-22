const app = getApp()
const Store = require('../../../utils/store.js')
const util = require('../../../utils/util.js')

Page({
  data: {
    venues: [],
    cashCount: 0,
    formShow: false,
    formId: '',
    form: { name: '', address: '', phone: '', openHours: '' },
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
    this.setData({ venues, cashCount })
  },

  goCashNotice() {
    wx.navigateTo({ url: '/pages/admin/cash-notice/cash-notice' })
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
