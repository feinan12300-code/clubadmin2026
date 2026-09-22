const app = getApp()

// 各端 tab 配置：用户端座位图走 user/venue-seats，管理端走 admin/seatmap
function buildTabs(role) {
  const isAdmin = role === 'admin'
  return [
    { key: 'seats', label: '座位图', path: isAdmin ? '/pages/admin/seatmap/seatmap' : '/pages/user/venue-seats/venue-seats' },
    { key: 'reservation', label: '预定排队', path: '/pages/user/reservation/reservation' },
    { key: 'ordering', label: '点单', path: '/pages/user/ordering/ordering' },
    { key: 'billing', label: '结算', path: '/pages/user/billing/billing' },
    { key: 'order-detail', label: '订单详情', path: '/pages/user/order-detail/order-detail' },
    { key: 'records', label: '消费记录', path: '/pages/user/records/records' },
  ]
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
