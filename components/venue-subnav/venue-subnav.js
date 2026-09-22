const app = getApp()

// 各端 tab 配置
// 注：座位图入口已移至门店列表页（pages/user/venue 卡片按钮），进入门店后不再展示
// 注：预定排队入口已移至门店列表页（pages/user/venue），进入门店后不再展示
function buildTabs(role) {
  const isAdmin = role === 'admin'
  // 用户端 subnav 只保留 4 个：点单 → 结算 → 订单详情 → 消费记录
  // 管理端仍保留座位图（admin/seatmap）
  const tabs = isAdmin
    ? [{ key: 'seats', label: '座位图', path: '/pages/admin/seatmap/seatmap' }]
    : []
  return tabs.concat([
    { key: 'ordering', label: '点单', path: '/pages/user/ordering/ordering' },
    { key: 'billing', label: '结算', path: '/pages/user/billing/billing' },
    { key: 'order-detail', label: '订单详情', path: '/pages/user/order-detail/order-detail' },
    { key: 'records', label: '消费记录', path: '/pages/user/records/records' },
  ])
}

Component({
  properties: {
    venueId: { type: String, value: '' },
    venueName: { type: String, value: '' },
    active: { type: String, value: 'seats' },
  },
  data: {
    tabs: [],
    role: 'user',
  },
  lifetimes: {
    attached() {
      const role = app.getRole()
      this.setData({ role, tabs: buildTabs(role).map(t => Object.assign({}, t, { active: t.key === this.data.active })) })
    },
  },
  pageLifetimes: {
    show() {
      const role = app.getRole()
      this.setData({ role, tabs: buildTabs(role).map(t => Object.assign({}, t, { active: t.key === this.data.active })) })
    },
  },
  observers: {
    'active, venueId'() {
      const role = app.getRole()
      this.setData({ tabs: buildTabs(role).map(t => Object.assign({}, t, { active: t.key === this.data.active })) })
    },
  },
  methods: {
    onTab(e) {
      const key = e.currentTarget.dataset.key
      if (key === this.data.active) return
      const role = app.getRole()
      const tab = buildTabs(role).find(t => t.key === key)
      if (!tab) return
      wx.redirectTo({ url: `${tab.path}?venueId=${this.data.venueId}` })
    },
    backHome() {
      const role = app.getRole()
      wx.reLaunch({ url: role === 'admin' ? '/pages/admin/venue/venue' : '/pages/user/venue/venue' })
    },
  },
})
