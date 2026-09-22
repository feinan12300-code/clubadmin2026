const app = getApp()

Page({
  data: {
    hasToken: false,
    logging: false,
    _tapCount: 0, // 隐藏管理端入口计数
    stars: [],     // 闪烁小星点
    meteors: [],   // 流星
  },

  onLoad() {
    const token = wx.getStorageSync('bb_token')
    if (token) {
      this.setData({ hasToken: true })
    }
    this._genStars()
  },

  // 生成静态闪烁星点（70 颗）+ 流星（6 颗）
  _genStars() {
    const stars = []
    for (let i = 0; i < 70; i++) {
      stars.push({
        id: 's' + i,
        top: Math.random() * 100,
        left: Math.random() * 100,
        size: Math.random() * 3 + 1.5,         // 1.5~4.5rpx
        opacity: Math.random() * 0.5 + 0.4,    // 0.4~0.9
        duration: Math.random() * 3 + 2,       // 2~5s
        delay: Math.random() * 5,             // 0~5s
      })
    }
    const meteors = []
    for (let i = 0; i < 6; i++) {
      meteors.push({
        id: 'm' + i,
        top: Math.random() * 40,              // 流星起点偏上
        left: Math.random() * 80 + 10,        // 10~90%
        delay: i * 2.5 + Math.random() * 2,
        duration: Math.random() * 1 + 1.2,    // 1.2~2.2s
      })
    }
    this.setData({ stars, meteors })
  },

  // 微信登录
  doLogin() {
    if (this.data.logging) return
    this.setData({ logging: true })
    wx.login({
      success: res => {
        if (res.code) {
          // 实际项目中：res.code 发送到后端换取 token + openid
          // 本地模拟：用 code 生成 mock token
          const token = `mock_${res.code}_${Date.now()}`
          wx.setStorageSync('bb_token', token)
          wx.setStorageSync('bb_openid', `openid_${res.code.slice(0, 16)}`)
          this.setData({ hasToken: true, logging: false })
          wx.showToast({ title: '登录成功', icon: 'success' })
          this.enterUser()
        } else {
          this.setData({ logging: false })
          wx.showToast({ title: '登录失败', icon: 'none' })
        }
      },
      fail: () => {
        this.setData({ logging: false })
        wx.showToast({ title: '登录失败', icon: 'none' })
      },
    })
  },

  enterUser() {
    app.setRole('user')
    wx.reLaunch({ url: '/pages/user/venue/venue' })
  },

  // 隐藏管理端入口：连续点击 logo 5 次
  onLogoTap() {
    const count = (this.data._tapCount || 0) + 1
    this.setData({ _tapCount: count })
    if (count >= 5) {
      this.setData({ _tapCount: 0 })
      app.setRole('admin')
      wx.showToast({ title: '已进入管理端', icon: 'none' })
      wx.reLaunch({ url: '/pages/admin/venue/venue' })
    }
  },

  logout() {
    wx.removeStorageSync('bb_token')
    wx.removeStorageSync('bb_openid')
    this.setData({ hasToken: false })
  },
})
