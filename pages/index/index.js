const app = getApp()

Page({
  data: {
    hasToken: false,
    logging: false,
    _tapCount: 0, // 隐藏管理端入口计数
  },

  onLoad() {
    const token = wx.getStorageSync('bb_token')
    if (token) {
      this.setData({ hasToken: true })
    }
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
