// Data layer — Supabase
// ทุก function เป็น async คืน Promise

import { supabase } from './supabase'

// ── Shops ──────────────────────────────────────────────────────────────────

export const shopDb = {
  async getAll() {
    const { data, error } = await supabase.from('shops').select('*').order('created_at')
    if (error) throw error
    return data || []
  },

  async add(name, emoji = '🍕') {
    const { data, error } = await supabase.from('shops').insert({ name, emoji }).select().single()
    if (error) throw error
    return data
  },

  async update(id, updates) {
    const { error } = await supabase.from('shops').update(updates).eq('id', id)
    if (error) throw error
  },

  async delete(id) {
    const { error } = await supabase.from('shops').delete().eq('id', id)
    if (error) throw error
  }
}

// ── Channels ───────────────────────────────────────────────────────────────

const DEFAULT_CHANNELS = [
  { name: 'หน้าร้าน', gp_percent: 0, ads_default: 0, is_default: false },
  { name: 'LINE MAN', gp_percent: 30, ads_default: 20, is_default: true },
]

export const channelDb = {
  async getAll(shopId) {
    const { data, error } = await supabase.from('channels').select('*').eq('shop_id', shopId).order('created_at')
    if (error) throw error

    if (!data || data.length === 0) {
      // seed defaults
      const inserts = DEFAULT_CHANNELS.map(c => ({ ...c, shop_id: shopId }))
      const { data: seeded, error: e2 } = await supabase.from('channels').insert(inserts).select()
      if (e2) throw e2
      return seeded || []
    }
    return data.map(mapChannel)
  },

  async add(shopId, data) {
    const { data: row, error } = await supabase.from('channels').insert({
      shop_id: shopId,
      name: data.name,
      gp_percent: Number(data.gpPercent || 0),
      ads_default: Number(data.adsDefault || 0),
      is_default: false,
    }).select().single()
    if (error) throw error
    return mapChannel(row)
  },

  async update(shopId, id, data) {
    const updates = {}
    if (data.name !== undefined) updates.name = data.name
    if (data.gpPercent !== undefined) updates.gp_percent = Number(data.gpPercent)
    if (data.adsDefault !== undefined) updates.ads_default = Number(data.adsDefault)
    const { error } = await supabase.from('channels').update(updates).eq('id', id).eq('shop_id', shopId)
    if (error) throw error
  },

  async delete(shopId, id) {
    const { error } = await supabase.from('channels').delete().eq('id', id).eq('shop_id', shopId)
    if (error) throw error
  }
}

function mapChannel(c) {
  return {
    id: c.id,
    shopId: c.shop_id,
    name: c.name,
    gpPercent: c.gp_percent,
    adsDefault: c.ads_default,
    isDefault: c.is_default,
    createdAt: c.created_at,
  }
}

// ── Ingredients ────────────────────────────────────────────────────────────

