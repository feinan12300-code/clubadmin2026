const app = getApp()
const Store = require('../../../utils/store.js')
const util = require('../../../utils/util.js')

const METHOD_LIST = ['wechat', 'alipay', 'cash']

function fmtMoney(n) { return Number(n || 0).toFixed(2) }

Page({
  data: {
    venueId: '',
    venueName: '',
    tableName: '',
    allItems: [],
    totalStr: '0.00',
    methodIndex: 0,
    paying: false,
  },

  onLoad(options) {
    const venueId = options.venueId || app.getCurrentVenueId()
    const venue = Store.getById(Store.KEYS.venues, venueId)
    this.setData({ venueId, venueName: venue ? venue.name : '' })
  },

  onShow() {
    this.refresh()
  },

  goOrdering() {
    wx.redirectTo({ url: '/pages/user/ordering/ordering?venueId=' + this.data.venueId })
  },

  selectMethod(e) {
    this.setData({ methodIndex: Number(e.currentTarget.dataset.idx) })
  },

  refresh() {
    const venueId = this.data.venueId
    if (!venueId) { this.setData({ allItems: [] }); return }

    const token = app.getToken()
    const binding = Store.getUserTable(token)
    if (!binding || binding.venueId !== venueId) {
      this.setData({ allItems: [], tableName: '' })
      return
    }

    const table = Store.getById(Store.KEYS.tables, binding.tableId)
    const tableName = table ? table.name : '?'

    const orders = Store.ordersByVenue(venueId).filter(o => o.status === 'open' && o.tableId === binding.tableId)
    const itemMap = {}
    orders.forEach(o => {
      ;(o.items || []).forEach(it => {
        if (!itemMap[it.itemId]) {
          itemMap[it.itemId] = { name: it.name, price: it.price, qty: 0, itemId: it.itemId }
        }
        itemMap[it.itemId].qty += it.qty
      })
    })

    const allItems = Object.values(itemMap).map(it => ({
      ...it,
      subStr: fmtMoney(it.price * it.qty),
    }))
    const total = allItems.reduce((s, it) => s + it.price * it.qty, 0)

    this._orders = orders
    this._total = total
    this._binding = binding
    this.setData({
      tableName,
      allItems,
      totalStr: fmtMoney(total),
    })
  },

  confirmSettle() {
    if (!this._orders || this._orders.length === 0) {
      util.toast('暂无可结算的订单')
      return
    }
    const method = METHOD_LIST[this.data.methodIndex]

    if (method === 'wechat') {
      this._payWechat()
    } else if (method === 'alipay') {
      this._payAlipay()
    } else {
      this._payCash()
    }
  },

  // 微信支付：调用 wx.requestPayment
  // 注意：真实环境需要后端调用微信统一下单接口获取 prepay_id、签名等参数
  // 此处为演示环境，模拟支付成功后直接结算
  _payWechat() {
    this.setData({ paying: true })
    // 模拟从后端获取的支付参数（真实环境替换为 wx.request 调用后端接口）
    // 后端接口示例：
    // wx.request({
    //   url: 'https://your-server.com/api/pay/wechat',
    //   method: 'POST',
    //   data: { orderId: this._orders[0].id, total: this._total },
    //   success: (res) => {
    //     wx.requestPayment({
    //       timeStamp: res.data.timeStamp,
    //       nonceStr: res.data.nonceStr,
    //       package: res.data.package,
    //       signType: 'RSA',
    //       paySign: res.data.paySign,
    //       success: () => this._finishSettle('wechat'),
    //       fail: (err) => { this.setData({ paying: false }); util.toast('支付取消') }
    //     })
    //   }
    // })

    // 演示：模拟支付成功
    setTimeout(() => {
      this.setData({ paying: false })
      wx.showModal({
        title: '微信支付',
        content: '演示环境模拟支付\n应付：¥' + fmtMoney(this._total),
        confirmText: '模拟支付成功',
        success: (res) => {
          if (res.confirm) {
            this._finishSettle('wechat')
          }
        }
      })
    }, 500)
  },

  // 支付宝支付
  // 注意：微信小程序内无法直接调用支付宝 SDK
  // 常见方案：通过 web-view 打开 H5 页面完成支付宝支付
  // 此处为演示环境，模拟支付成功后直接结算
  _payAlipay() {
    this.setData({ paying: true })
    // 真实环境方案：
    // 1. 后端创建支付宝订单，返回支付链接
    // 2. 小程序通过 web-view 打开该链接完成支付
    // 3. 支付完成后轮询后端确认支付状态

    // 演示：模拟支付成功
    setTimeout(() => {
      this.setData({ paying: false })
      wx.showModal({
        title: '支付宝支付',
        content: '演示环境模拟支付\n应付：¥' + fmtMoney(this._total),
        confirmText: '模拟支付成功',
        success: (res) => {
          if (res.confirm) {
            this._finishSettle('alipay')
          }
        }
      })
    }, 500)
  },

  // 现金支付：提示联系服务员，通知管理端
  _payCash() {
    const tableName = this.data.tableName
    const total = this._total
    const venueId = this.data.venueId
    const tableId = this._binding.tableId

    // 创建现金通知记录，管理端可查看
    Store.create(Store.KEYS.cashNotices, {
      venueId,
      tableId,
      tableName,
      amount: total,
      amountStr: fmtMoney(total),
      status: 'pending',
      createdAt: Date.now(),
    }, { prefix: 'cn', noTimestamp: true })

    wx.showModal({
      title: '请联系服务员',
      content: '已通知服务员到「' + tableName + '」收取现金\n应付：¥' + fmtMoney(total),
      showCancel: false,
      confirmText: '知道了',
      success: () => {
        // 现金支付由服务员确认后结算，此处标记为待确认
        // 演示环境直接结算，真实环境等待服务员在管理端确认
        this._finishSettle('cash')
      }
    })
  },

  // 完成结算：写入结算记录，更新订单/桌台状态
  _finishSettle(method) {
    const orderIds = this._orders.map(o => o.id)
    const total = this._total
    const venueId = this.data.venueId

    Store.create(Store.KEYS.settlements, {
      venueId,
      orderIds,
      subtotal: total,
      discount: 0,
      total,
      method,
      paidAt: Date.now(),
    }, { prefix: 'stl', noTimestamp: true })

    // 更新订单状态、释放桌台
    const tableIds = new Set()
    orderIds.forEach(id => {
      const o = Store.getById(Store.KEYS.orders, id)
      if (o) {
        Store.update(Store.KEYS.orders, id, { status: 'settled', settledAt: Date.now() })
        tableIds.add(o.tableId)
      }
    })
    tableIds.forEach(tid => {
      const stillOpen = Store.ordersByVenue(venueId).some(o => o.tableId === tid && o.status === 'open')
      if (!stillOpen) Store.setTableStatus(venueId, tid, 'idle')
    })

    // 解除桌台绑定
    const token = app.getToken()
    Store.clearUserTable(token)

    const methodName = method === 'wechat' ? '微信' : method === 'alipay' ? '支付宝' : '现金'
    util.toast('结算成功：¥' + fmtMoney(total) + '（' + methodName + '）', 'success', 2000)

    setTimeout(() => {
      wx.redirectTo({ url: '/pages/user/venue/venue' })
    }, 1500)
  },
})
