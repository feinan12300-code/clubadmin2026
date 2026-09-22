const app = getApp()
const Store = require('../../../utils/store.js')

const STATUS_LABEL = {
  pending: '待处理',
  handled: '已处理',
}

function fmtTime(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  return h + ':' + m
}

Page({
  data: {
    notices: [],
    STATUS_LABEL,
  },

  onShow() {
    this.refresh()
  },

  refresh() {
    const notices = Store.list(Store.KEYS.cashNotices).map(n => ({
      ...n,
      statusLabel: STATUS_LABEL[n.status] || n.status,
      timeStr: fmtTime(n.createdAt),
    })).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))

    this.setData({ notices })
  },

  handleNotice(e) {
    const id = e.currentTarget.dataset.id
    Store.update(Store.KEYS.cashNotices, id, { status: 'handled' })
    wx.showToast({ title: '已标记处理', icon: 'success' })
    this.refresh()
  },
})