export const ingredientDb = {
  async getAll(shopId) {
    const { data, error } = await supabase.from('ingredients').select('*').eq('shop_id', shopId).order('created_at')
    if (error) throw error
    return (data || []).map(mapIngredient)
  },

  async add(shopId, data) {
    const costPerUnit = Number(data.purchasePrice) / Number(data.purchaseQty)
    const { data: row, error } = await supabase.from('ingredients').insert({
      shop_id: shopId,
      name: data.name,
      category: data.category || '',
      unit_type: data.unitType || 'gram',
      purchase_qty: Number(data.purchaseQty),
      purchase_price: Number(data.purchasePrice),
      cost_per_unit: costPerUnit,
      stock: Number(data.stock ?? data.purchaseQty),
      low_stock_threshold: Number(data.lowStockThreshold || 0),
      note: data.note || '',
      purchase_date: data.purchaseDate || null,
    }).select().single()
    if (error) throw error
    return mapIngredient(row)
  },

  async update(shopId, id, data) {
    const updates = {}
    if (data.name !== undefined) updates.name = data.name
    if (data.category !== undefined) updates.category = data.category
    if (data.unitType !== undefined) updates.unit_type = data.unitType
    if (data.purchaseQty !== undefined) updates.purchase_qty = Number(data.purchaseQty)
    if (data.purchasePrice !== undefined) updates.purchase_price = Number(data.purchasePrice)
    if (data.purchaseQty !== undefined || data.purchasePrice !== undefined) {
      const qty = data.purchaseQty || data._purchaseQty
      const price = data.purchasePrice || data._purchasePrice
      if (qty && price) updates.cost_per_unit = Number(price) / Number(qty)
    }
    if (data.stock !== undefined) updates.stock = Number(data.stock)
    if (data.lowStockThreshold !== undefined) updates.low_stock_threshold = Number(data.lowStockThreshold)
    if (data.note !== undefined) updates.note = data.note
    if (data.purchaseDate !== undefined) updates.purchase_date = data.purchaseDate || null
    updates.updated_at = new Date().toISOString()
    const { error } = await supabase.from('ingredients').update(updates).eq('id', id).eq('shop_id', shopId)
    if (error) throw error
  },

  async delete(shopId, id) {
    const { error } = await supabase.from('ingredients').delete().eq('id', id).eq('shop_id', shopId)
    if (error) throw error
  },

  async deductStock(shopId, usages) {
    // usages: [{ ingredientId, qty }]
    const all = await ingredientDb.getAll(shopId)
    for (const usage of usages) {
      const ing = all.find(i => i.id === usage.ingredientId)
      if (!ing) continue
      const newStock = Math.max(0, ing.stock - usage.qty)
      await supabase.from('ingredients').update({ stock: newStock, updated_at: new Date().toISOString() })
        .eq('id', usage.ingredientId).eq('shop_id', shopId)
    }
  },

  async getLowStock(shopId) {
    const { data, error } = await supabase.from('ingredients')
      .select('*').eq('shop_id', shopId)
      .gt('low_stock_threshold', 0)
    if (error) throw error
    return (data || []).map(mapIngredient).filter(i => i.stock <= i.lowStockThreshold)
  }
}

