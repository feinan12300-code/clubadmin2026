const app = getApp()
const Store = require('../../../utils/store.js')
const util = require('../../../utils/util.js')
const Seed = require('../../../utils/seed.js')

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

Page({
  data: {
    venueId: '',
    venueName: '',
    tables: [],
    tool: 'select',
    inspectorShow: false,
    inspector: null,
    typeIndex: 0,
    statusIndex: 0,
    typeNames: TYPE_LIST.map(t => TYPE_DEFAULTS[t].label),
    statusNames: ['空闲', '占用', '预留'],
    // 添加台位表单
    addFormShow: false,
    addForm: { name: '', typeIdx: 0, capacity: '', x: '', y: '' },
    // 拖拽时的坐标提示
    dragHint: '',
  },

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
    const venue = Store.getById(Store.KEYS.venues, venueId)
    wx.setNavigationBarTitle({ title: venue ? `${venue.name} · 座位图` : '座位图编辑' })
    this.setData({ venueId, venueName: venue ? venue.name : '' })
  },

  onShow() {
    this.loadTables()
    this.initCanvas()
    this.updateCanvasRect()
  },

  loadTables() {
    this.setData({ tables: Store.tablesByVenue(this.data.venueId) })
  },

  initCanvas() {
    const q = wx.createSelectorQuery()
    q.select('#seatCanvas').fields({ node: true, size: true }).exec(res => {
      if (!res || !res[0] || !res[0].node) { setTimeout(() => this.initCanvas(), 100); return }
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
    this.setData({ tool: e.currentTarget.dataset.tool, inspectorShow: false })
    this.selectedId = null
    this.draw()
  },

  onTouchStart(e) {
    // 添加表单显示时不响应画布触摸（全屏 modal）
    if (this.data.addFormShow) return
    this.updateCanvasRect()
    const { x, y } = this.getTouchPos(e)
    if (this.data.tool === 'select') {
      const hit = this.hitTest(x, y)
      if (hit) {
        this.selectedId = hit.id
        // 启动拖拽：不在 start 时打开 inspector，避免 modal 遮挡画布导致拖拽中断
        this.drag = { id: hit.id, startX: x, startY: y, origX: hit.x, origY: hit.y, moved: false }
        this.setData({ dragHint: `${hit.name}  拖拽调整位置…` })
        this.draw()
      } else {
        this.selectedId = null
        this.setData({ inspectorShow: false, dragHint: '' })
        this.draw()
      }
    } else {
      this.placeTable(this.data.tool, x, y)
    }
  },

  onTouchMove(e) {
    if (this.data.addFormShow) return
    if (!this.drag) return
    const { x, y } = this.getTouchPos(e)
    const t = Store.getById(Store.KEYS.tables, this.drag.id)
    if (!t) return
    let nx = Math.max(0, Math.min(this.canvasW - t.w, this.drag.origX + (x - this.drag.startX)))
    let ny = Math.max(0, Math.min(this.canvasH - t.h, this.drag.origY + (y - this.drag.startY)))
    // 仅更新内存临时坐标，不写 storage、不 setData，避免高频 IO + 跨线程通信导致卡顿
    this.drag.curX = nx
    this.drag.curY = ny
    this.drag.moved = true
    // RAF 合并重绘：一帧最多一次 draw，把多次 move 合并成一帧
    if (!this.drag.rafQueued) {
      this.drag.rafQueued = true
      const raf = this.canvas && this.canvas.requestAnimationFrame
        ? this.canvas.requestAnimationFrame.bind(this.canvas)
        : (cb) => setTimeout(cb, 16)
      raf(() => {
        if (!this.drag) return
        this.drag.rafQueued = false
        this.draw()
      })
    }
  },

  onTouchEnd() {
    if (!this.drag) return
    // 拖拽结束：moved 时才写 storage + 同步 tables（move 期间都只在内存）
    if (this.drag.moved && this.drag.curX !== undefined) {
      Store.update(Store.KEYS.tables, this.drag.id, { x: this.drag.curX, y: this.drag.curY })
      this.loadTables()
    }
    // 打开 inspector 显示最新坐标
    this.openInspector(this.drag.id)
    this.setData({ dragHint: '' })
    this.drag = null
    this.draw()
  },

  getTouchPos(e) {
    const touch = e.touches[0] || (e.changedTouches && e.changedTouches[0])
    if (!touch) return { x: 0, y: 0 }
    const rect = this.canvasRect
    // clientX/clientY 是相对于视口的坐标，减去 canvas 的 left/top 得到 canvas 内坐标
    const x = touch.clientX - (rect ? rect.left : 0)
    const y = touch.clientY - (rect ? rect.top : 0)
    console.log('[getTouchPos]', {
      clientX: touch.clientX, clientY: touch.clientY,
      rectLeft: rect ? rect.left : 'null',
      rectTop: rect ? rect.top : 'null',
      rectW: rect ? rect.width : 'null',
      rectH: rect ? rect.height : 'null',
      canvasW: this.canvasW, canvasH: this.canvasH,
      x, y,
    })
    return { x, y }
  },

  updateCanvasRect() {
    try {
      const query = wx.createSelectorQuery()
      query.select('#seatCanvas').boundingClientRect(res => {
        if (res) {
          this.canvasRect = res
          console.log('[updateCanvasRect]', res)
        }
      }).exec()
    } catch (e) {
      this.canvasRect = null
      console.log('[updateCanvasRect] error', e)
    }
  },

  hitTest(x, y) {
    const tables = Store.tablesByVenue(this.data.venueId)
    for (let i = tables.length - 1; i >= 0; i--) {
      const t = tables[i]
      if (t.type === 'round') {
        const dx = (x - (t.x + t.w / 2)) / (t.w / 2)
        const dy = (y - (t.y + t.h / 2)) / (t.h / 2)
        if (dx * dx + dy * dy <= 1) return t
      } else if (x >= t.x && x <= t.x + t.w && y >= t.y && y <= t.y + t.h) {
        return t
      }
    }
    return null
  },

  placeTable(type, x, y) {
    const def = TYPE_DEFAULTS[type]
    const tables = Store.tablesByVenue(this.data.venueId)
    const name = `${def.label}${tables.filter(t => t.type === type).length + 1}`
    const t = Store.create(Store.KEYS.tables, {
      venueId: this.data.venueId, name, type,
      capacity: def.capacity,
      x: Math.max(0, x - def.w / 2), y: Math.max(0, y - def.h / 2),
      w: def.w, h: def.h, status: 'idle',
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
      title: '确认清空', content: `确认清空全部 ${tables.length} 个桌台？`,
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

  // 应用「拾叁唐 LIVESHOW」预设布局：清空当前门店桌台并生成 75 个台位
  apply13Tang() {
    const tables = Store.tablesByVenue(this.data.venueId)
    wx.showModal({
      title: '应用拾叁唐布局',
      content: tables.length > 0
        ? `将清空当前门店已有的 ${tables.length} 个桌台，并生成拾叁唐风格 75 个台位（C区10/G区9/B区8/SVIP12/BOSS36）。确认？`
        : `将为当前门店生成拾叁唐风格 75 个台位（C区10/G区9/B区8/SVIP12/BOSS36）。确认？`,
      confirmColor: '#6366f1',
      success: res => {
        if (!res.confirm) return
        // 先清空现有桌台
        tables.forEach(t => Store.remove(Store.KEYS.tables, t.id))
        // 生成拾叁唐布局
        Seed.build13TangLayout().forEach(t => {
          Store.create(Store.KEYS.tables, Object.assign({ venueId: this.data.venueId }, t), { prefix: 'tbl', noTimestamp: true })
        })
        this.selectedId = null
        this.setData({ inspectorShow: false })
        this.loadTables()
        this.draw()
        util.toast('已应用拾叁唐布局（75 台位）', 'success')
      },
    })
  },

  openInspector(id) {
    const t = Store.getById(Store.KEYS.tables, id)
    if (!t) return
    this.selectedId = id
    this.setData({
      inspectorShow: true, inspector: t,
      typeIndex: Math.max(0, TYPE_LIST.indexOf(t.type)),
      statusIndex: Math.max(0, STATUS_LIST.indexOf(t.status)),
    })
  },
  closeInspector() { this.setData({ inspectorShow: false }) },

  onInsInput(e) {
    const key = e.currentTarget.dataset.key
    let v = e.detail.value
    if (['capacity', 'w', 'h', 'x', 'y'].includes(key)) v = Number(v) || 0
    this.setData({ inspector: Object.assign({}, this.data.inspector, { [key]: v }) })
    Store.update(Store.KEYS.tables, this.data.inspector.id, { [key]: v })
    this.loadTables()
    this.draw()
  },
  onInsType(e) {
    const idx = Number(e.detail.value)
    const type = TYPE_LIST[idx]
    const def = TYPE_DEFAULTS[type]
    this.setData({
      inspector: Object.assign({}, this.data.inspector, { type, capacity: def.capacity }),
      typeIndex: idx,
    })
    Store.update(Store.KEYS.tables, this.data.inspector.id, { type, capacity: def.capacity })
    this.loadTables()
    this.draw()
  },
  onInsStatus(e) {
    const idx = Number(e.detail.value)
    this.setData({ inspector: Object.assign({}, this.data.inspector, { status: STATUS_LIST[idx] }), statusIndex: idx })
    Store.update(Store.KEYS.tables, this.data.inspector.id, { status: STATUS_LIST[idx] })
    this.loadTables()
    this.draw()
  },
  onDeleteTable() {
    const id = this.data.inspector.id
    wx.showModal({
      title: '确认删除', content: `删除桌台「${this.data.inspector.name}」？`,
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

  // ============ 添加台位表单 ============
  openAddForm() {
    this.setData({
      addFormShow: true,
      addForm: { name: '', typeIdx: 0, capacity: '', x: '', y: '' },
    })
  },
  closeAddForm() { this.setData({ addFormShow: false }) },
  onAddInput(e) {
    const key = e.currentTarget.dataset.key
    this.setData({ [`addForm.${key}`]: e.detail.value })
  },
  onAddType(e) {
    this.setData({ 'addForm.typeIdx': Number(e.detail.value) })
  },
  addTableSubmit() {
    const { name, typeIdx, capacity, x, y } = this.data.addForm
    const trimmedName = (name || '').trim()
    if (!trimmedName) { util.toast('请填写台位名称', 'none'); return }
    const cap = parseInt(capacity, 10)
    if (!cap || cap < 1) { util.toast('请填写有效容量', 'none'); return }
    const type = TYPE_LIST[typeIdx]
    const def = TYPE_DEFAULTS[type]
    // 位置：未填则放在画布中心，避免重叠可手动调整
    const px = x === '' ? Math.max(0, (this.canvasW - def.w) / 2) : Math.max(0, Math.min(this.canvasW - def.w, Number(x) || 0))
    const py = y === '' ? Math.max(0, (this.canvasH - def.h) / 2) : Math.max(0, Math.min(this.canvasH - def.h, Number(y) || 0))
    const t = Store.create(Store.KEYS.tables, {
      venueId: this.data.venueId, name: trimmedName, type, capacity: cap,
      x: px, y: py, w: def.w, h: def.h, status: 'idle',
    }, { prefix: 'tbl', noTimestamp: true })
    this.setData({ addFormShow: false })
    this.loadTables()
    this.openInspector(t.id)
    this.draw()
    util.toast(`已添加 ${trimmedName}`, 'success')
  },

  draw() {
    const ctx = this.ctx
    if (!ctx) return
    ctx.clearRect(0, 0, this.canvasW, this.canvasH)
    Store.tablesByVenue(this.data.venueId).forEach(t => {
      // 拖拽中的台位用内存临时坐标，避免读到未写入的旧坐标
      if (this.drag && this.drag.id === t.id && this.drag.curX !== undefined) {
        this.drawTable(ctx, Object.assign({}, t, { x: this.drag.curX, y: this.drag.curY }))
      } else {
        this.drawTable(ctx, t)
      }
    })
  },

  drawTable(ctx, t) {
    const color = STATUS_COLOR[t.status] || STATUS_COLOR.idle
    const selected = t.id === this.selectedId
    ctx.save()
    ctx.fillStyle = color
    ctx.strokeStyle = selected ? '#6366f1' : 'rgba(255,255,255,0.4)'
    ctx.lineWidth = selected ? 3 : 1
    // booth 圆角随尺寸自适应，避免小台位圆角过大变形
    const r = Math.max(0, Math.min(8, t.w / 4, t.h / 4))
    if (t.type === 'round') {
      ctx.beginPath()
      ctx.ellipse(t.x + t.w / 2, t.y + t.h / 2, t.w / 2, t.h / 2, 0, 0, Math.PI * 2)
      ctx.fill(); ctx.stroke()
    } else if (t.type === 'booth') {
      this.roundRect(ctx, t.x, t.y, t.w, t.h, r)
      ctx.fill(); ctx.stroke()
    } else {
      ctx.fillRect(t.x, t.y, t.w, t.h)
      ctx.strokeRect(t.x, t.y, t.w, t.h)
    }
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    const name = String(t.name)
    // 自适应字体：受台位宽（每字符约 0.6 倍字号）和高双重约束，避免文字溢出与相邻台位重叠
    const fontByW = t.w / (name.length * 0.6)
    const fontByH = t.h * 0.5
    let fontSize = Math.max(6, Math.min(12, fontByW, fontByH))
    // 大台位（≥36×36）：名称 + 容量分两行；小台位：只显示名称（过长截断）
    if (t.w >= 36 && t.h >= 36) {
      ctx.font = `${fontSize}px sans-serif`
      this._paintText(ctx, name, t.x + t.w / 2, t.y + t.h / 2 - 6, '#fff')
      ctx.font = `${Math.max(7, fontSize * 0.75)}px sans-serif`
      this._paintText(ctx, `${t.capacity}人`, t.x + t.w / 2, t.y + t.h / 2 + 8, 'rgba(255,255,255,0.85)')
    } else {
      // 截断到能容纳的字符数
      const maxChars = Math.max(1, Math.floor(t.w / (fontSize * 0.6)))
      let display = name
      if (name.length > maxChars) display = name.slice(0, Math.max(1, maxChars - 1)) + '…'
      ctx.font = `${fontSize}px sans-serif`
      this._paintText(ctx, display, t.x + t.w / 2, t.y + t.h / 2, '#fff')
    }
    ctx.restore()
  },

  // 文字描边 + 填充，提升在彩色背景上的可读性
  _paintText(ctx, text, x, y, fillStyle) {
    ctx.lineWidth = 2
    ctx.strokeStyle = 'rgba(0,0,0,0.55)'
    ctx.strokeText(text, x, y)
    ctx.fillStyle = fillStyle
    ctx.fillText(text, x, y)
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
