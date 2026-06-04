// Data layer — localStorage-based with shop isolation
// Each key is prefixed with shop_id so shops never share data
// Structure mirrors future Supabase schema for easy migration

const PREFIX = 'rcm_'

function key(shopId, table) {
  return `${PREFIX}${shopId}_${table}`
}

function getAll(shopId, table) {
  try {
    return JSON.parse(localStorage.getItem(key(shopId, table)) || '[]')
  } catch {
    return []
  }
}

function saveAll(shopId, table, data) {
  localStorage.setItem(key(shopId, table), JSON.stringify(data))
}

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

// ─── Shops ────────────────────────────────────────────────────────────────────

export const shopDb = {
  getAll() {
    try {
      return JSON.parse(localStorage.getItem(`${PREFIX}shops`) || '[]')
    } catch {
      return []
    }
  },

  save(shops) {
    localStorage.setItem(`${PREFIX}shops`, JSON.stringify(shops))
  },

  add(name, emoji = '🍕') {
    const shops = shopDb.getAll()
    const shop = { id: genId(), name, emoji, createdAt: new Date().toISOString() }
    shops.push(shop)
    shopDb.save(shops)
    return shop
  },

  update(id, data) {
    const shops = shopDb.getAll().map(s => s.id === id ? { ...s, ...data } : s)
    shopDb.save(shops)
  },

  delete(id) {
    shopDb.save(shopDb.getAll().filter(s => s.id !== id))
  }
}

// ─── Sales Channels ───────────────────────────────────────────────────────────
// แต่ละช่องทางมี GP% และค่า Ads default ของตัวเอง
// gpPercent: % ที่แพลตฟอร์มหักจากยอดขาย
// adsDefault: ค่าโฆษณาต่อออเดอร์ (บาท) — แตะเปิด/ปิดได้ตอนเปิดออเดอร์

const DEFAULT_CHANNELS = [
  { name: 'หน้าร้าน', gpPercent: 0, adsDefault: 0, isDefault: false },
  { name: 'LINE MAN', gpPercent: 30, adsDefault: 20, isDefault: true },
]

export const channelDb = {
  getAll(shopId) {
    let items = getAll(shopId, 'channels')
    if (items.length === 0) {
      // seed default channels on first access
      items = DEFAULT_CHANNELS.map(c => ({ id: genId(), shopId, ...c, createdAt: new Date().toISOString() }))
      saveAll(shopId, 'channels', items)
    }
    return items
  },

  add(shopId, data) {
    const items = channelDb.getAll(shopId)
    const item = {
      id: genId(),
      shopId,
      name: data.name,
      gpPercent: Number(data.gpPercent || 0),
      adsDefault: Number(data.adsDefault || 0),
      isDefault: false,
      createdAt: new Date().toISOString(),
    }
    items.push(item)
    saveAll(shopId, 'channels', items)
    return item
  },

  update(shopId, id, data) {
    const items = channelDb.getAll(shopId).map(c =>
      c.id === id ? {
        ...c,
        ...data,
        gpPercent: data.gpPercent !== undefined ? Number(data.gpPercent) : c.gpPercent,
        adsDefault: data.adsDefault !== undefined ? Number(data.adsDefault) : c.adsDefault,
      } : c
    )
    saveAll(shopId, 'channels', items)
  },

  delete(shopId, id) {
    saveAll(shopId, 'channels', channelDb.getAll(shopId).filter(c => c.id !== id))
  }
}

// ─── Ingredients ──────────────────────────────────────────────────────────────
// unitType: 'gram' | 'piece' | 'fixed_cost'