function mapIngredient(r) {
  return {
    id: r.id,
    shopId: r.shop_id,
    name: r.name,
    category: r.category,
    unitType: r.unit_type,
    purchaseQty: r.purchase_qty,
    purchasePrice: r.purchase_price,
    costPerUnit: r.cost_per_unit,
    stock: r.stock,
    lowStockThreshold: r.low_stock_threshold,
    note: r.note,
    purchaseDate: r.purchase_date,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

// ── Menus ──────────────────────────────────────────────────────────────────

export const menuDb = {
  async getAll(shopId) {
    const { data, error } = await supabase.from('menus').select('*').eq('shop_id', shopId).order('created_at')
    if (error) throw error
    return (data || []).map(mapMenu)
  },

  async add(shopId, data) {
    const { data: row, error } = await supabase.from('menus').insert({
      shop_id: shopId,
      name: data.name,
      size: data.size || '',
      selling_price: Number(data.sellingPrice),
      latest_recipe: data.latestRecipe || [],
      note: data.note || '',
    }).select().single()
    if (error) throw error
    return mapMenu(row)
  },

  async update(shopId, id, data) {
    const updates = {}
    if (data.name !== undefined) updates.name = data.name
    if (data.size !== undefined) updates.size = data.size
    if (data.sellingPrice !== undefined) updates.selling_price = Number(data.sellingPrice)
    if (data.latestRecipe !== undefined) updates.latest_recipe = data.latestRecipe
    if (data.note !== undefined) updates.note = data.note
    updates.updated_at = new Date().toISOString()
    const { error } = await supabase.from('menus').update(updates).eq('id', id).eq('shop_id', shopId)
    if (error) throw error
  },

  async delete(shopId, id) {
    const { error } = await supabase.from('menus').delete().eq('id', id).eq('shop_id', shopId)
    if (error) throw error
  },

  async updateRecipe(shopId, menuId, recipe) {
    await menuDb.update(shopId, menuId, { latestRecipe: recipe })
  }
}

function mapMenu(r) {
  return {
    id: r.id,
    shopId: r.shop_id,
    name: r.name,
    size: r.size,
    sellingPrice: r.selling_price,
    latestRecipe: r.latest_recipe || [],
    note: r.note,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

// ── Orders ─────────────────────────────────────────────────────────────────

export const orderDb = {
  async getAll(shopId) {
    const { data, error } = await supabase.from('orders').select('*').eq('shop_id', shopId).order('created_at', { ascending: false })
    if (error) throw error
    return (data || []).map(mapOrder)
  },

  async add(shopId, { channelName, gpPercent, gpEnabled, adsFee, couponDiscount, items }) {
    const subtotal = items.reduce((s, it) => s + it.lineRevenue, 0)
    const totalCost = items.reduce((s, it) => s + it.lineCost, 0)
    const gpAmount = gpEnabled ? subtotal * (Number(gpPercent) / 100) : 0
    const ads = Number(adsFee) || 0
    const coupon = Number(couponDiscount) || 0
    const netReceived = subtotal - gpAmount - ads - coupon
    const netProfit = netReceived - totalCost
    const itemCount = items.reduce((s, it) => s + it.qty, 0)

    const { data: row, error } = await supabase.from('orders').insert({
      shop_id: shopId,
      channel_name: channelName,
      gp_percent: Number(gpPercent),
      gp_enabled: !!gpEnabled,
      gp_amount: gpAmount,
      ads_fee: ads,
      coupon_discount: coupon,
      items,
      subtotal,
      total_cost: totalCost,
      net_received: netReceived,
      net_profit: netProfit,
      item_count: itemCount,
    }).select().single()
    if (error) throw error

    // หักสต็อก
    const usageMap = {}
    items.forEach(it => {
      it.ingredients.forEach(ing => {
        usageMap[ing.ingredientId] = (usageMap[ing.ingredientId] || 0) + ing.qty * it.qty
      })
    })
    const usages = Object.entries(usageMap).map(([ingredientId, qty]) => ({ ingredientId, qty }))
    await ingredientDb.deductStock(shopId, usages)

    return mapOrder(row)
  },

  async getByDate(shopId, dateStr) {
    const start = `${dateStr}T00:00:00.000Z`
    const end = `${dateStr}T23:59:59.999Z`
    const { data, error } = await supabase.from('orders').select('*')
      .eq('shop_id', shopId)
      .gte('created_at', start)
      .lte('created_at', end)
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data || []).map(mapOrder)
  },

  async getTodaySummary(shopId) {
    // ใช้เวลาไทย UTC+7
    const now = new Date()
    const thai = new Date(now.getTime() + 7 * 60 * 60 * 1000)
    const dateStr = thai.toISOString().slice(0, 10)
    const start = new Date(`${dateStr}T00:00:00+07:00`).toISOString()
    const end = new Date(`${dateStr}T23:59:59+07:00`).toISOString()

    const { data, error } = await supabase.from('orders').select('*')
      .eq('shop_id', shopId)
      .gte('created_at', start)
      .lte('created_at', end)
    if (error) throw error

    const orders = data || []
    return {
      orderCount: orders.length,
      itemCount: orders.reduce((s, o) => s + (o.item_count || 0), 0),
      subtotal: orders.reduce((s, o) => s + (o.subtotal || 0), 0),
      totalFees: orders.reduce((s, o) => s + (o.gp_amount || 0) + (o.ads_fee || 0) + (o.coupon_discount || 0), 0),
      totalCost: orders.reduce((s, o) => s + (o.total_cost || 0), 0),
      netReceived: orders.reduce((s, o) => s + (o.net_received || 0), 0),
      netProfit: orders.reduce((s, o) => s + (o.net_profit || 0), 0),
    }
  }
}

function mapOrder(r) {
  return {
    id: r.id,
    shopId: r.shop_id,
    channelName: r.channel_name,
    gpPercent: r.gp_percent,
    gpEnabled: r.gp_enabled,
    gpAmount: r.gp_amount,
    adsFee: r.ads_fee,
    couponDiscount: r.coupon_discount,
    items: r.items || [],
    subtotal: r.subtotal,
    totalCost: r.total_cost,
    netReceived: r.net_received,
    netProfit: r.net_profit,
    itemCount: r.item_count,
    createdAt: r.created_at,
  }
}
