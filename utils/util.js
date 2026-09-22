// util.js — 通用工具

// 今日日期 YYYY-MM-DD
function today() {
  const d = new Date()
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

// 时间格式化 HH:mm
function formatTime(ts) {
  if (!ts) return '-'
  const d = new Date(ts)
  const pad = n => String(n).padStart(2, '0')
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// 金额格式化
function money(n) {
  if (n == null || isNaN(n)) n = 0
  return '¥' + Number(n).toFixed(2)
}

// toast 简便封装
function toast(title, icon) {
  icon = icon || 'none'
  wx.showToast({ title: String(title), icon, duration: 1500 })
}

// modal 简便封装（Promise 化）
function confirm(content, title) {
  return new Promise(resolve => {
    wx.showModal({
      title: title || '提示',
      content: content || '',
      success: res => resolve(!!res.confirm),
    })
  })
}

module.exports = { today, formatTime, money, toast, confirm }