export const ingredientDb = {
  getAll(shopId) {
    return getAll(shopId, 'ingredients')
  },

  add(shopId, data) {
    const items = ingredientDb.getAll(shopId)
    const item = {
      id: genId(),
      shopId,
      name: data.name,
      category: data.category || '',
      unitType: data.unitType || 'gram',
      purchaseQty: Number(data.purchaseQty),
      purchasePrice: Number(data.purchasePrice),
      costPerUnit: Number(data.purchasePrice) / Number(data.purchaseQty),
      stock: Number(data.stock ?? data.purchaseQty),
      lowStockThreshold: Number(data.lowStockThreshold || 0),
      note: data.note || '',
      purchaseDate: data.purchaseDate || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    items.push(item)
    saveAll(shopId, 'ingredients', items)
    return item
  },

  update(shopId, id, data) {
    const items = ingredientDb.getAll(shopId).map(item => {
      if (item.id !== id) return item
      const updated = { ...item, ...data, updatedAt: new Date().toISOString() }
      if (data.purchaseQty || data.purchasePrice) {
        updated.costPerUnit = Number(updated.purchasePrice) / Number(updated.purchaseQty)
      }
      return updated
    })
    saveAll(shopId, 'ingredients', items)
  },

  delete(shopId, id) {
    saveAll(shopId, 'ingredients', ingredientDb.getAll(shopId).filter(i => i.id !== id))
  },

  deductStock(shopId, usages) {
    // usages: [{ ingredientId, qty }] — qty รวมจากทั้งออเดอร์แล้ว
    const items = ingredientDb.getAll(shopId).map(item => {
      const usage = usages.find(u => u.ingredientId === item.id)
      if (!usage) return item
      return { ...item, stock: Math.max(0, item.stock - usage.qty), updatedAt: new Date().toISOString() }
    })
    saveAll(shopId, 'ingredients', items)
  },

  getLowStock(shopId) {
    return ingredientDb.getAll(shopId).filter(i =>
      i.lowStockThreshold > 0 && i.stock <= i.lowStockThreshold
    )
  }
}

// ─── Menus ────────────────────────────────────────────────────────────────────
// latestRecipe: [{ ingredientId, qty, unitType }] — สูตรที่ฟิกไว้

export const menuDb = {
  getAll(shopId) {
    return getAll(shopId, 'menus')
  },

  add(shopId, data) {
    const items = menuDb.getAll(shopId)
    const item = {
      id: genId(),
      shopId,
      name: data.name,
      size: data.size || '',
      sellingPrice: Number(data.sellingPrice),
      latestRecipe: data.latestRecipe || [],
      note: data.note || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    items.push(item)
    saveAll(shopId, 'menus', items)
    return item
  },

  update(shopId, id, data) {
    const items = menuDb.getAll(shopId).map(item =>
      item.id === id ? { ...item, ...data, updatedAt: new Date().toISOString() } : item
    )
    saveAll(shopId, 'menus', items)
  },

  delete(shopId, id) {
    saveAll(shopId, 'menus', menuDb.getAll(shopId).filter(m => m.id !== id))
  },

  // คำนวณต้นทุนวัตถุดิบของ 1 เมนูจากสูตร + ราคาวัตถุดิบปัจจุบัน
  calcCost(shopId, recipe) {
    const ingredients = ingredientDb.getAll(shopId)
    return (recipe || []).reduce((sum, r) => {
      const ing = ingredients.find(i => i.id === r.ingredientId)
      return sum + (ing ? ing.costPerUnit * Number(r.qty) : 0)
    }, 0)
  }
}

// ─── Orders ───────────────────────────────────────────────────────────────────
// 1 ออเดอร์ = หลายเมนู + ช่องทาง + GP/Ads/คูปอง
// Snapshot ต้นทุน ณ เวลาขาย — ราคาวัตถุดิบเปลี่ยนภายหลัง ออเดอร์เก่าไม่เปลี่ยน
//
// item: {
//   menuId, menuName, sellingPrice, qty,
//   ingredients: [{ ingredientId, name, qty, unitType, costPerUnit, subtotal }],  // ต่อ 1 ชิ้น
//   unitCost,      // ต้นทุนวัตถุดิบต่อ 1 ชิ้น
//   lineCost,      // unitCost × qty
//   lineRevenue,   // sellingPrice × qty
// }

export const orderDb = {
  getAll(shopId) {
    return getAll(shopId, 'orders')
  },

  add(shopId, { channelName, gpPercent, gpEnabled, adsFee, couponDiscount, items }) {
    const orders = orderDb.getAll(shopId)

    const subtotal = items.reduce((s, it) => s + it.lineRevenue, 0)
    const totalCost = items.reduce((s, it) => s + it.lineCost, 0)
    const gpAmount = gpEnabled ? subtotal * (Number(gpPercent) / 100) : 0
    const ads = Number(adsFee) || 0
    const coupon = Number(couponDiscount) || 0
    const netReceived = subtotal - gpAmount - ads - coupon
    const netProfit = netReceived - totalCost

    const order = {
      id: genId(),
      shopId,
      channelName,
      gpPercent: Number(gpPercent),
      gpEnabled: !!gpEnabled,
      gpAmount,
      adsFee: ads,
      couponDiscount: coupon,
      items,
      subtotal,
      totalCost,
      netReceived,
      netProfit,
      itemCount: items.reduce((s, it) => s + it.qty, 0),
      createdAt: new Date().toISOString(),
    }
    orders.push(order)
    saveAll(shopId, 'orders', orders)

    // หักสต็อก — รวม usage ของทุกเมนู × จำนวน
    const usageMap = {}
    items.forEach(it => {
      it.ingredients.forEach(ing => {
        usageMap[ing.ingredientId] = (usageMap[ing.ingredientId] || 0) + ing.qty * it.qty
      })
    })
    const usages = Object.entries(usageMap).map(([ingredientId, qty]) => ({ ingredientId, qty }))
    ingredientDb.deductStock(shopId, usages)

    return order
  },

  getByDate(shopId, dateStr) {
    return orderDb.getAll(shopId).filter(o => o.createdAt.startsWith(dateStr))
  },

  getTodaySummary(shopId) {
    const today = new Date().toISOString().slice(0, 10)
    const orders = orderDb.getByDate(shopId, today)
    return {
      orderCount: orders.length,
      itemCount: orders.reduce((s, o) => s + o.itemCount, 0),
      subtotal: orders.reduce((s, o) => s + o.subtotal, 0),
      totalFees: orders.reduce((s, o) => s + o.gpAmount + o.adsFee + o.couponDiscount, 0),
      totalCost: orders.reduce((s, o) => s + o.totalCost, 0),
      netReceived: orders.reduce((s, o) => s + o.netReceived, 0),
      netProfit: orders.reduce((s, o) => s + o.netProfit, 0),
    }
  }
}
