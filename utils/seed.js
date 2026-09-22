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

  // 门店 3
  const v3 = Store.create(Store.KEYS.venues, {
    name: 'Mist 雾隐酒廊',
    address: '广州市天河区珠江新城花城大道 85 号',
    phone: '020-3888-0033',
    openHours: '18:00 - 03:00',
  }, { prefix: 'ven' })

  // 门店 4
  const v4 = Store.create(Store.KEYS.venues, {
    name: 'Skyline 天际酒吧',
    address: '深圳市南山区后海大道 2001 号 58 楼',
    phone: '0755-8288-0044',
    openHours: '17:00 - 02:00',
  }, { prefix: 'ven' })

  // 门店 5
  const v5 = Store.create(Store.KEYS.venues, {
    name: 'Jazz Corner 爵士角落',
    address: '成都市锦江区春熙路步行街 66 号',
    phone: '028-6688-0055',
    openHours: '19:00 - 01:00',
  }, { prefix: 'ven' })

  // 门店 3 桌台
  const tables3 = [
    { name: 'T1', type: 'round', capacity: 4, x: 40, y: 40, w: 60, h: 60, status: 'idle' },
    { name: 'T2', type: 'round', capacity: 4, x: 160, y: 40, w: 60, h: 60, status: 'idle' },
    { name: 'T3', type: 'round', capacity: 4, x: 280, y: 40, w: 60, h: 60, status: 'idle' },
    { name: 'V1', type: 'booth', capacity: 6, x: 40, y: 160, w: 90, h: 70, status: 'idle' },
    { name: 'V2', type: 'booth', capacity: 6, x: 180, y: 160, w: 90, h: 70, status: 'idle' },
    { name: 'S1', type: 'square', capacity: 2, x: 320, y: 160, w: 70, h: 50, status: 'idle' },
    { name: '吧台1', type: 'bar', capacity: 1, x: 40, y: 280, w: 30, h: 30, status: 'idle' },
    { name: '吧台2', type: 'bar', capacity: 1, x: 100, y: 280, w: 30, h: 30, status: 'idle' },
    { name: '吧台3', type: 'bar', capacity: 1, x: 160, y: 280, w: 30, h: 30, status: 'idle' },
    { name: '吧台4', type: 'bar', capacity: 1, x: 220, y: 280, w: 30, h: 30, status: 'idle' },
  ]
  tables3.forEach(t => Store.create(Store.KEYS.tables, Object.assign({ venueId: v3.id }, t), { prefix: 'tbl' }))

  // 门店 3 菜单
  const menu3 = [
    { name: '1664 白啤', category: '酒水', price: 30, stock: 80, available: true },
    { name: '福佳白', category: '酒水', price: 32, stock: 70, available: true },
    { name: '新加坡司令', category: '鸡尾酒', price: 75, stock: 25, available: true },
    { name: '血腥玛丽', category: '鸡尾酒', price: 72, stock: 25, available: true },
    { name: '伏特加', category: '烈酒', price: 88, stock: 35, available: true },
    { name: '烤肉拼盘', category: '小食', price: 68, stock: 30, available: true },
    { name: '蒜蓉虾', category: '小食', price: 58, stock: 25, available: true },
    { name: '凉拌毛豆', category: '小食', price: 18, stock: 60, available: true },
    { name: '芒果布丁', category: '甜点', price: 22, stock: 20, available: true },
    { name: '闺蜜套餐', category: '套餐', price: 258, stock: 8, available: true },
  ]
  menu3.forEach(m => Store.create(Store.KEYS.menu, Object.assign({ venueId: v3.id }, m), { prefix: 'menu' }))

  // 门店 4 桌台
  const tables4 = [
    { name: 'M1', type: 'booth', capacity: 8, x: 40, y: 40, w: 100, h: 80, status: 'idle' },
    { name: 'M2', type: 'booth', capacity: 8, x: 180, y: 40, w: 100, h: 80, status: 'idle' },
    { name: 'M3', type: 'booth', capacity: 6, x: 320, y: 40, w: 90, h: 70, status: 'idle' },
    { name: 'R1', type: 'round', capacity: 4, x: 40, y: 160, w: 60, h: 60, status: 'idle' },
    { name: 'R2', type: 'round', capacity: 4, x: 140, y: 160, w: 60, h: 60, status: 'idle' },
    { name: 'B1', type: 'bar', capacity: 1, x: 40, y: 260, w: 30, h: 30, status: 'idle' },
    { name: 'B2', type: 'bar', capacity: 1, x: 90, y: 260, w: 30, h: 30, status: 'idle' },
    { name: 'B3', type: 'bar', capacity: 1, x: 140, y: 260, w: 30, h: 30, status: 'idle' },
    { name: 'B4', type: 'bar', capacity: 1, x: 190, y: 260, w: 30, h: 30, status: 'idle' },
    { name: 'B5', type: 'bar', capacity: 1, x: 240, y: 260, w: 30, h: 30, status: 'idle' },
  ]
  tables4.forEach(t => Store.create(Store.KEYS.tables, Object.assign({ venueId: v4.id }, t), { prefix: 'tbl' }))

  // 门店 4 菜单
  const menu4 = [
    { name: '虎牌啤酒', category: '酒水', price: 28, stock: 90, available: true },
    { name: '百威', category: '酒水', price: 30, stock: 85, available: true },
    { name: '金汤力', category: '鸡尾酒', price: 65, stock: 30, available: true },
    { name: '尼格罗尼', category: '鸡尾酒', price: 80, stock: 20, available: true },
    { name: '麦卡伦 12 年', category: '烈酒', price: 168, stock: 15, available: true },
    { name: '黑松露薯条', category: '小食', price: 42, stock: 30, available: true },
    { name: '炸鱼条', category: '小食', price: 38, stock: 35, available: true },
    { name: '奶酪拼盘', category: '小食', price: 55, stock: 20, available: true },
    { name: '提拉米苏', category: '甜点', price: 35, stock: 15, available: true },
    { name: '商务套餐', category: '套餐', price: 388, stock: 5, available: true },
  ]
  menu4.forEach(m => Store.create(Store.KEYS.menu, Object.assign({ venueId: v4.id }, m), { prefix: 'menu' }))

  // 门店 5 桌台
  const tables5 = [
    { name: 'J1', type: 'round', capacity: 4, x: 60, y: 60, w: 60, h: 60, status: 'idle' },
    { name: 'J2', type: 'round', capacity: 4, x: 180, y: 60, w: 60, h: 60, status: 'idle' },
    { name: 'J3', type: 'square', capacity: 2, x: 60, y: 160, w: 70, h: 50, status: 'idle' },
    { name: 'J4', type: 'square', capacity: 2, x: 180, y: 160, w: 70, h: 50, status: 'idle' },
    { name: 'VIP-J', type: 'booth', capacity: 10, x: 300, y: 60, w: 100, h: 80, status: 'idle' },
  ]
  tables5.forEach(t => Store.create(Store.KEYS.tables, Object.assign({ venueId: v5.id }, t), { prefix: 'tbl' }))

  // 门店 5 菜单
  const menu5 = [
    { name: '嘉士伯', category: '酒水', price: 28, stock: 75, available: true },
    { name: '蓝带', category: '酒水', price: 35, stock: 50, available: true },
    { name: '老式鸡尾酒', category: '鸡尾酒', price: 70, stock: 25, available: true },
    { name: '曼哈顿', category: '鸡尾酒', price: 75, stock: 20, available: true },
    { name: '杰克丹尼', category: '烈酒', price: 95, stock: 30, available: true },
    { name: '麻辣鸭脖', category: '小食', price: 25, stock: 50, available: true },
    { name: '花生米', category: '小食', price: 15, stock: 80, available: true },
    { name: '牛肉干', category: '小食', price: 32, stock: 40, available: true },
    { name: '焦糖布丁', category: '甜点', price: 28, stock: 15, available: true },
    { name: '情侣套餐', category: '套餐', price: 299, stock: 6, available: true },
  ]
  menu5.forEach(m => Store.create(Store.KEYS.menu, Object.assign({ venueId: v5.id }, m), { prefix: 'menu' }))

  // 设置默认当前门店
  Store.setCurrentVenueId(v1.id)
}

module.exports = { inject }
