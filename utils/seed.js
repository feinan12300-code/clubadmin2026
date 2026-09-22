// seed.js — 首次运行注入示例数据
const Store = require('./store.js')

function inject() {
  // 门店 1
  const v1 = Store.create(Store.KEYS.venues, {
    name: '醉夜酒吧',
    address: '上海市黄浦区南京东路 100 号',
    phone: '021-6888-0001',
    openHours: '19:00 - 02:00',
  }, { prefix: 'ven' })

  // 门店 2
  const v2 = Store.create(Store.KEYS.venues, {
    name: 'Blue Note 霓虹店',
    address: '北京市朝阳区三里屯路 11 号',
    phone: '010-5888-0022',
    openHours: '20:00 - 04:00',
  }, { prefix: 'ven' })

  // 门店 1 桌台
  const tables1 = [
    { name: 'A1', type: 'round', capacity: 4, x: 40, y: 40, w: 60, h: 60, status: 'idle' },
    { name: 'A2', type: 'round', capacity: 4, x: 160, y: 40, w: 60, h: 60, status: 'idle' },
    { name: 'B1', type: 'square', capacity: 2, x: 40, y: 160, w: 70, h: 50, status: 'idle' },
    { name: 'B2', type: 'square', capacity: 2, x: 160, y: 160, w: 70, h: 50, status: 'idle' },
    { name: 'C1', type: 'booth', capacity: 6, x: 280, y: 40, w: 80, h: 70, status: 'idle' },
    { name: '吧台1', type: 'bar', capacity: 1, x: 40, y: 280, w: 30, h: 30, status: 'idle' },
    { name: '吧台2', type: 'bar', capacity: 1, x: 100, y: 280, w: 30, h: 30, status: 'idle' },
    { name: '吧台3', type: 'bar', capacity: 1, x: 160, y: 280, w: 30, h: 30, status: 'idle' },
  ]
  tables1.forEach(t => Store.create(Store.KEYS.tables, Object.assign({ venueId: v1.id }, t), { prefix: 'tbl' }))

  // 门店 1 菜单
  const menu1 = [
    { name: '青岛啤酒', category: '酒水', price: 25, stock: 100, available: true },
    { name: '科罗娜', category: '酒水', price: 45, stock: 60, available: true },
    { name: '莫吉托', category: '鸡尾酒', price: 68, stock: 30, available: true },
    { name: '长岛冰茶', category: '鸡尾酒', price: 78, stock: 30, available: true },
    { name: '威士忌', category: '烈酒', price: 98, stock: 40, available: true },
    { name: '炸鸡翅', category: '小食', price: 38, stock: 50, available: true },
    { name: '薯条', category: '小食', price: 28, stock: 50, available: true },
    { name: '坚果拼盘', category: '小食', price: 35, stock: 40, available: true },
    { name: '果盘', category: '小食', price: 58, stock: 20, available: true },
    { name: '双人套餐', category: '套餐', price: 199, stock: 10, available: true },
  ]
  menu1.forEach(m => Store.create(Store.KEYS.menu, Object.assign({ venueId: v1.id }, m), { prefix: 'menu' }))

  // 门店 2 桌台
  const tables2 = [
    { name: '1号桌', type: 'round', capacity: 4, x: 60, y: 80, w: 60, h: 60, status: 'idle' },
    { name: '2号桌', type: 'round', capacity: 4, x: 200, y: 80, w: 60, h: 60, status: 'idle' },
    { name: 'VIP1', type: 'booth', capacity: 8, x: 320, y: 80, w: 90, h: 80, status: 'idle' },
  ]
  tables2.forEach(t => Store.create(Store.KEYS.tables, Object.assign({ venueId: v2.id }, t), { prefix: 'tbl' }))

  // 门店 2 菜单
  const menu2 = [
    { name: '喜力', category: '酒水', price: 35, stock: 80, available: true },
    { name: '马提尼', category: '鸡尾酒', price: 88, stock: 20, available: true },
    { name: '芝士拼盘', category: '小食', price: 48, stock: 30, available: true },
  ]
  menu2.forEach(m => Store.create(Store.KEYS.menu, Object.assign({ venueId: v2.id }, m), { prefix: 'menu' }))

  // 设置默认当前门店
  Store.setCurrentVenueId(v1.id)
}

module.exports = { inject }
