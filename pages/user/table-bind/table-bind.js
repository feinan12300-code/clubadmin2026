// table-bind.js — 用户进入门店后绑定空闲桌台
// 约束：一个用户同时只能绑定一个桌台，已绑定者不允许重复选择
const app = getApp()
const Store = require('../../../utils/store.js')
const util = require('../../../utils/util.js')

// 桌型显示名
const TYPE_LABEL = {
  round: '圆桌',
  square: '方桌',
  booth: '卡座',
  bar: '吧台',
}

Page({
  data: {
    venueId: '',
    venueName: '',
    tables: [],     // 空闲桌台列表
    boundTableId: '', // 已绑定的桌台（如有）
    boundTableName: '', // 已绑定桌台名（用于展示）
    boundTableType: '', // 已绑定桌台类型
    hasBinding: false,  // 是否已有绑定（与当前门店一致时为 true）
  },

  onLoad(options) {
    const venueId = options.venueId || app.getCurrentVenueId()
    const venue = Store.getById(Store.KEYS.venues, venueId)
    wx.setNavigationBarTitle({ title: venue ? venue.name : '选择桌位' })
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
    if (!venueId) { this.setData({ tables: [] }); return }
    const token = app.getToken()
    const bound = Store.getUserTable(token)
    const hasBinding = !!(bound && bound.venueId === venueId)
    // 空闲桌台：已绑定者其本身桌台已置 occupied，自然不会出现在列表里
    const tables = Store.tablesByVenue(venueId)
      .filter(t => t.status === 'idle')
      .slice()
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
      .map(t => Object.assign({}, t, {
        typeLabel: TYPE_LABEL[t.type] || t.type,
      }))

    let boundTableName = '', boundTableType = ''
    if (hasBinding) {
      const t = Store.getById(Store.KEYS.tables, bound.tableId)
      boundTableName = t ? t.name : '?'
      boundTableType = t ? (TYPE_LABEL[t.type] || t.type) : ''
    }

    this.setData({
      tables,
      hasBinding,
      boundTableId: hasBinding ? bound.tableId : '',
      boundTableName,
      boundTableType,
    })
  },

  // 绑定桌台 — 添加重复绑定检查：已绑定则不允许重复选择
  bindTable(e) {
    const id = e.currentTarget.dataset.id
    const table = Store.getById(Store.KEYS.tables, id)
    if (!table) { util.toast('桌台不存在'); return }
    if (table.status !== 'idle') { util.toast('该桌台已被占用'); return }
    const token = app.getToken()
    if (!token) { util.toast('请先登录'); return }

    // 检查是否已绑定桌台（同一门店）
    const existing = Store.getUserTable(token)
    if (existing && existing.venueId === this.data.venueId) {
      const boundTable = Store.getById(Store.KEYS.tables, existing.tableId)
      const boundName = boundTable ? boundTable.name : '?'
      wx.showModal({
        title: '您已绑定桌台',
        content: '您当前已绑定「' + boundName + '」，无法重复选择\n如需更换，请先在下方解除绑定',
        confirmText: '去点单',
        cancelText: '知道了',
        success: (res) => {
          if (res.confirm) {
            wx.reLaunch({
              url: '/pages/user/ordering/ordering?venueId=' + this.data.venueId,
            })
          }
        },
      })
      return
    }

    Store.setUserTable(token, this.data.venueId, id)
    util.toast('已绑定 ' + (table.name || ''), 'success')
    // 绑定后直接进入点单页（座位图入口已移至门店列表页）
    setTimeout(() => {
      wx.reLaunch({
        url: '/pages/user/ordering/ordering?venueId=' + this.data.venueId,
      })
    }, 600)
  },

  // 已绑定后直接去点单
  goOrdering() {
    wx.reLaunch({
      url: '/pages/user/ordering/ordering?venueId=' + this.data.venueId,
    })
  },

  // 解除绑定：clearUserTable 会同步释放桌台为 idle
  switchTable() {
    const token = app.getToken()
    Store.clearUserTable(token)
    this.setData({ boundTableId: '', hasBinding: false, boundTableName: '', boundTableType: '' })
    util.toast('已解除绑定，请重新选择', 'none')
    this.refresh()
  },
})
