const app = getApp()
const Store = require('../../../utils/store.js')
const util = require('../../../utils/util.js')

const STATUS_LABEL = {
  pending: '待确认',
  seated: '已到店',
  cancelled: '已取消',
  noshow: '未到',
}
const TYPE_LABEL = { round: '圆桌', square: '方桌', booth: '卡座', bar: '吧台' }

Page({
  data: {
    venueId: '',
    venueName: '',
    isAdmin: false,
    date: '',
    reservations: [],
    // 表单
    formShow: false,
    formId: '',
    form: { customerName: '', wechat: '', phone: '', date: '', time: '20:00', partySize: 2, tableId: '', notes: '' },
    tableLabels: [],
    tableIndex: 0,
    tableOptions: [],
    recommendHint: '',
    recommendClass: '',
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
    if (key === 'partySize') this.updateRecommend()
  },

  onFormDate(e) {
    this.setData({ 'form.date': e.detail.value })
    this.rebuildTableOptions()
    this.updateRecommend()
  },

  onFormTime(e) {
    this.setData({ 'form.time': e.detail.value })
  },

  // 桌台列表
  rebuildTableOptions() {
    const tables = Store.tablesByVenue(this.data.venueId)
    const formDate = this.data.form.date || this.data.date
    const busyTableIds = Store.reservationsByVenue(this.data.venueId)
      .filter(x => x.id !== this.data.formId && x.date === formDate && x.status === 'pending' && x.tableId)
      .map(x => x.tableId)
    const options = [{ id: '', label: '— 不指派 —' }]
    tables.forEach(t => {
      const busy = busyTableIds.includes(t.id)
      options.push({
        id: t.id,
        label: `${t.name} (${TYPE_LABEL[t.type] || t.type}/${t.capacity}人)${busy ? ' [同时段已订]' : ''}`,
        busy,
      })
    })
    const labels = options.map(o => o.label)
    let idx = options.findIndex(o => o.id === this.data.form.tableId)
    if (idx < 0) idx = 0
    this.setData({
      tableOptions: options,
      tableLabels: labels,
      tableIndex: idx,
    })
  },

  onTablePick(e) {
    const idx = Number(e.detail.value)
    const opt = this.data.tableOptions[idx]
    this.setData({ tableIndex: idx, 'form.tableId': opt ? opt.id : '' })
  },

  // 智能推荐
  updateRecommend(apply) {
    const party = Number(this.data.form.partySize) || 0
    if (!party) { this.setData({ recommendHint: '', recommendClass: '' }); return }
    const tables = Store.tablesByVenue(this.data.venueId)
    const formDate = this.data.form.date || this.data.date
    const busyTableIds = Store.reservationsByVenue(this.data.venueId)
      .filter(x => x.date === formDate && x.status === 'pending' && x.tableId)
      .map(x => x.tableId)
    const candidates = tables
      .filter(t => !busyTableIds.includes(t.id) && t.capacity >= party)
      .sort((a, b) => a.capacity - b.capacity)

    if (candidates.length === 0) {
      const any = tables.filter(t => !busyTableIds.includes(t.id)).sort((a, b) => a.capacity - b.capacity)
      if (any.length === 0) {
        this.setData({ recommendHint: '⚠ 无可用桌台', recommendClass: 'err' })
      } else {
        this.setData({
          recommendHint: `⚠ 无容量≥${party}的桌台，最小容量 ${any[0].capacity}人`,
          recommendClass: 'warn',
        })
        if (apply) {
          const idx = this.data.tableOptions.findIndex(o => o.id === any[0].id)
          this.setData({ tableIndex: idx, 'form.tableId': any[0].id })
          util.toast(`已推荐 ${any[0].name}（容量不足，请确认）`, 'none')
        }
      }
      return
    }
    const best = candidates[0]
    this.setData({
      recommendHint: `✓ 推荐：${best.name}（${best.capacity}人，${TYPE_LABEL[best.type] || best.type}）`,
      recommendClass: 'ok',
    })
    if (apply) {
      const idx = this.data.tableOptions.findIndex(o => o.id === best.id)
      this.setData({ tableIndex: idx, 'form.tableId': best.id })
      util.toast(`已推荐 ${best.name}`, 'success')
    }
  },

  onRecommend() { this.updateRecommend(true) },

  openAdd() {
    this.setData({
      formShow: true,
      formId: '',
      form: { customerName: '', wechat: '', phone: '', date: this.data.date, time: '20:00', partySize: 2, tableId: '', notes: '' },
      recommendHint: '',
    })
    this.rebuildTableOptions()
    this.updateRecommend()
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
        tableId: r.tableId || '',
        notes: r.notes || '',
      },
    })
    this.rebuildTableOptions()
    this.updateRecommend()
  },

  closeForm() { this.setData({ formShow: false }) },

  onSave() {
    const f = this.data.form
    if (!f.customerName.trim()) { util.toast('请填写贵姓'); return }
    if (!f.wechat.trim()) { util.toast('请填写微信号'); return }
    if (!f.date || !f.time) { util.toast('请填写日期和时间'); return }
    if (!f.partySize || f.partySize < 1) { util.toast('请填写有效人数'); return }
    const data = {
      customerName: f.customerName.trim(),
      wechat: (f.wechat || '').trim(),
      phone: (f.phone || '').trim(),
      date: f.date,
      time: f.time,
      partySize: f.partySize,
      tableId: f.tableId || null,
      notes: (f.notes || '').trim(),
    }
    if (this.data.formId) {
      const old = Store.getById(Store.KEYS.reservations, this.data.formId)
      Store.update(Store.KEYS.reservations, this.data.formId, data)
      // 旧桌台释放
      if (old.tableId && old.tableId !== data.tableId) {
        const stillReserved = Store.reservationsByVenue(this.data.venueId)
          .some(x => x.id !== this.data.formId && x.tableId === old.tableId && x.status === 'pending')
        const oldTable = Store.getById(Store.KEYS.tables, old.tableId)
        if (!stillReserved && oldTable && oldTable.status !== 'occupied') {
          Store.setTableStatus(this.data.venueId, old.tableId, 'idle')
        }
      }
      // 新桌台标记预留
      if (data.tableId) {
        const newTable = Store.getById(Store.KEYS.tables, data.tableId)
        if (newTable && newTable.status !== 'occupied') {
          Store.setTableStatus(this.data.venueId, data.tableId, 'reserved')
        }
      }
      util.toast('预订已更新', 'success')
    } else {
      const r = Store.create(Store.KEYS.reservations, Object.assign({}, data, { venueId: this.data.venueId, status: 'pending' }), { prefix: 'res' })
      if (r.tableId) {
        const t = Store.getById(Store.KEYS.tables, r.tableId)
        if (t && t.status !== 'occupied') Store.setTableStatus(this.data.venueId, r.tableId, 'reserved')
      }
      util.toast('预订已创建', 'success')
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
