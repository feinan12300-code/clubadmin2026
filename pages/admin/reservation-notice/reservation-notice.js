// reservation-notice.js — 管理端：查看用户提交的预订通知，指派/复核台位
const app = getApp()
const Store = require('../../../utils/store.js')
const util = require('../../../utils/util.js')

const TYPE_LABEL = { round: '圆桌', square: '方桌', booth: '卡座', bar: '吧台' }

const STATUS_LABEL = {
  pending: '待指派',
  review: '待复核',
  handled: '已处理',
}

function fmtTime(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  const M = String(d.getMonth() + 1).padStart(2, '0')
  const D = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  return `${M}-${D} ${h}:${m}`
}

Page({
  data: {
    notices: [],
    STATUS_LABEL,
    // 指派弹窗
    assignShow: false,
    assignId: '',
    assignVenueId: '',
    assignTableIndex: 0,
    assignTableLabels: [],
    assignTableOptions: [],
  },

  onShow() { this.refresh() },

  refresh() {
    const notices = Store.list(Store.KEYS.reservationNotices).map(n => ({
      ...n,
      statusLabel: STATUS_LABEL[n.status] || n.status,
      createdStr: fmtTime(n.createdAt),
    })).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
    this.setData({ notices })
  },

  // 打开指派台位弹窗
  openAssign(e) {
    const id = e.currentTarget.dataset.id
    const n = Store.list(Store.KEYS.reservationNotices).find(x => x.id === id)
    if (!n) return
    this.setData({
      assignShow: true,
      assignId: id,
      assignVenueId: n.venueId,
    })
    this._rebuildTableOptions(n)
  },

  _rebuildTableOptions(notice) {
    const tables = Store.tablesByVenue(notice.venueId)
    const options = [{ id: '', label: '— 不指派 —' }]
    tables.forEach(t => {
      options.push({
        id: t.id,
        label: `${t.name} (${TYPE_LABEL[t.type] || t.type}/${t.capacity}人)`,
      })
    })
    const labels = options.map(o => o.label)
    let idx = options.findIndex(o => o.id === notice.tableId)
    if (idx < 0) idx = 0
    this.setData({
      assignTableOptions: options,
      assignTableLabels: labels,
      assignTableIndex: idx,
    })
  },

  onTablePick(e) {
    const idx = Number(e.detail.value)
    this.setData({ assignTableIndex: idx })
  },

  // 保存指派
  onAssignSave() {
    const opt = this.data.assignTableOptions[this.data.assignTableIndex] || { id: '' }
    const noticeId = this.data.assignId
    const notice = Store.list(Store.KEYS.reservationNotices).find(x => x.id === noticeId)
    if (!notice) return

    // 释放旧桌台（如有）
    if (notice.tableId && notice.tableId !== opt.id) {
      const stillReserved = Store.reservationsByVenue(notice.venueId)
        .some(x => x.id !== notice.reservationId && x.tableId === notice.tableId && x.status === 'pending')
      if (!stillReserved) Store.setTableStatus(notice.venueId, notice.tableId, 'idle')
    }

    // 更新预订记录的桌台
    Store.update(Store.KEYS.reservations, notice.reservationId, { tableId: opt.id || null })

    // 标记新桌台为预留
    if (opt.id) {
      const t = Store.getById(Store.KEYS.tables, opt.id)
      if (t && t.status !== 'occupied') Store.setTableStatus(notice.venueId, opt.id, 'reserved')
    }

    // 更新通知状态为已处理
    Store.update(Store.KEYS.reservationNotices, noticeId, {
      status: 'handled',
      tableId: opt.id || '',
      tableName: opt.id ? (Store.getById(Store.KEYS.tables, opt.id) || {}).name : '',
    })

    util.toast('已指派台位', 'success')
    this.setData({ assignShow: false })
    this.refresh()
  },

  closeAssign() { this.setData({ assignShow: false }) },

  // 标记已处理（用户已自指派台位，仅复核）
  markHandled(e) {
    const id = e.currentTarget.dataset.id
    Store.update(Store.KEYS.reservationNotices, id, { status: 'handled' })
    util.toast('已标记处理', 'success')
    this.refresh()
  },

  backToVenue() {
    wx.navigateBack({ delta: 1 })
  },
})
