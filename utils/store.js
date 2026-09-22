// store.js — 数据层：封装 wx.storage 的 CRUD 操作
// 对应 Web 版 localStorage 的 Store 模块，API 保持一致

const KEYS = {
  venues: 'bb_venues',
  tables: 'bb_tables',
  reservations: 'bb_reservations',
  menu: 'bb_menu',
  orders: 'bb_orders',
  settlements: 'bb_settlements',
  meta: 'bb_meta',
  role: 'bb_role',
  userTable: 'bb_user_table',
  cashNotices: 'bb_cash_notices',
  reservationNotices: 'bb_reservation_notices',
}

// 内部：读取某 key 的数组
function read(key) {
  try {
    const raw = wx.getStorageSync(key)
    if (!raw) return []
    if (Array.isArray(raw)) return raw
    return JSON.parse(raw) || []
  } catch (e) {
    console.error('读取失败', key, e)
    return []
  }
}

// 内部：写入
function write(key, arr) {
  try {
    wx.setStorageSync(key, arr)
  } catch (e) {
    console.error('写入失败', key, e)
  }
}

// 唯一 id
function uid(prefix) {
  prefix = prefix || 'id'
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

// 列出
function list(key) { return read(key) }

// 按条件查询
function find(key, predicate) { return read(key).filter(predicate) }

// 按 id 查
function getById(key, id) {
  return read(key).find(x => x.id === id) || null
}

// 新增
function create(key, entity, opts) {
  opts = opts || {}
  const arr = read(key)
  const prefix = opts.prefix || key.replace('bb_', '').slice(0, 3)
  const record = Object.assign({}, entity, {
    id: entity.id || uid(prefix),
    createdAt: opts.noTimestamp ? undefined : Date.now(),
  })
  arr.push(record)
  write(key, arr)
  return record
}

// 按 id 更新
function update(key, id, patch) {
  const arr = read(key)
  const idx = arr.findIndex(x => x.id === id)
  if (idx === -1) return null
  arr[idx] = Object.assign({}, arr[idx], patch, { id: arr[idx].id })
  write(key, arr)
  return arr[idx]
}

// 按 id 删除
function remove(key, id) {
  const arr = read(key)
  const filtered = arr.filter(x => x.id !== id)
  write(key, filtered)
  return filtered.length !== arr.length
}

// 业务辅助
function tablesByVenue(venueId) { return read(KEYS.tables).filter(t => t.venueId === venueId) }
function menuByVenue(venueId)    { return read(KEYS.menu).filter(m => m.venueId === venueId) }
function ordersByVenue(venueId)  { return read(KEYS.orders).filter(o => o.venueId === venueId) }
function reservationsByVenue(venueId) { return read(KEYS.reservations).filter(r => r.venueId === venueId) }
function settlementsByVenue(venueId) { return read(KEYS.settlements).filter(s => s.venueId === venueId) }

// 桌台实时统计：返回 { total, idle, occupied, reserved }
// 用于门店列表展示动态台位信息
function tableStats(venueId) {
  const tables = tablesByVenue(venueId)
  const stats = { total: tables.length, idle: 0, occupied: 0, reserved: 0 }
  tables.forEach(t => {
    if (t.status === 'idle') stats.idle++
    else if (t.status === 'occupied') stats.occupied++
    else if (t.status === 'reserved') stats.reserved++
  })
  return stats
}

// 元数据：当前门店
function getCurrentVenueId() {
  const meta = read(KEYS.meta)[0] || {}
  return meta.currentVenueId || null
}
function setCurrentVenueId(venueId) {
  write(KEYS.meta, [{ currentVenueId: venueId, seeded: true }])
}
function isSeeded() {
  const meta = read(KEYS.meta)[0] || {}
  return !!meta.seeded
}
function markSeeded() {
  const meta = read(KEYS.meta)[0] || {}
  write(KEYS.meta, [Object.assign({}, meta, { seeded: true })])
}

// 桌台状态切换（被多模块共用）
function setTableStatus(venueId, tableId, status) {
  return update(KEYS.tables, tableId, { status })
}

// 角色：admin 管理端 / user 用户端
function getRole() {
  try {
    return wx.getStorageSync(KEYS.role) || 'user'
  } catch (e) {
    return 'user'
  }
}
function setRole(role) {
  try {
    wx.setStorageSync(KEYS.role, role)
  } catch (e) {}
}

// 用户桌台绑定：以 token 为键，存储 { token, venueId, tableId }
// 约束：一个 token 同时只能绑定一个桌台
function getUserTable(token) {
  if (!token) return null
  const arr = read(KEYS.userTable)
  return arr.find(r => r.token === token) || null
}
// 绑定桌台：覆盖式写入。若之前已绑定其他桌台，先释放旧桌台状态。
// 同时将新桌台状态置为 occupied，确保其他用户无法重复选择。
function setUserTable(token, venueId, tableId) {
  if (!token) return
  const arr = read(KEYS.userTable)
  const idx = arr.findIndex(r => r.token === token)
  // 若已有绑定且不是同一个桌台，先释放旧桌台
  if (idx !== -1) {
    const old = arr[idx]
    if (old.tableId !== tableId) {
      update(KEYS.tables, old.tableId, { status: 'idle' })
    }
  }
  const record = { token, venueId, tableId }
  if (idx === -1) arr.push(record)
  else arr[idx] = record
  write(KEYS.userTable, arr)
  // 同步将新桌台标记为占用，确保其他用户看不到该桌台
  update(KEYS.tables, tableId, { status: 'occupied' })
}
// 解除绑定：同时把绑定的桌台释放为 idle（结算后由 billing 调用，
// 或用户主动切换桌台时由 switchTable 调用）
function clearUserTable(token) {
  if (!token) return
  const arr = read(KEYS.userTable)
  const binding = arr.find(r => r.token === token)
  if (binding) {
    // 释放该桌台
    update(KEYS.tables, binding.tableId, { status: 'idle' })
  }
  write(KEYS.userTable, arr.filter(r => r.token !== token))
}

module.exports = {
  KEYS,
  uid,
  list,
  find,
  getById,
  create,
  update,
  remove,
  tablesByVenue,
  menuByVenue,
  ordersByVenue,
  reservationsByVenue,
  settlementsByVenue,
  tableStats,
  getCurrentVenueId,
  setCurrentVenueId,
  isSeeded,
  markSeeded,
  setTableStatus,
  getRole,
  setRole,
  getUserTable,
  setUserTable,
  clearUserTable,
}
