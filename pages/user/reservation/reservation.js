const app = getApp()
const Store = require('../../../utils/store.js')
const util = require('../../../utils/util.js')

const STATUS_LABEL = {
  pending: '待确认',
  seated: '已到店',
  cancelled: '已取消',
  noshow: '未到',
}

Page({
  data: {
    venueId: '',
    venueName: '',
    isAdmin: false,
    date: '',
    reservations: [],
    // 表单（不再含 tableId：台位由管理端指派）
    formShow: false,
    formId: '',
    form: { customerName: '', wechat: '', phone: '', date: '', time: '20:00', partySize: 2, notes: '' },
  },

  onLoad(options) {
    const venueId = options.venueId || app.getCurrentVenueId()
    const venue = Store.getById(Store.KEYS.venues, venueId)
    this.setData({
      venueId,
      venueName: venue ? venue.name : '',
      date: util.today(),
      isAdmin: app.getRole() === 'admin',
    })
  },

  onShow() {
    this.refresh()
  },

  onDateChange(e) {
    this.setData({ date: e.detail.value })
    this.refresh()
  },

  refresh() {
    const venueId = this.data.venueId
    if (!venueId) { this.setData({ reservations: [] }); return }
    const list = Store.reservationsByVenue(venueId)
      .filter(r => r.date === this.data.date)
      .sort((a, b) => (a.time || '').localeCompare(b.time || ''))
      .map(r => {
        const t = r.tableId ? Store.getById(Store.KEYS.tables, r.tableId) : null
        return Object.assign({}, r, {
          statusLabel: STATUS_LABEL[r.status] || r.status,
          tableName: t ? t.name : '',
        })
      })
    this.setData({ reservations: list })
  },

  // ====== 表单 ======
  onInput(e) {
    const key = e.currentTarget.dataset.key
    let v = e.detail.value
    if (key === 'partySize') v = Number(v) || 0
    this.setData({ [`form.${key}`]: v })
  },

  onFormDate(e) {
    this.setData({ 'form.date': e.detail.value })
  },

  onFormTime(e) {
    this.setData({ 'form.time': e.detail.value })
  },

  // 人数步进器
  onInc() {
    const v = Number(this.data.form.partySize) || 1
    if (v >= 50) { util.toast('人数上限 50'); return }
    this.setData({ 'form.partySize': v + 1 })
  },
  onDec() {
    const v = Number(this.data.form.partySize) || 1
    if (v <= 1) return
    this.setData({ 'form.partySize': v - 1 })
  },

  openAdd() {
    this.setData({
      formShow: true,
      formId: '',
      form: { customerName: '', wechat: '', phone: '', date: this.data.date, time: '20:00', partySize: 2, notes: '' },
    })
  },

  openEdit(e) {
    const id = e.currentTarget.dataset.id
    const r = Store.getById(Store.KEYS.reservations, id)
    if (!r) return
    this.setData({
      formShow: true,
      formId: id,
      form: {
        customerName: r.customerName || '',
        wechat: r.wechat || '',
        phone: r.phone || '',
        date: r.date || this.data.date,
        time: r.time || '20:00',
        partySize: r.partySize || 2,
        notes: r.notes || '',
      },
    })
  },

  closeForm() { this.setData({ formShow: false }) },

  onSave() {
    const f = this.data.form
    if (!f.customerName.trim()) { util.toast('请填写贵姓'); return }
    if (!f.wechat.trim()) { util.toast('请填写微信号'); return }
    if (!f.date || !f.time) { util.toast('请填写日期和时间'); return }
    if (!f.partySize || f.partySize < 1) { util.toast('请填写有效人数'); return }
    // 台位不在此选择：由管理端在 reservation-notice 指派具体台号
    const data = {
      customerName: f.customerName.trim(),
      wechat: (f.wechat || '').trim(),
      phone: (f.phone || '').trim(),
      date: f.date,
      time: f.time,
      partySize: f.partySize,
      notes: (f.notes || '').trim(),
    }
    if (this.data.formId) {
      Store.update(Store.KEYS.reservations, this.data.formId, data)
      util.toast('预订已更新', 'success')
    } else {
      // 写入用户 token：管理端指派台位时据此绑定到该用户
      const token = app.getToken() || ''
      const r = Store.create(Store.KEYS.reservations, Object.assign({}, data, {
        venueId: this.data.venueId,
        status: 'pending',
        tableId: null, // 待管理端指派
        token,
      }), { prefix: 'res' })
      // 派发到管理端：新预订待指派台位
      const venue = Store.getById(Store.KEYS.venues, this.data.venueId)
      Store.create(Store.KEYS.reservationNotices, {
        venueId: this.data.venueId,
        venueName: venue ? venue.name : '',
        reservationId: r.id,
        token,
        customerName: r.customerName,
        wechat: r.wechat,
        phone: r.phone,
        date: r.date,
        time: r.time,
        partySize: r.partySize,
        tableId: '',
        tableName: '',
        notes: r.notes,
        status: 'pending', // 待指派
        createdAt: Date.now(),
      }, { prefix: 'rn', noTimestamp: true })
      util.toast('预订已提交，等待门店指派台位', 'success')
    }
    this.setData({ formShow: false })
    this.refresh()
  },

  onSeat(e) {
    const id = e.currentTarget.dataset.id
    const r = Store.getById(Store.KEYS.reservations, id)
    if (!r) return
    Store.update(Store.KEYS.reservations, id, { status: 'seated' })
    if (r.tableId) Store.setTableStatus(this.data.venueId, r.tableId, 'occupied')
    util.toast('已标记到店入座', 'success')
    this.refresh()
  },

  onCancel(e) {
    const id = e.currentTarget.dataset.id
    const r = Store.getById(Store.KEYS.reservations, id)
    if (!r) return
    wx.showModal({
      title: '确认取消',
      content: '确认取消此预订？',
      success: res => {
        if (!res.confirm) return
        Store.update(Store.KEYS.reservations, id, { status: 'cancelled' })
        if (r.tableId) {
          const stillReserved = Store.reservationsByVenue(this.data.venueId)
            .some(x => x.id !== id && x.tableId === r.tableId && x.status === 'pending')
          if (!stillReserved) Store.setTableStatus(this.data.venueId, r.tableId, 'idle')
        }
        util.toast('预订已取消', 'success')
        this.refresh()
      },
    })
  },

  onNohow(e) {
    const id = e.currentTarget.dataset.id
    const r = Store.getById(Store.KEYS.reservations, id)
    if (!r) return
    Store.update(Store.KEYS.reservations, id, { status: 'noshow' })
    if (r.tableId) {
      const stillReserved = Store.reservationsByVenue(this.data.venueId)
        .some(x => x.id !== id && x.tableId === r.tableId && x.status === 'pending')
      if (!stillReserved) Store.setTableStatus(this.data.venueId, r.tableId, 'idle')
    }
    util.toast('已标记未到', 'none')
    this.refresh()
  },
})
