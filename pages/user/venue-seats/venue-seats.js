const app = getApp()
const Store = require('../../../utils/store.js')
const util = require('../../../utils/util.js')

// 桌型默认参数
const TYPE_DEFAULTS = {
  round:  { w: 60, h: 60, capacity: 4, label: '圆桌' },
  square: { w: 70, h: 50, capacity: 2, label: '方桌' },
  booth:  { w: 90, h: 70, capacity: 6, label: '卡座' },
  bar:    { w: 30, h: 30, capacity: 1, label: '吧台' },
}
const STATUS_COLOR = {
  idle: '#10b981',
  occupied: '#ef4444',
  reserved: '#f59e0b',
}
const TYPE_LIST = ['round', 'square', 'booth', 'bar']
const STATUS_LIST = ['idle', 'occupied', 'reserved']
const STATUS_NAMES = ['空闲', '占用', '预留']

Page({
  data: {
    venueId: '',
    venueName: '',
    mode: 'edit', // edit | view
    tables: [],
    // 编辑模式工具栏
    tool: 'select',
    // 属性面板
    inspectorShow: false,
    inspector: null,
    typeIndex: 0,
    statusIndex: 0,
    typeNames: TYPE_LIST.map(t => TYPE_DEFAULTS[t].label),
    statusNames: STATUS_NAMES,
    // 查看模式预约表单
    reserveShow: false,
    reserveForm: { surname: '', wechat: '', phone: '', date: '', time: '20:00', partySize: 2 },
    reserveTable: null,
  },

  // 内部状态
  canvas: null,
  ctx: null,
  dpr: 1,
  canvasW: 0,
  canvasH: 0,
  canvasRect: null,
  selectedId: null,
  drag: null,

  onLoad(options) {
    const venueId = options.venueId || app.getCurrentVenueId()
    // mode 由参数或角色决定
    let mode = options.mode
    if (mode !== 'edit' && mode !== 'view') {
      mode = app.getRole() === 'admin' ? 'edit' : 'view'
    }
    const venue = Store.getById(Store.KEYS.venues, venueId)
    wx.setNavigationBarTitle({ title: venue ? venue.name : '座位图' })
    this.setData({ venueId, venueName: venue ? venue.name : '', mode })
  },

  onShow() {
    this.loadTables()
    this.initCanvas()
    this.updateCanvasRect()
  },

  loadTables() {
    const tables = Store.tablesByVenue(this.data.venueId)
    this.setData({ tables })
  },

  // 初始化 canvas 2d
  initCanvas() {
    const q = wx.createSelectorQuery()
    q.select('#seatCanvas').fields({ node: true, size: true }).exec(res => {
      if (!res || !res[0] || !res[0].node) {
        setTimeout(() => this.initCanvas(), 100)
        return
      }
      const canvas = res[0].node
      const ctx = canvas.getContext('2d')
      const dpr = wx.getSystemInfoSync().pixelRatio || 1
      const w = res[0].width
      const h = res[0].height
      canvas.width = w * dpr
      canvas.height = h * dpr
      ctx.scale(dpr, dpr)
      this.canvas = canvas
      this.ctx = ctx
      this.dpr = dpr
      this.canvasW = w
      this.canvasH = h
      this.draw()
    })
  },

  setTool(e) {
    if (this.data.mode !== 'edit') return
    const tool = e.currentTarget.dataset.tool
    this.setData({ tool, selectedId: null, inspectorShow: false })
    this.draw()
  },

  // ====== touch 事件 ======
  onTouchStart(e) {
    this.updateCanvasRect()
    const { x, y } = this.getTouchPos(e)
    if (this.data.mode === 'edit') {
      // 编辑模式：选择/拖拽 或 放置
      if (this.data.tool === 'select') {
        const hit = this.hitTest(x, y)
        if (hit) {
          this.selectedId = hit.id
          this.drag = { id: hit.id, startX: x, startY: y, origX: hit.x, origY: hit.y, moved: false }
          this.openInspector(hit.id)
          this.draw()
        } else {
          this.selectedId = null
          this.setData({ inspectorShow: false })
          this.draw()
        }
      } else {
        this.placeTable(this.data.tool, x, y)
      }
    } else {
      // 查看模式：点击桌台拉起预约
      const hit = this.hitTest(x, y)
      if (hit) {
        this.selectedId = hit.id
        this.draw()
        this.openReserve(hit)
      } else {
        this.selectedId = null
        this.draw()
      }
    }
  },

  onTouchMove(e) {
    if (this.data.mode !== 'edit' || !this.drag) return
    const { x, y } = this.getTouchPos(e)
    const t = Store.getById(Store.KEYS.tables, this.drag.id)
    if (!t) return
    let nx = this.drag.origX + (x - this.drag.startX)
    let ny = this.drag.origY + (y - this.drag.startY)
    nx = Math.max(0, Math.min(this.canvasW - t.w, nx))
    ny = Math.max(0, Math.min(this.canvasH - t.h, ny))
    Store.update(Store.KEYS.tables, t.id, { x: nx, y: ny })
    this.drag.moved = true
    this.loadTables()
    this.draw()
  },

  onTouchEnd() {
    if (this.drag && this.drag.moved && this.selectedId === this.drag.id) {
      const t = Store.getById(Store.KEYS.tables, this.selectedId)
      if (t) this.setData({ inspector: t })
    }
    this.drag = null
  },

  getTouchPos(e) {
    const touch = e.touches[0] || (e.changedTouches && e.changedTouches[0])
    if (!touch) return { x: 0, y: 0 }
    const rect = this.canvasRect
    const x = touch.clientX - (rect ? rect.left : 0)
    const y = touch.clientY - (rect ? rect.top : 0)
    return { x, y }
  },

  updateCanvasRect() {
    try {
      wx.createSelectorQuery().select('#seatCanvas').boundingClientRect(res => {
        if (res) this.canvasRect = res
      }).exec()
    } catch (e) {
      this.canvasRect = null
    }
  },

  // 命中检测
  hitTest(x, y) {
    const tables = Store.tablesByVenue(this.data.venueId)
    for (let i = tables.length - 1; i >= 0; i--) {
      const t = tables[i]
      if (t.type === 'round') {
        const cx = t.x + t.w / 2
        const cy = t.y + t.h / 2
        const rx = t.w / 2
        const ry = t.h / 2
        const dx = (x - cx) / rx
        const dy = (y - cy) / ry
        if (dx * dx + dy * dy <= 1) return t
      } else {
        if (x >= t.x && x <= t.x + t.w && y >= t.y && y <= t.y + t.h) return t
      }
    }
    return null
  },

  // 放置桌台
  placeTable(type, x, y) {
    const def = TYPE_DEFAULTS[type]
    const px = Math.max(0, x - def.w / 2)
    const py = Math.max(0, y - def.h / 2)
    const tables = Store.tablesByVenue(this.data.venueId)
    const sameType = tables.filter(t => t.type === type)
    const name = `${def.label}${sameType.length + 1}`
    const t = Store.create(Store.KEYS.tables, {
      venueId: this.data.venueId,
      name,
      type,
      capacity: def.capacity,
      x: px, y: py,
      w: def.w, h: def.h,
      status: 'idle',
    }, { prefix: 'tbl', noTimestamp: true })
    this.selectedId = t.id
    this.setData({ tool: 'select' })
    this.loadTables()
    this.openInspector(t.id)
    this.draw()
    util.toast(`已放置 ${name}`, 'success')
  },

  onClearAll() {
    const tables = Store.tablesByVenue(this.data.venueId)
    if (tables.length === 0) { util.toast('当前没有桌台'); return }
    wx.showModal({
      title: '确认清空',
      content: `确认清空当前门店的全部 ${tables.length} 个桌台？`,
      confirmColor: '#ef4444',
      success: res => {
        if (!res.confirm) return
        tables.forEach(t => Store.remove(Store.KEYS.tables, t.id))
        this.selectedId = null
        this.setData({ inspectorShow: false })
        this.loadTables()
        this.draw()
        util.toast('已清空', 'success')
      },
    })
  },

  // ====== 属性面板（编辑模式） ======
  openInspector(id) {
    const t = Store.getById(Store.KEYS.tables, id)
    if (!t) return
    this.selectedId = id
    this.setData({
      inspectorShow: true,
      inspector: t,
      typeIndex: Math.max(0, TYPE_LIST.indexOf(t.type)),
      statusIndex: Math.max(0, STATUS_LIST.indexOf(t.status)),
    })
  },
  closeInspector() { this.setData({ inspectorShow: false }) },

  onInsInput(e) {
    const key = e.currentTarget.dataset.key
    let v = e.detail.value
    if (['capacity', 'w', 'h', 'x', 'y'].includes(key)) v = Number(v) || 0
    const inspector = Object.assign({}, this.data.inspector, { [key]: v })
    this.setData({ inspector })
    Store.update(Store.KEYS.tables, this.data.inspector.id, { [key]: v })
    this.loadTables()
    this.draw()
  },
  onInsType(e) {
    const idx = Number(e.detail.value)
    const type = TYPE_LIST[idx]
    const def = TYPE_DEFAULTS[type]
    const inspector = Object.assign({}, this.data.inspector, { type, capacity: def.capacity })
    this.setData({ inspector, typeIndex: idx })
    Store.update(Store.KEYS.tables, this.data.inspector.id, { type, capacity: def.capacity })
    this.loadTables()
    this.draw()
  },
  onInsStatus(e) {
    const idx = Number(e.detail.value)
    const status = STATUS_LIST[idx]
    const inspector = Object.assign({}, this.data.inspector, { status })
    this.setData({ inspector, statusIndex: idx })
    Store.update(Store.KEYS.tables, this.data.inspector.id, { status })
    this.loadTables()
    this.draw()
  },
  onDeleteTable() {
    const id = this.data.inspector.id
    wx.showModal({
      title: '确认删除',
      content: `确认删除桌台「${this.data.inspector.name}」？`,
      confirmColor: '#ef4444',
      success: res => {
        if (!res.confirm) return
        Store.remove(Store.KEYS.tables, id)
        this.selectedId = null
        this.setData({ inspectorShow: false })
        this.loadTables()
        this.draw()
        util.toast('已删除', 'success')
      },
    })
  },

  // ====== 预约表单（查看模式） ======
  openReserve(table) {
    this.setData({
      reserveShow: true,
      reserveTable: table,
      reserveForm: {
        surname: '',
        wechat: '',
        phone: '',
        date: util.today(),
        time: '20:00',
        partySize: table.capacity || 2,
      },
    })
  },
  closeReserve() {
    this.selectedId = null
    this.setData({ reserveShow: false, reserveTable: null })
    this.draw()
  },
  onResInput(e) {
    const key = e.currentTarget.dataset.key
    let v = e.detail.value
    if (key === 'partySize') v = Number(v) || 0
    this.setData({ [`reserveForm.${key}`]: v })
  },
  onResDate(e) { this.setData({ 'reserveForm.date': e.detail.value }) },
  onResTime(e) { this.setData({ 'reserveForm.time': e.detail.value }) },

  submitReserve() {
    const f = this.data.reserveForm
    const table = this.data.reserveTable
    if (!f.surname.trim()) { util.toast('请填写贵姓'); return }
    if (!f.wechat.trim()) { util.toast('请填写微信号'); return }
    if (!f.date || !f.time) { util.toast('请选择日期和时间'); return }
    if (!f.partySize || f.partySize < 1) { util.toast('请填写有效人数'); return }
    if (!table) { util.toast('未选择桌台'); return }

    // 检查同时段该桌台是否已被预订
    const conflict = Store.reservationsByVenue(this.data.venueId)
      .some(r => r.tableId === table.id && r.date === f.date && r.status === 'pending')
    if (conflict) {
      util.toast('该桌台此时段已被预订', 'none')
      return
    }

    Store.create(Store.KEYS.reservations, {
      venueId: this.data.venueId,
      customerName: f.surname.trim(),
      wechat: f.wechat.trim(),
      phone: (f.phone || '').trim(),
      date: f.date,
      time: f.time,
      partySize: f.partySize,
      tableId: table.id,
      status: 'pending',
    }, { prefix: 'res' })

    // 标记桌台为预留
    if (table.status !== 'occupied') {
      Store.setTableStatus(this.data.venueId, table.id, 'reserved')
    }
    util.toast('预约已提交', 'success')
    this.selectedId = null
    this.setData({ reserveShow: false, reserveTable: null })
    this.loadTables()
    this.draw()
  },

  // ====== 绘制 ======
  draw() {
    const ctx = this.ctx
    if (!ctx) return
    const tables = Store.tablesByVenue(this.data.venueId)
    ctx.clearRect(0, 0, this.canvasW, this.canvasH)
    tables.forEach(t => this.drawTable(ctx, t))
  },

  drawTable(ctx, t) {
    const color = STATUS_COLOR[t.status] || STATUS_COLOR.idle
    const selected = t.id === this.selectedId
    ctx.save()
    ctx.fillStyle = color
    ctx.strokeStyle = selected ? '#6366f1' : 'rgba(255,255,255,0.4)'
    ctx.lineWidth = selected ? 3 : 1
    if (t.type === 'round') {
      const cx = t.x + t.w / 2
      const cy = t.y + t.h / 2
      ctx.beginPath()
      ctx.ellipse(cx, cy, t.w / 2, t.h / 2, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
    } else if (t.type === 'booth') {
      this.roundRect(ctx, t.x, t.y, t.w, t.h, 12)
      ctx.fill()
      ctx.stroke()
    } else {
      ctx.fillRect(t.x, t.y, t.w, t.h)
      ctx.strokeRect(t.x, t.y, t.w, t.h)
    }
    ctx.fillStyle = '#fff'
    ctx.font = '12px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(t.name, t.x + t.w / 2, t.y + t.h / 2 - 6)
    ctx.fillStyle = 'rgba(255,255,255,0.85)'
    ctx.font = '9px sans-serif'
    ctx.fillText(`${t.capacity}人`, t.x + t.w / 2, t.y + t.h / 2 + 8)
    ctx.restore()
  },

  roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.arcTo(x + w, y, x + w, y + h, r)
    ctx.arcTo(x + w, y + h, x, y + h, r)
    ctx.arcTo(x, y + h, x, y, r)
    ctx.arcTo(x, y, x + w, y, r)
    ctx.closePath()
  },
})
